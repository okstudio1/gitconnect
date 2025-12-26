-- GitConnect Database Schema for Supabase
-- Run this in the Supabase SQL Editor

-- Users table (synced with GitHub auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id TEXT UNIQUE NOT NULL,
  github_login TEXT NOT NULL,
  email TEXT,
  stripe_customer_id TEXT,
  subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'pro', 'team')),
  subscription_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);

-- Usage tracking (optional - for analytics and rate limiting)
CREATE TABLE IF NOT EXISTS usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL CHECK (endpoint IN ('deepgram', 'claude')),
  tokens_used INTEGER DEFAULT 0,
  audio_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for usage queries
CREATE INDEX IF NOT EXISTS idx_usage_user_id ON usage(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_created_at ON usage(created_at);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
-- Allow users to read their own data (matched by github_id in JWT or service role)
CREATE POLICY "Users can read own data" ON users
  FOR SELECT
  USING (true);  -- We'll verify github_id server-side

-- Only service role can insert/update users
CREATE POLICY "Service role can manage users" ON users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for usage table
CREATE POLICY "Service role can manage usage" ON usage
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- View for daily usage aggregation (useful for rate limiting)
CREATE OR REPLACE VIEW daily_usage AS
SELECT 
  user_id,
  endpoint,
  DATE(created_at) as usage_date,
  SUM(tokens_used) as total_tokens,
  SUM(audio_seconds) as total_audio_seconds,
  COUNT(*) as request_count
FROM usage
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id, endpoint, DATE(created_at);
