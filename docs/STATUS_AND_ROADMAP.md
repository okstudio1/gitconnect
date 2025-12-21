# GitConnect - Project Status & Roadmap

**Date**: December 20, 2024  
**Domain**: gitconnect.pro  
**Repository**: https://github.com/okstudio1/gitconnect  
**Upstream (Open Source)**: https://github.com/owenpkent/MacroVox

---

## What Is GitConnect?

A **voice-powered GitHub editor** that lets you browse, edit, and commit code to GitHub repositories using voice commands and AI assistance — from any device with a browser.

### Core Features (Implemented)
- **Monaco Editor** - Full code editor in the browser
- **Deepgram Integration** - Real-time voice-to-text transcription
- **Claude AI Integration** - Voice → code generation with accept/reject flow
- **GitHub Integration** - Browse repos, load files, save directly to GitHub
- **Agent vs Dictation Mode** - AI interprets intent OR raw dictation

---

## Current Status

### ✅ Completed

| Item | Status | Notes |
|------|--------|-------|
| Web app (React/Vite/Tailwind) | ✅ Done | In `web/` folder |
| Deepgram voice transcription | ✅ Done | WebSocket streaming to nova-2 |
| Claude code generation | ✅ Done | Direct API with accept/reject UI |
| GitHub file read/write | ✅ Done | REST API integration |
| GitHub OAuth → GitHub App migration | ✅ Done | Better security, fine-grained permissions |
| Netlify Functions for auth | ✅ Done | Token exchange, refresh support |
| Commercial repo setup | ✅ Done | okstudio1/gitconnect on GitHub |
| Full project migrated | ✅ Done | Designs, docs, proposals included |
| GitHub App creation | ✅ Done | Credentials saved securely |
| Domain configuration | ✅ Done | DNS connected to Netlify (propagating) |

### 🔄 In Progress

| Item | Status | Blocker |
|------|--------|---------|
| Netlify deployment | ✅ Done | Site live, testing OAuth |
| Subscription system | Planning | See SUBSCRIPTION_ARCHITECTURE.md |
| Stripe integration | Pending | Waiting on subscription architecture |
| API proxy functions | Pending | Waiting on Stripe integration |

---

## Architecture Decisions

### 1. GitHub App vs OAuth App

**Decision**: Use GitHub App (not OAuth App)

**Reasoning**:
- **Fine-grained permissions** - Users control exactly which repos the app can access
- **Short-lived tokens** - More secure; tokens expire and refresh automatically
- **Better UX** - Users see clear permission prompts
- **GitHub's recommendation** - OAuth Apps are legacy; GitHub Apps are the modern standard

**Trade-off**: Slightly more complex setup (requires creating a GitHub App in the org settings)

### 2. Netlify Functions for Auth

**Decision**: Use serverless functions for OAuth token exchange

**Reasoning**:
- **Client secret protection** - Can't expose secrets in browser JavaScript
- **No dedicated backend needed** - Functions run on-demand, scale automatically
- **Free tier** - Netlify Functions included in free plan
- **Co-located with frontend** - Same deploy, same repo

**Alternative considered**: Cloudflare Workers, Supabase Edge Functions (equivalent options)

### 3. Dual-Repo Strategy (Open Source + Commercial)

**Decision**: Keep `owenpkent/MacroVox` as open source upstream, `okstudio1/gitconnect` as commercial fork

**Reasoning**:
- **Community contributions** - Open source repo accepts PRs from community
- **Brand separation** - GitConnect is the commercial product name
- **Flexibility** - Can add commercial-only features to fork without polluting upstream
- **License control** - Upstream stays MIT; commercial can add proprietary features later

**Sync strategy**:
```bash
# Pull community improvements into commercial
git remote add upstream https://github.com/owenpkent/MacroVox.git
git fetch upstream && git merge upstream/main
```

### 4. Direct API Calls (No Backend)

**Decision**: Call Deepgram and Claude APIs directly from browser

**Reasoning**:
- **Lower latency** - No extra hop through a backend
- **Simpler architecture** - Fewer moving parts
- **User-provided keys** - Users enter their own API keys (stored in localStorage)

**Trade-off**: 
- Requires `anthropic-dangerous-direct-browser-access` header for Claude
- Users need their own API keys (could add proxy later for managed experience)

**Future option**: Add Netlify Functions as API proxy for users who don't want to manage keys

---

## Repository Structure

