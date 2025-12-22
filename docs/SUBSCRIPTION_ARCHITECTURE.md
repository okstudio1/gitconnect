# Subscription Architecture

This document outlines the architecture for GitConnect's subscription-based model with API proxying.

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              USER FLOW                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   User signs up → Pays via Stripe → Gets subscriber status              │
│                         ↓                                                │
│   User uses GitConnect → Requests go through your proxy                 │
│                         ↓                                                │
│   Your proxy → Calls Deepgram/Anthropic with YOUR API keys              │
│                         ↓                                                │
│   You get billed by Deepgram/Anthropic                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Business Model

### Revenue

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | User provides own API keys |
| **Pro** | $9.99/month | Managed API keys, priority support |
| **Team** | $29.99/month | Multiple users, shared repos, analytics |

### Costs (Estimates)

| Service | Cost | Estimate per User |
|---------|------|-------------------|
| Deepgram | $0.0043/min audio | ~$2-5/month (30-60 min/day) |
| Anthropic | $0.003/1K input, $0.015/1K output | ~$1-3/month |
| **Total** | | ~$3-8/month per active user |

### Margin

- Pro tier: $9.99 - $5 avg cost = **~$5 profit/user/month**
- Break-even: ~1.5 users covers your base costs

---

## Technical Architecture

### Components

```
┌────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                            │
│  - Check subscription status                                        │
│  - Route to proxy OR direct API based on status                     │
└─────────────────────────────────┬──────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
┌───────────────────────────┐   ┌───────────────────────────────────┐
│   FREE TIER (Direct)       │   │   PRO TIER (Proxy)                │
│                            │   │                                    │
│   User's browser           │   │   Netlify Functions               │
│       ↓                    │   │       ↓                            │
│   Deepgram API             │   │   /api/deepgram/transcribe        │
│   (user's key)             │   │       ↓                            │
│       ↓                    │   │   Deepgram API (YOUR key)         │
│   Anthropic API            │   │       ↓                            │
│   (user's key)             │   │   /api/claude/generate            │
│                            │   │       ↓                            │
│                            │   │   Anthropic API (YOUR key)        │
└───────────────────────────┘   └───────────────────────────────────┘
```

### Netlify Functions

| Endpoint | Purpose |
|----------|---------|
| `POST /api/deepgram/transcribe` | Proxy audio to Deepgram |
| `POST /api/claude/generate` | Proxy prompts to Claude |
| `POST /api/stripe/create-checkout` | Create Stripe checkout session |
| `POST /api/stripe/webhook` | Handle Stripe webhooks |
| `GET /api/subscription/status` | Check user's subscription status |

### Database (Required for Subscriptions)

You'll need a database to track:
- User subscriptions (who is a paying subscriber)
- Usage metrics (optional, for analytics/rate limiting)

**Options:**
1. **Supabase** (recommended) - Free tier, Postgres, easy auth
2. **PlanetScale** - MySQL, generous free tier
3. **Netlify Blobs** - Simple key-value, no SQL

---

## Implementation Plan

### Phase 1: Basic Proxy (No Auth)
1. Create Deepgram proxy function
2. Create Claude proxy function
3. Store YOUR API keys in Netlify env vars
4. Test proxying works

### Phase 2: Stripe Integration
1. Create Stripe account
2. Set up subscription product + price
3. Create checkout session endpoint
4. Create webhook handler for subscription events
5. Store subscription status (database needed)

### Phase 3: Subscription Gating
1. Add Supabase for user/subscription storage
2. Check subscription status before proxying
3. Return 402 Payment Required if not subscribed
4. Update frontend to handle subscription status

### Phase 4: Usage Tracking (Optional)
1. Log API calls per user
2. Add rate limiting (e.g., 100 requests/hour)
3. Add usage dashboard for users

---

## Supabase Setup

### 1. Create Project
- Go to https://supabase.com and sign in
- Click "New project"
- **Organization**: OKStudio
- **Project name**: `gitconnect.pro`
- **Database password**: Generate strong password
- **Region**: Americas (closest to users)
- **Security options**:
  - Data API + Connection String ✓
  - Use public schema ✓
  - Postgres (default) ✓

### 2. Get API Keys
- Go to **Project Settings** → **API**
- Copy these values:
  - **Project URL**: `https://ncoypwaaqigujoxidzon.supabase.co`
  - **anon public key** (safe for client-side)
  - **service_role key** (secret - server-side only)

