# GitConnect — Status & Roadmap

**Last Updated**: December 25, 2024  
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
| **Subscription System** | 🔧 Code complete, needs configuration |
| **Stripe Billing** | 📋 Account ready, needs product setup |

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

### Step 1: Run Supabase Schema
Execute the database schema to create user and usage tables.

**Sub-steps**:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your Project
2. Click **SQL Editor** in the left sidebar
3. Open `docs/SUPABASE_SCHEMA.sql` from this repo
4. Copy the entire contents and paste into the SQL Editor
5. Click **Run** to execute
6. Verify tables created: `users`, `usage`

---

### Step 2: Create Stripe Product
Set up the Pro subscription product in Stripe.

**Sub-steps**:
1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → Products
2. Click **+ Add product**
3. Fill in:
   - **Name**: `GitConnect Pro`
   - **Description**: `Managed API keys for Deepgram and Claude. No need to provide your own.`
   - **Pricing**: `$9.99/month` (or your chosen price)
   - **Billing period**: Monthly
4. Click **Save product**
5. Copy the **Price ID** (starts with `price_`)

---

### Step 3: Add Missing Environment Variables
Add these to Netlify → Site settings → Environment variables:

| Variable | Where to Get |
|----------|--------------|
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys → Secret key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe → Developers → API keys → Publishable key |
| `STRIPE_PRICE_ID` | From Step 2 above |
| `STRIPE_WEBHOOK_SECRET` | Created in Step 4 below |
| `DEEPGRAM_API_KEY` | [Deepgram Console](https://console.deepgram.com) → API Keys |
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com) → API Keys |
| `VITE_SUPABASE_URL` | Same as existing `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | Same as existing `SUPABASE_ANON_KEY` |

---

### Step 4: Create Stripe Webhook
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

### Step 5: Redeploy
Trigger a new deploy to pick up the environment variables.

**Sub-steps**:
1. Go to Netlify Dashboard → Deploys
2. Click **Trigger deploy** → **Deploy site**
3. Wait for deploy to complete (~1-2 min)

---

### Step 6: Test Subscription Flow
Verify the complete checkout experience.

**Sub-steps**:
1. Visit https://gitconnect.pro
2. Sign in with GitHub
3. Click **Upgrade to Pro** button
4. Complete Stripe Checkout (use test card: `4242 4242 4242 4242`)
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

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `GITHUB_APP_SETUP.md` | GitHub App creation and configuration |
| `NETLIFY_DEPLOYMENT.md` | Netlify deployment settings |
| `API_KEY_SECURITY.md` | API key handling and security |
| `SUBSCRIPTION_ARCHITECTURE.md` | Subscription system design |
| `SUPABASE_SCHEMA.sql` | Database schema for Supabase |

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
│   │   │   └── useSubscription.ts
│   │   ├── components/
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
