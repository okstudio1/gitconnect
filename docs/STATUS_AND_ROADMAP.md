# GitConnect — Status & Roadmap

**Last Updated**: December 26, 2024  
**Live Site**: https://gitconnect.pro  
**Repository**: https://github.com/okstudio1/gitconnect

---

## Project Overview

**GitConnect** is a voice-powered GitHub editor — browse, edit, and commit code using voice commands and AI assistance from any device with a browser.

**Core Features**:
- Monaco code editor with syntax highlighting
- Real-time voice transcription (Deepgram)
- AI code generation (Claude) with accept/reject flow
- GitHub file browsing, editing, and commits
- Mobile-friendly with Device Flow authentication
- Responsive portrait/landscape layouts

---

## Status Summary

| Category | Status |
|----------|--------|
| **Core App** | ✅ Complete — Live at gitconnect.pro |
| **GitHub Integration** | ✅ Complete — App installed, auth working |
| **Subscription System** | ✅ Code complete and configured |
| **Stripe Billing** | ⏸️ Configured, awaiting identity verification |
| **Usage Throttling** | 📄 Documented — see [USAGE_THROTTLING.md](./USAGE_THROTTLING.md) |
| **Troubleshooting** | 📄 See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) |
| **Web App Playbook** | 📄 See [WEB_APP_PLAYBOOK.md](./WEB_APP_PLAYBOOK.md) |

---

## ✅ What's Done

### Infrastructure
- [x] React/Vite/Tailwind web app deployed to Netlify
- [x] GitHub App (GitConnectPro) with Device Flow
- [x] Domain (gitconnect.pro) configured with HTTPS
- [x] Supabase project created, env vars in Netlify
- [x] Stripe account created

### Features
- [x] Monaco editor with file loading/saving
- [x] Deepgram voice transcription (WebSocket streaming)
- [x] Claude AI code generation with accept/reject UI
- [x] Agent mode (AI interprets) vs Dictation mode (raw text)
- [x] GitHub file browser and repo selection
- [x] User settings panel with profile and API key management
- [x] Markdown preview with proper UTF-8 support
- [x] Logo and branding

### Subscription Code (Ready to Activate)
- [x] `useSubscription` hook for subscription state
- [x] `SubscriptionBanner` component (Upgrade/Pro badge)
- [x] Deepgram proxy function (`deepgram-proxy.ts`)
- [x] Claude proxy function (`claude-proxy.ts`)
- [x] Stripe functions (`stripe.ts` — checkout, webhook, portal)
- [x] Supabase schema (`SUPABASE_SCHEMA.sql`)

---

## 🔧 Next Steps

### Step 1: Run Supabase Schema ✅ COMPLETE
Execute the database schema to create user and usage tables.

**Sub-steps**:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your Project
2. Click **SQL Editor** in the left sidebar
3. Open `docs/SUPABASE_SCHEMA.sql` from this repo
4. Copy the entire contents and paste into the SQL Editor
5. Click **Run** to execute
6. Verify tables created: `users`, `usage`, `daily_usage` ✅

**Status**: Tables successfully created in Supabase. All three tables visible in Database → Tables view.

---

### Step 2: Create Stripe Product & Price ✅ COMPLETE
Set up the Pro subscription product and pricing in Stripe.

**Sub-steps**:

#### 2a. Create the Product
1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Products**
2. Click **+ Add product**
3. Fill in:
   - **Name**: `GitConnect Pro`
   - **Description**: `Unlock mobile agentic voice-powered coding. Perfect for developers who want hands-free code generation, transcription, and GitHub integration.`