### 3. Add to Netlify Environment Variables
- Go to Netlify → Site settings → Environment variables
- Add:
  - `SUPABASE_URL` = Your project URL
  - `SUPABASE_ANON_KEY` = The anon/public key
  - `SUPABASE_SERVICE_KEY` = The service_role key

### 4. Create Database Schema
- In Supabase, go to **SQL Editor** (left sidebar)
- Run the SQL schema provided below (see Database Schema section)

---

## Stripe Setup

### 1. Create Stripe Account
- Go to https://dashboard.stripe.com/register
- Complete business verification

### 2. Create Product
- Products → Add product
- Name: "GitConnect Pro"
- Price: $9.99/month (recurring)

### 3. Get API Keys
- Developers → API keys
- Copy: Publishable key, Secret key
- Add to Netlify env vars:
  - `STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_SECRET_KEY`

### 4. Set Up Webhook
- Developers → Webhooks → Add endpoint
- URL: `https://gitconnect.pro/api/stripe/webhook`
- Events: `checkout.session.completed`, `customer.subscription.deleted`
- Copy webhook signing secret → `STRIPE_WEBHOOK_SECRET`

---

## Environment Variables (Updated)

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_APP_CLIENT_ID` | Yes | GitHub App Client ID |
| `GITHUB_APP_CLIENT_SECRET` | Yes | GitHub App Client Secret |
| `SITE_URL` | Yes | `https://gitconnect.pro` |
| `DEEPGRAM_API_KEY` | Yes (Pro) | Your Deepgram API key |
| `ANTHROPIC_API_KEY` | Yes (Pro) | Your Anthropic API key |
| `STRIPE_SECRET_KEY` | Yes (Pro) | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | Yes (Pro) | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Yes (Pro) | Stripe webhook signing secret |
| `STRIPE_PRICE_ID` | Yes (Pro) | Stripe price ID for Pro tier |
| `SUPABASE_URL` | Yes (Pro) | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes (Pro) | Supabase anon key |
| `SUPABASE_SERVICE_KEY` | Yes (Pro) | Supabase service role key |

---

## Database Schema (Supabase)

```sql
-- Users table (synced with GitHub auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id TEXT UNIQUE NOT NULL,
  github_login TEXT NOT NULL,
  email TEXT,
  stripe_customer_id TEXT,
  subscription_status TEXT DEFAULT 'free', -- 'free', 'pro', 'team'
  subscription_ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Usage tracking (optional)
CREATE TABLE usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  endpoint TEXT NOT NULL, -- 'deepgram', 'claude'
  tokens_used INTEGER,
  audio_seconds INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Row level security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;
```

---

## Security Considerations

### API Key Protection
- YOUR Deepgram/Anthropic keys stored in Netlify env vars (never exposed)
- Proxy functions run server-side, keys never sent to browser

### Rate Limiting
- Implement per-user rate limits to prevent abuse
- Example: 100 Deepgram requests/hour, 50 Claude requests/hour
- Return 429 Too Many Requests if exceeded

### Subscription Verification
- Always verify subscription status server-side
- Don't trust client-side subscription claims
- Check Stripe subscription status on each request (or cache with TTL)

---

## Cost Control

### Preventing Abuse
1. **Rate limiting** - Cap requests per user per hour
2. **Token limits** - Max tokens per Claude request
3. **Audio limits** - Max audio duration per request
4. **Monthly caps** - Hard limit per user per month

### Monitoring
1. Set up Deepgram/Anthropic billing alerts
2. Monitor usage per user in Supabase
3. Alert if any user exceeds expected usage

---

## Next Steps

1. [x] Set up Supabase project (gitconnect.pro)
2. [x] Get Supabase API keys
3. [x] Add Supabase env vars to Netlify
4. [x] Create database schema in Supabase (SQL Editor)
5. [x] Create Stripe account and product
6. [ ] Get Stripe API keys and add to Netlify
7. [ ] Set up Stripe webhook
8. [ ] Implement proxy functions (Deepgram, Claude)
9. [ ] Implement Stripe checkout flow
10. [ ] Implement subscription status check
11. [ ] Update frontend with subscription UI
12. [ ] Test full flow end-to-end
