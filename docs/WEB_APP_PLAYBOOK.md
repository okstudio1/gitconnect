# Web App Playbook

A comprehensive guide for building SaaS web applications with subscriptions. Use this to onboard LLMs to quickly scaffold new projects.

---

## Tech Stack Overview

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React + Vite + TypeScript | Fast, type-safe UI |
| Styling | Tailwind CSS | Utility-first CSS |
| Icons | Lucide React | Clean icon library |
| Backend | Netlify Functions | Serverless API endpoints |
| Database | Supabase (PostgreSQL) | User data, usage tracking |
| Auth | GitHub OAuth / Device Flow | Developer-friendly authentication |
| Payments | Stripe | Subscriptions and billing |
| Hosting | Netlify | CI/CD, hosting, functions |

---

## Project Structure

```
project/
├── web/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility libraries (supabase client, etc.)
│   │   ├── App.tsx         # Main app component
│   │   ├── main.tsx        # Entry point
│   │   └── vite-env.d.ts   # TypeScript env declarations
│   ├── netlify/
│   │   └── functions/      # Serverless API functions
│   ├── public/             # Static assets
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── netlify.toml        # Netlify configuration
├── docs/                   # Documentation
└── README.md
```

---

## Step-by-Step Setup

### 1. Initialize Project

```bash
npm create vite@latest web -- --template react-ts
cd web
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install lucide-react @supabase/supabase-js stripe
npm install -D @netlify/functions @types/node
```

### 2. Configure Tailwind

**tailwind.config.js**:
```javascript
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

**src/index.css**:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 3. Configure Vite for Netlify

**vite.config.ts**:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist' }
})
```

**netlify.toml**:
```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 4. Set Up Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Run schema SQL (see below)
3. Get Project URL and Publishable Key from Settings → API

**Basic Schema**:
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id TEXT UNIQUE NOT NULL,
  github_login TEXT NOT NULL,
  email TEXT,
  stripe_customer_id TEXT,
  subscription_status TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read users" ON users FOR SELECT USING (true);
CREATE POLICY "Anyone can insert users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update users" ON users FOR UPDATE USING (true);
```

**Supabase Client** (`src/lib/supabase.ts`):
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null
```

### 5. Set Up Stripe

1. Create account at [stripe.com](https://stripe.com)
2. Create Product → Add Price (monthly subscription)
3. Copy Price ID (`price_...`)
4. Get API keys from Developers → API keys

**Stripe Checkout Function** (`netlify/functions/stripe.ts`):
```typescript
import type { Handler } from '@netlify/functions'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const PRICE_ID = process.env.STRIPE_PRICE_ID!
const SITE_URL = process.env.SITE_URL || 'https://yoursite.com'

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  const { github_id } = JSON.parse(event.body || '{}')

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: PRICE_ID, quantity: 1 }],
    success_url: `${SITE_URL}?subscription=success`,
    cancel_url: `${SITE_URL}?subscription=cancelled`,
    metadata: { github_id }
  })

  return {
    statusCode: 200,
    body: JSON.stringify({ url: session.url })
  }
}
```

### 6. Environment Variables

**For Netlify** (Site settings → Environment variables):

| Variable | Scope | Description |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | All | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | All | Supabase publishable/anon key |
| `SUPABASE_URL` | Functions | Same URL for server-side |
| `SUPABASE_SERVICE_KEY` | Functions | Service role key (secret) |
| `STRIPE_SECRET_KEY` | Functions | Stripe secret key |
| `STRIPE_PRICE_ID` | All | Price ID from Stripe |
| `STRIPE_WEBHOOK_SECRET` | Functions | Webhook signing secret |
| `SITE_URL` | All | Your production URL |

**Important Notes**:
- `VITE_` prefix = available in frontend (exposed to browser)
- No prefix = only available in Netlify Functions (server-side)
- Mark secrets as "Secret" in Netlify to mask them

### 7. Stripe Webhook Setup

1. Go to Stripe → Developers → Webhooks
2. Add endpoint: `https://yoursite.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy Signing Secret to `STRIPE_WEBHOOK_SECRET`

---

## Common Patterns

### Subscription Hook

```typescript
// src/hooks/useSubscription.ts
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'

export function useSubscription({ userId }: { userId: string | null }) {
  const [status, setStatus] = useState<'free' | 'pro'>('free')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!userId || !supabase) return
    
    const fetchStatus = async () => {
      setIsLoading(true)
      const { data } = await supabase
        .from('users')
        .select('subscription_status')
        .eq('github_id', userId)
        .single()
      setStatus(data?.subscription_status || 'free')
      setIsLoading(false)
    }
    fetchStatus()
  }, [userId])

  const startCheckout = useCallback(async () => {
    const res = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ github_id: userId })
    })
    const { url } = await res.json()
    if (url) window.location.href = url
  }, [userId])

  return { status, isLoading, isPro: status === 'pro', startCheckout }
}
```

### Memoize Objects in Dependencies

**IMPORTANT**: Always memoize objects passed to hooks to prevent infinite loops:

```typescript
// BAD - creates new object every render
useSubscription({ user: { id: user.id } })

// GOOD - memoized, only changes when id changes
const memoizedUser = useMemo(() => ({ id: user.id }), [user.id])
useSubscription({ user: memoizedUser })
```

### API Proxy Pattern

For managed API keys (Pro subscribers), proxy requests through Netlify Functions:

```typescript
// netlify/functions/api-proxy.ts
export const handler: Handler = async (event) => {
  // 1. Verify user subscription in Supabase
  // 2. If Pro, forward request with managed API key
  // 3. Log usage for rate limiting
  // 4. Return response
}
```

---

## Deployment Checklist

- [ ] All environment variables set in Netlify
- [ ] Supabase schema executed
- [ ] RLS policies configured
- [ ] Stripe product and price created
- [ ] Stripe webhook endpoint added
- [ ] Test in Stripe test mode first
- [ ] Complete Stripe identity verification for live mode
- [ ] Custom domain configured (optional)

---

## Testing

### Stripe Test Cards
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires auth: `4000 0025 0000 3155`

### Debug Tips
1. Check Netlify Function logs for server errors
2. Use browser DevTools Network tab for API calls
3. Supabase Dashboard → SQL Editor for database queries
4. Stripe Dashboard → Events for webhook delivery

---

## Scaling Considerations

- Add usage tracking table for rate limiting
- Implement daily/monthly quotas per user
- Add Stripe customer portal for subscription management
- Consider adding team/org subscriptions
- Add analytics (Plausible, PostHog, etc.)
