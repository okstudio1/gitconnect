# GitConnect Architecture Review

**Date**: December 21, 2024  
**Purpose**: Address user concerns about multi-user support, authentication, and UI improvements

---

## Issue 1: Multi-User Support ✅ CONFIRMED WORKING

### Current Implementation
- **Token Storage**: `localStorage` (browser-local, per-device)
- **No Server-Side State**: Tokens never stored on our servers
- **Each User**: Gets their own token in their own browser

### Why User Saw Their Photo
If you saw your photo on your phone when first visiting, likely causes:
1. **Browser Sync**: Some browsers (e.g., Chrome, Safari) sync localStorage across devices
2. **Previous Login**: You had previously logged in on that browser/device
3. **PWA Cache**: If installed as PWA, may have cached auth state

### Verdict
**Architecture is correct for multi-user.** No changes needed. Each user's session is isolated per browser.

---

## Issue 2: GitHub App Native Authentication (Device Flow)

### Current State
- Uses **browser OAuth flow** (redirects to GitHub in browser)
- Device Flow is **disabled** in GitHub App settings

### What Device Flow Enables
Instead of browser redirect, user:
1. App shows a short code (e.g., `WDJB-MJHT`)
2. User opens GitHub app or visits `https://github.com/login/device`
3. User enters code → authorizes in GitHub app
4. App polls GitHub until authorized → receives token

### Benefits
- **Native App Feel**: Uses GitHub mobile app for auth
- **No Browser Redirect**: Stays in the app experience
- **Works on TVs/Headless**: Any device that can display a code

### Implementation Required

#### Step 1: Enable Device Flow in GitHub App
Go to: `https://github.com/organizations/okstudio1/settings/apps/gitconnect`
- Scroll to "OAuth" section
- Check "Enable Device Flow"
- Save changes

#### Step 2: Add Device Flow Endpoint (Netlify Function)
```typescript
// POST /api/github-auth/device - Start device flow
// Returns: { device_code, user_code, verification_uri, expires_in, interval }

// POST /api/github-auth/device/poll - Poll for token
// Returns: { access_token } or { error: "authorization_pending" }
```

#### Step 3: Add Device Flow UI Component
```
┌─────────────────────────────────────┐
│        Sign in with GitHub          │
│                                     │
│  1. Go to: github.com/login/device  │
│                                     │
│     Enter code: WDJB-MJHT           │
│                                     │
│     [ Open GitHub ]                 │
│                                     │
│  ⏳ Waiting for authorization...    │
└─────────────────────────────────────┘
```

### Priority
**Medium** - Improves UX on mobile but current browser flow works

---

## Issue 3: Repo-Specific Access ✅ SUPPORTED (with caveats)

### Current State
- GitHub App (`gitconnectpro`) supports **fine-grained repo access**
- User can select "Only select repositories" during **app installation**
- Link exists in UserSettings: "Manage Repository Access"

### Important: Two Separate Steps
1. **App Installation** (`github.com/apps/gitconnectpro/installations/new`) - This is where repo selection happens
2. **OAuth Authorization** (`github.com/login/oauth/authorize`) - Just authenticates the user

If a user goes directly through OAuth without first installing the app, they won't be prompted for repo selection.

### The Problem
Users may not realize:
1. They need to **install** the app first (not just authorize)
2. During installation, they can limit repo access
3. They can change it later via the settings link

### Recommendation
- First-time users should be directed to app installation, not just OAuth
- Make the "Manage Repository Access" more prominent
- Add hint text: "GitConnect can only access repos you authorize"
- Consider showing which repos are accessible in the file browser

---

## Issue 4: Landscape Mode with 3-Column Layout

### Current Layout (Portrait/Mobile-First)
```
┌────────────────────────┐
│       Header           │
├────────────────────────┤
│                        │
│      Code Editor       │
│                        │
├────────────────────────┤
│  Transcript/AI Status  │
├────────────────────────┤
│      Action Bar        │
│   [Mode] [Mic] [Run]   │
└────────────────────────┘
```

### Proposed Landscape Layout
```
┌──────────────────────────────────────────────────────────────┐
│  MacroVox                                           [User]   │
├──────────────┬────────────────────────────┬──────────────────┤
│              │                            │                  │
│  FILE        │                            │    VOICE         │
│  BROWSER     │       CODE EDITOR          │    CONTROLS      │
│              │                            │                  │
│  📁 repos    │                            │    [●] REC       │
│  ├── src/    │   // code here             │                  │
│  │   └── ... │                            │    Mode: Agent   │
│  └── ...     │                            │                  │
│              │                            │    Transcript:   │
│              │                            │    "add a..."    │
│              │                            │                  │
└──────────────┴────────────────────────────┴──────────────────┘
```

### Implementation Plan
1. Detect orientation/screen width
2. Use CSS grid/flexbox for responsive layout
3. Extract FileBrowser from modal to inline panel
4. Move voice controls to right panel in landscape

### Breakpoints
- **Portrait** (< 768px): Current stacked layout
- **Landscape** (≥ 768px): 3-column layout

---

## Action Items

| Priority | Item | Status |
|----------|------|--------|
| High | Implement landscape 3-column layout | 🔄 In Progress |
| High | Make FileBrowser a persistent panel in landscape | 🔄 In Progress |
| Medium | Enable Device Flow in GitHub App settings | ⏳ Requires manual action |
| Medium | Implement Device Flow auth | ⏳ Pending |
| Low | Add repo access hint in onboarding | ⏳ Pending |

---

## Summary

1. **Multi-user**: ✅ Already works correctly
2. **Repo access**: ✅ Already works, just needs better discoverability
3. **Device Flow**: Needs GitHub App setting + code implementation
4. **Landscape mode**: Needs UI refactor (main priority)
