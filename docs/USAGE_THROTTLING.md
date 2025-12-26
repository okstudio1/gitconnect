# Usage Tracking & Throttling Architecture

This document explains how GitConnect tracks API usage and enforces limits for Pro subscribers.

---

## Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   GitConnect    │────▶│  Netlify Proxy   │────▶│  External APIs  │
│   Web App       │     │  Functions       │     │  (Deepgram,     │
│                 │     │                  │     │   Claude)       │
└─────────────────┘     └────────┬─────────┘     └─────────────────┘
                                 │
                                 │ Check quota &
                                 │ Log usage
                                 ▼
                        ┌──────────────────┐
                        │    Supabase      │
                        │   (PostgreSQL)   │
                        │                  │
                        │  - users table   │
                        │  - usage table   │
                        │  - daily_usage   │
                        └──────────────────┘
```

---

## How It Works

### 1. User Makes API Request
When a Pro user uses voice transcription or AI code generation:

```
User speaks → GitConnect app → Netlify proxy function
```

### 2. Proxy Function Checks Quota
Before forwarding to the external API, the proxy function:

1. **Authenticates** the user (via GitHub ID)
2. **Queries Supabase** to check current month's usage
3. **Compares** against the monthly quota
4. **Allows or blocks** the request

```typescript
// Example: deepgram-proxy.ts
const { data: monthlyUsage } = await supabase
  .from('usage')
  .select('audio_seconds')
  .eq('user_id', userId)
  .gte('created_at', startOfCurrentMonth)

const totalSeconds = monthlyUsage?.reduce((sum, r) => sum + (r.audio_seconds || 0), 0) || 0

if (totalSeconds >= MONTHLY_AUDIO_LIMIT) {
  return { statusCode: 429, body: 'Monthly quota exceeded' }
}
```

### 3. Request Forwarded to External API
If quota is available, the proxy:
- Calls Deepgram or Claude with the **managed API key** (user never sees this key)
- Receives the response

### 4. Usage Logged to Supabase
After successful API call, the proxy logs the usage:

```typescript
await supabase.from('usage').insert({
  user_id: userId,
  endpoint: 'deepgram',
  audio_seconds: audioLengthInSeconds,
  tokens_used: 0,
  created_at: new Date().toISOString()
})
```

### 5. Response Returned to User
The transcription or AI response is sent back to the GitConnect app.

---

## Database Tables

### `users` Table
Stores user info and subscription status:

| Column | Purpose |
|--------|---------|
| `github_id` | Links to GitHub authentication |
| `subscription_status` | `free`, `pro`, or `team` |
| `stripe_customer_id` | For billing management |

### `usage` Table
Logs every API call:

| Column | Purpose |
|--------|---------|
| `user_id` | Which user made the request |
| `endpoint` | `deepgram` or `claude` |
| `audio_seconds` | Seconds of audio transcribed |
| `tokens_used` | Claude tokens consumed |
| `created_at` | Timestamp for monthly aggregation |

### `daily_usage` View
Pre-aggregated daily stats for efficient rate limit checks:

```sql
SELECT user_id, endpoint, DATE(created_at),
       SUM(tokens_used), SUM(audio_seconds), COUNT(*)
FROM usage
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id, endpoint, DATE(created_at)
```

---

## Quota Limits (Configurable)

| Plan | Audio (Deepgram) | Tokens (Claude) |
|------|------------------|-----------------|
| Free | 0 (use own keys) | 0 (use own keys) |
| Pro | 10,000 sec/month (~2.7 hrs) | 1,000,000 tokens/month |

These limits are defined as constants in the proxy functions and can be adjusted.

---

## What Happens When Quota is Exceeded?

1. Proxy returns HTTP 429 (Too Many Requests)
2. Frontend shows friendly message: "Monthly quota reached. Resets on [date]."
3. User can still use GitConnect with their own API keys

---

## Security Notes

- **Users never see managed API keys** — they're stored as Netlify environment variables
- **All quota checks happen server-side** in Netlify functions
- **Supabase RLS (Row Level Security)** ensures users can only see their own usage data

---

## Files Involved

| File | Purpose |
|------|---------|
| `netlify/functions/deepgram-proxy.ts` | Proxies Deepgram, checks audio quota |
| `netlify/functions/claude-proxy.ts` | Proxies Claude, checks token quota |
| `docs/SUPABASE_SCHEMA.sql` | Database schema for users/usage |
| `web/src/hooks/useSubscription.ts` | Frontend subscription state |

---

## Testing the Flow

1. Sign in as a Pro user
2. Use voice transcription
3. Check Supabase → `usage` table — new row should appear
4. Query monthly totals:
   ```sql
   SELECT SUM(audio_seconds) as total_audio,
          SUM(tokens_used) as total_tokens
   FROM usage
   WHERE user_id = 'YOUR_USER_ID'
     AND created_at >= date_trunc('month', NOW())
   ```