4. Click **Save product** (don't add pricing yet)

#### 2b. Add Pricing
1. On the product page, scroll to **Pricing** section
2. Click **+ Add price**
3. Fill in:
   - **Price**: `$9.99` (or your chosen amount)
   - **Billing period**: `Monthly`
   - **Recurring**: Yes
4. Click **Save price**
5. **Copy the Price ID** (starts with `price_`) — you'll need this for Step 3

**Important**: Save both:
- **Product ID** (starts with `prod_`)
- **Price ID** (starts with `price_`) — this is what goes in environment variables

---

### Step 3: Add Missing Environment Variables ✅ COMPLETE
Add these to Netlify → Site settings → Environment variables:

| Variable | Where to Get | Secret? |
|----------|--------------|---------|
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys → Secret key | 🔒 YES |
| `STRIPE_PUBLISHABLE_KEY` | Stripe → Developers → API keys → Publishable key | ❌ No |
| `STRIPE_PRICE_ID` | From Step 2 above | ❌ No |
| `STRIPE_WEBHOOK_SECRET` | Created in Step 4 below | 🔒 YES |
| `DEEPGRAM_API_KEY` | [Deepgram Console](https://console.deepgram.com) → API Keys | 🔒 YES |
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com) → API Keys | 🔒 YES |
| `VITE_SUPABASE_URL` | Supabase → Settings → API → Project URL | ❌ No |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → Settings → API → Publishable key | ❌ No |

---

### Step 4: Create Stripe Webhook ✅ COMPLETE
Connect Stripe events to the app for subscription updates.

**Sub-steps**:
1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → Developers → Webhooks
2. Click **+ Add endpoint**
3. **Endpoint URL**: `https://gitconnect.pro/api/stripe/webhook`
4. **Events to send**: Select these:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click **Add endpoint**
6. Click the endpoint → Reveal **Signing secret**
7. Copy and add as `STRIPE_WEBHOOK_SECRET` in Netlify

---

### Step 5: Redeploy ✅ COMPLETE
Trigger a new deploy to pick up the environment variables.

**Sub-steps**:
1. Go to Netlify Dashboard → Deploys
2. Click **Trigger deploy** → **Deploy site**
3. Wait for deploy to complete (~1-2 min)

**Status**: Multiple deploys completed. All bugs fixed (see Troubleshooting doc).

---

### Step 6: Test Subscription Flow ⏸️ BLOCKED
Verify the complete checkout experience.

**Current Status**: Stripe checkout redirects correctly, but:
- Using **live mode** API keys (test cards don't work)
- Stripe identity verification required before live payments

**To complete testing, choose one option**:

#### Option A: Switch to Test Mode (Recommended for testing)
1. Toggle **Test mode** in Stripe Dashboard (top right)
2. Create a test product and price in test mode
3. Copy test API keys (`sk_test_...`, `price_test_...`)
4. Update `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID` in Netlify
5. Redeploy and test with card `4242 4242 4242 4242`

#### Option B: Complete Identity Verification (For live payments)
1. Go to Stripe Dashboard → Complete identity verification task
2. Upload required documents
3. Wait for approval (1-2 business days)
4. Use real payment card to test

**Sub-steps once unblocked**:
1. Visit https://gitconnect.pro
2. Sign in with GitHub
3. Click **Upgrade to Pro** button
4. Complete Stripe Checkout
5. Verify redirect back to app with "Pro" badge
6. Test voice transcription (should work without entering API key)
7. Test AI code generation (should work without entering API key)
8. Click **Manage** to verify Stripe Customer Portal works

---

## 📋 Future Roadmap

### Near-term
- [ ] Usage limits and tracking for Pro tier
- [ ] Team tier with shared billing
- [ ] Usage analytics dashboard

### Medium-term
- [ ] Multi-file editing
- [ ] Branch switching and PR creation
- [ ] Collaborative editing

### Long-term
- [ ] Desktop app (Electron)
- [ ] Android native app
- [ ] VS Code extension
- [ ] Custom AI models / fine-tuning

---

## 🎉 Recent Updates (December 26, 2024)

- ✅ Added **CSV Preview** component with RainbowCSV-style column colorization
- ✅ Added **Claude Model Selector** — choose between Sonnet 4, Opus 4, or Haiku 3.5
- ✅ Fixed **infinite loop bug** in useSubscription hook
- ✅ Fixed **Stripe empty email bug** in checkout flow
- ✅ Renamed `VITE_SUPABASE_ANON_KEY` to `VITE_SUPABASE_PUBLISHABLE_KEY` for clarity
- ✅ Added **RLS policies** for Supabase to allow anon key inserts
- ✅ Created comprehensive troubleshooting and playbook documentation

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `GITHUB_APP_SETUP.md` | GitHub App creation and configuration |
| `NETLIFY_DEPLOYMENT.md` | Netlify deployment settings |
| `API_KEY_SECURITY.md` | API key handling and security |
| `SUBSCRIPTION_ARCHITECTURE.md` | Subscription system design |
| `SUPABASE_SCHEMA.sql` | Database schema for Supabase |
| `USAGE_THROTTLING.md` | API usage tracking and quota system |
| `TROUBLESHOOTING.md` | Common errors and solutions |
| `WEB_APP_PLAYBOOK.md` | Guide for building new SaaS web apps |

---

## Repository Structure

```
gitconnect/
├── web/                        # React web app
│   ├── src/
│   │   ├── App.tsx             # Main application
│   │   ├── hooks/
│   │   │   ├── useDeepgram.ts  # Voice transcription
│   │   │   ├── useClaude.ts    # AI code generation
│   │   │   ├── useGitHub.ts    # GitHub API
│   │   │   └── useSubscription.ts  # Subscription state
│   │   ├── components/
│   │   │   ├── CSVPreview.tsx      # CSV file preview
│   │   │   ├── FileBrowser.tsx
│   │   │   ├── SubscriptionBanner.tsx
│   │   │   └── ...
│   │   └── lib/
│   │       └── supabase.ts     # Supabase client
│   ├── netlify/functions/
│   │   ├── github-auth.ts      # GitHub OAuth
│   │   ├── deepgram-proxy.ts   # Deepgram API proxy
│   │   ├── claude-proxy.ts     # Claude API proxy
│   │   └── stripe.ts           # Stripe checkout/webhook
│   └── package.json
├── docs/                       # Documentation
└── README.md
```