```
gitconnect/
├── web/                    # React web app (THE PRODUCT)
│   ├── src/
│   │   ├── App.tsx         # Main application
│   │   ├── hooks/
│   │   │   ├── useDeepgram.ts   # Voice transcription
│   │   │   ├── useClaude.ts     # AI code generation
│   │   │   └── useGitHub.ts     # GitHub OAuth + API
│   │   └── components/
│   │       └── FileBrowser.tsx  # Repo/file browser modal
│   ├── netlify/
│   │   └── functions/
│   │       └── github-auth.ts   # OAuth token exchange
│   ├── netlify.toml        # Netlify config
│   └── package.json
│
├── src/                    # Python desktop app (SECONDARY)
│   ├── ui.py               # PySide6 GUI
│   ├── recorder.py         # Audio recording
│   └── ...
│
├── designs/                # UI mockups and proposals
│   └── proposals/          # Feature proposals
│
├── docs/                   # Documentation
│   ├── COMMERCIAL_STRATEGY.md
│   └── STATUS_AND_ROADMAP.md  # THIS FILE
│
├── VISION.md               # Product vision
├── TODO.md                 # Task tracking
└── README.md               # Project overview
```

---

## Next Steps (In Order)

### Step 1: Create GitHub App (YOU DO THIS)

**URL**: https://github.com/organizations/okstudio1/settings/apps/new

**Settings**:
| Field | Value |
|-------|-------|
| GitHub App name | `GitConnect` |
| Homepage URL | `https://gitconnect.pro` |
| Callback URL | `https://gitconnect.pro/api/github-auth/callback` |
| Expire user authorization tokens | ✅ Checked |
| Request user authorization (OAuth) during installation | ✅ Checked |
| Webhook → Active | ❌ Unchecked |

**Permissions** (Repository):
| Permission | Access |
|------------|--------|
| Contents | Read and write |
| Metadata | Read-only (required) |

**Where can this GitHub App be installed?**
→ Select "Any account"

**After creation, note**:
- Client ID (shown on app page)
- Client Secret (click "Generate a new client secret")

---

### Step 2: Deploy to Netlify (I DO THIS)

Once you provide the GitHub App credentials, I will:
1. Deploy `okstudio1/gitconnect` to Netlify
2. Set environment variables:
   - `GITHUB_APP_CLIENT_ID`
   - `GITHUB_APP_CLIENT_SECRET`
3. Configure build settings:
   - Base directory: `web`
   - Build command: `npm run build`
   - Publish directory: `web/dist`

---

### Step 3: Connect Domain (YOU DO THIS)

**Option A: Use Netlify DNS (Recommended)**
1. In Netlify dashboard → Domain settings → Add custom domain → `gitconnect.pro`
2. Netlify will provide nameservers (e.g., `dns1.p01.nsone.net`)
3. Go to your domain registrar and update nameservers to Netlify's

**Option B: Keep External DNS**
Add these records at your registrar:
```
Type    Name    Value
A       @       75.2.60.5
CNAME   www     [your-site].netlify.app
```

---

### Step 4: Test End-to-End

1. Visit https://gitconnect.pro
2. Click "Sign in with GitHub"
3. Authorize the GitConnect app
4. Select a repository
5. Load a file
6. Tap mic, speak a code request
7. Accept/reject the generated code
8. Save back to GitHub

---

## Environment Variables Required

For Netlify deployment:

```env
GITHUB_APP_CLIENT_ID=Iv1.xxxxxxxxxxxx
GITHUB_APP_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

For local development (`web/.env`):
```env
GITHUB_APP_CLIENT_ID=Iv1.xxxxxxxxxxxx
GITHUB_APP_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
URL=http://localhost:8888
```

---

## Questions to Confirm

Before proceeding, please verify:

1. **Domain**: Is `gitconnect.pro` registered and you have access to DNS settings?

2. **GitHub App**: Ready to create under okstudio1 org with the settings above?

3. **API Keys**: Do you have (or will users provide their own):
   - Deepgram API key (for voice transcription)
   - Anthropic API key (for Claude code generation)

4. **Branding**: Should we rename "MacroVox" references to "GitConnect" in the UI before launch?

5. **Public launch**: Is this for personal use first, or immediate public availability?

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Claude API CORS issues | Medium | Already using `anthropic-dangerous-direct-browser-access`; fallback is Netlify Function proxy |
| GitHub rate limits | Low | User tokens have 5000 req/hr limit; sufficient for normal use |
| Deepgram costs | Medium | Users provide own API keys; Deepgram has free tier |
| Token expiry | Low | Implemented refresh token flow in github-auth function |

---

## Timeline Estimate

| Task | Time |
|------|------|
| Create GitHub App | 5 min |
| Deploy to Netlify | 10 min |
| Configure DNS | 5-30 min (depends on propagation) |
| End-to-end test | 15 min |
| **Total** | **~1 hour** |

---

## Summary

We're ready to deploy. The code is complete, the repo is set up under `okstudio1/gitconnect`, and the only blocking items are:

1. **Create GitHub App** - Manual step in GitHub UI
2. **Provide credentials** - So I can configure Netlify
3. **DNS setup** - Point gitconnect.pro to Netlify

Once those are done, GitConnect will be live at https://gitconnect.pro.
