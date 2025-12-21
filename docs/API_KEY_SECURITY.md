# API Key Security & Storage Strategy

This document outlines how GitConnect handles Deepgram and Anthropic API keys, including security considerations and best practices.

---

## Current Implementation: User-Provided Keys

GitConnect currently uses a **user-provided API key model**:

1. Users sign up for their own Deepgram and Anthropic accounts
2. Users enter their API keys in the GitConnect UI
3. Keys are stored in browser `localStorage`
4. API calls go directly from the browser to Deepgram/Claude (no server proxy)

### Why This Approach?

| Benefit | Explanation |
|---------|-------------|
| **No server costs** | You don't pay for API calls; users do |
| **Scalability** | No backend bottleneck; each user's usage is independent |
| **User control** | Users manage their own API quotas and billing |
| **Simplicity** | No backend required; Netlify Functions only handle GitHub OAuth |

---

## Security Model

### What's Stored Locally

| Data | Location | Encrypted | Accessible |
|------|----------|-----------|------------|
| GitHub token | `localStorage` | No | JavaScript only |
| Deepgram API key | `localStorage` | No | JavaScript only |
| Anthropic API key | `localStorage` | No | JavaScript only |

### Security Properties

**✅ Secure:**
- Keys are **never sent to your server** (no Netlify Functions proxy)
- Keys are **never logged** or stored on disk
- Keys are **HTTPS-only** (Netlify enforces TLS)
- Keys are **user-managed** (you have no liability for key exposure)

**⚠️ Risks:**
- Keys visible in browser DevTools (F12 → Application → localStorage)
- Keys vulnerable if user's device is compromised
- Keys vulnerable if user visits a malicious site on same browser
- No rate limiting (user could accidentally burn through quota)

---

## Best Practices for Users

Display this guidance in the GitConnect UI:

```
🔐 Security Notice

Your API keys are stored locally in your browser and never sent to our servers.

Best practices:
1. Use dedicated API keys (not your main account key)
2. Set spending limits on your API accounts
3. Regularly rotate your keys
4. Don't share your browser session
5. Clear keys when done (logout button clears localStorage)
6. Use a separate browser profile for GitConnect if you're concerned
```

---

## Implementation Details

### Storing Keys

```typescript
// User enters keys in UI
localStorage.setItem('deepgram_api_key', userProvidedKey)
localStorage.setItem('anthropic_api_key', userProvidedKey)
```

### Using Keys

```typescript
// Direct API calls from browser (no proxy)
const response = await fetch('https://api.deepgram.com/v1/listen', {
  headers: {
    'Authorization': `Token ${localStorage.getItem('deepgram_api_key')}`
  }
})
```

### Clearing Keys

```typescript
// On logout
localStorage.removeItem('deepgram_api_key')
localStorage.removeItem('anthropic_api_key')
localStorage.removeItem('github_token')
```

---

## Future Options

### Option 1: Proxy via Netlify Functions (Recommended for Paid Tier)

**Setup:**
- Store your API keys in Netlify environment variables
- Create Functions that proxy requests:
  - `POST /api/deepgram/transcribe` → calls Deepgram
  - `POST /api/claude/generate` → calls Anthropic
- Frontend sends requests to your Functions instead of directly to APIs

**Pros:**
- You control the API keys (users don't need their own)
- Can add rate limiting per user
- Can add usage tracking/analytics
- Better UX (no key management)

**Cons:**
- You pay for all API calls
- Need to implement rate limiting to control costs
- More complex backend

**Cost Estimate:**
- Deepgram: ~$0.0043 per minute (audio)
- Anthropic: ~$0.003 per 1K input tokens
- Example: 100 users × 10 min/day = $13/day for Deepgram alone

### Option 2: Hybrid Approach (Recommended for Freemium)

**Setup:**
- Users can optionally provide their own keys (current model)
- Offer a "managed" tier where you provide keys via proxy
- Free tier uses user keys; paid tier uses your proxy

**Pros:**
- Flexible monetization
- Users can choose their model
- Scales from free to paid

**Cons:**
- More complex implementation
- Need to manage two code paths

### Option 3: Third-Party API Management

**Services:**
- **Supabase Edge Functions** - Similar to Netlify, can proxy APIs
- **Vercel Edge Functions** - Faster, better for real-time
- **AWS Lambda** - More control, higher complexity

---

## Recommended Path Forward

> **See [SUBSCRIPTION_ARCHITECTURE.md](./SUBSCRIPTION_ARCHITECTURE.md) for full implementation details.**

### Phase 1 (Current): User Keys
- ✅ Implemented
- Users provide their own Deepgram/Anthropic keys
- Document security best practices
- Add UI warnings about key storage

### Phase 2 (Active): Subscription + Proxy Model
- **Decision**: Implementing paid subscription with API proxy
- Add Netlify Functions to proxy Deepgram/Claude calls
- Integrate Stripe for subscription billing ($9.99/month Pro tier)
- Use Supabase for user/subscription storage
- Implement rate limiting per user

### Phase 3: Monetization Tiers
- **Free tier**: User-provided keys only
- **Pro tier**: Managed keys via proxy ($9.99/month)
- **Team tier**: Multiple users, shared repos ($29.99/month)

---

## Implementation Checklist

### For Current User-Key Model

- [ ] Add localStorage clear on logout
- [ ] Add UI warning about key storage
- [ ] Add "Clear all data" button in settings
- [ ] Document key setup for Deepgram (https://console.deepgram.com/keys)
- [ ] Document key setup for Anthropic (https://console.anthropic.com/account/keys)
- [ ] Add input validation (check key format before storing)
- [ ] Add error handling (show user-friendly error if key is invalid)

### For Future Proxy Model

- [ ] Create `web/netlify/functions/deepgram-proxy.ts`
- [ ] Create `web/netlify/functions/claude-proxy.ts`
- [ ] Implement rate limiting (e.g., 100 requests/hour per user)
- [ ] Add usage tracking/analytics
- [ ] Update frontend to use proxy endpoints
- [ ] Add feature flag to toggle between user keys and proxy

---

## Security Audit Checklist

- [ ] Keys never logged to console (in production)
- [ ] Keys never sent to analytics services
- [ ] Keys never stored in cookies (only localStorage)
- [ ] HTTPS enforced (Netlify default)
- [ ] No API keys in git history
- [ ] No API keys in environment variables (except server-side)
- [ ] CORS headers properly configured
- [ ] Rate limiting in place (if using proxy)

---

## References

- [Deepgram API Keys](https://developers.deepgram.com/reference/authentication)
- [Anthropic API Keys](https://docs.anthropic.com/claude/reference/authentication)
- [OWASP: Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [Web Storage Security](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
