# GitConnect Troubleshooting Guide

This document summarizes errors encountered during the subscription system setup and their resolutions.

---

## Error 1: "Upgrade to Pro" Button Grayed Out

**Symptom**: The upgrade button appears disabled/grayed out and doesn't respond to clicks.

**Root Cause**: The `isLoading` state was stuck at `true` because the Supabase connection was failing or the useEffect was in an infinite loop.

**Diagnosis**:
- Check browser console for errors
- Check Network tab for failed Supabase requests
- Look for excessive requests (1000+) indicating an infinite loop

**Resolution**:
1. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are set in Netlify
2. Ensure variable names match exactly (we renamed from `VITE_SUPABASE_ANON_KEY` to `VITE_SUPABASE_PUBLISHABLE_KEY`)
3. Redeploy after adding/changing environment variables

---

## Error 2: Infinite Loop in useSubscription (12,000+ requests)

**Symptom**: Network tab shows thousands of pending/failed requests to Supabase. Browser becomes unresponsive. Error: `net::ERR_INSUFFICIENT_RESOURCES`

**Root Cause**: The `githubUser` object was recreated on every render in App.tsx, causing the `useEffect` dependency to trigger infinitely.

**Bad Code**:
```typescript
useSubscription({
  githubUser: user ? { id: user.id, login: user.login, email: user.email } : null
})
```

**Resolution**: Memoize the `githubUser` object with `useMemo`:
```typescript
const githubUser = useMemo(() => {
  if (!user) return null
  return { id: user.id, login: user.login, email: user.email }
}, [user?.id, user?.login, user?.email])

useSubscription({ githubUser })
```

**File**: `web/src/App.tsx`

---

## Error 3: Supabase RLS Blocking Inserts

**Symptom**: Supabase SELECT requests return 200, but user creation fails silently.

**Root Cause**: Row Level Security (RLS) policies only allowed the service role to insert/update, not the anon/publishable key.

**Resolution**: Run this SQL in Supabase SQL Editor:
```sql
DROP POLICY IF EXISTS "Service role can manage users" ON users;

CREATE POLICY "Anyone can insert users" ON users
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update users" ON users
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access" ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

---

## Error 4: Stripe Checkout 500 Error - "Stripe not configured"

**Symptom**: POST to `/api/stripe/create-checkout` returns 500.

**Root Cause**: Missing or incorrect environment variables.

**Diagnosis**: Check the response body for specific error:
- `"missing STRIPE_SECRET_KEY"` → Add the key to Netlify
- `"missing STRIPE_PRICE_ID"` → Add the price ID from Stripe Products

**Resolution**: Verify these env vars exist in Netlify:
- `STRIPE_SECRET_KEY` (starts with `sk_live_` or `sk_test_`)
- `STRIPE_PRICE_ID` (starts with `price_`)

---

## Error 5: Stripe Checkout 500 Error - "Invalid email address"

**Symptom**: POST to `/api/stripe/create-checkout` returns 500 with `details: "Invalid email address: "`

**Root Cause**: The code was passing an empty string as `customer_email` to Stripe, which rejects empty emails.

**Bad Code**:
```typescript
customer_email: customerId ? undefined : email,
```

**Resolution**: Only pass email if it's actually set:
```typescript
...(customerId ? {} : email ? { customer_email: email } : {}),
```

**File**: `web/netlify/functions/stripe.ts`

---

## Error 6: Stripe Test Card Declined in Live Mode

**Symptom**: "Your card was declined. Your request was in live mode, but used a known test card."

**Root Cause**: Using test card numbers (`4242 4242 4242 4242`) with live Stripe API keys.

**Resolution**: Either:
1. **Switch to test mode**: Use test API keys (`sk_test_...`) and create test products/prices
2. **Use real card**: Complete Stripe identity verification and use a real payment method

**To switch to test mode**:
1. Toggle "Test mode" in Stripe Dashboard
2. Copy test Secret Key from Developers → API keys
3. Create a test product and price
4. Update `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID` in Netlify with test values
5. Redeploy

---

## Error 7: Stripe Identity Verification Required

**Symptom**: Stripe Dashboard shows "Payments paused" and "Payouts paused" with identity verification request.

**Root Cause**: Stripe requires identity verification before processing live payments.

**Resolution**: Complete the identity verification in Stripe Dashboard:
1. Click "Start" on the verification task
2. Upload required identity documents
3. Wait for verification to complete (usually 1-2 business days)

---

## General Debugging Tips

### Check Netlify Function Logs
1. Go to Netlify Dashboard → Functions
2. Click on the function (e.g., `stripe`)
3. View Logs tab for server-side errors

### Check Browser DevTools
1. **Console tab**: JavaScript errors
2. **Network tab**: Failed API requests, response bodies
3. Filter by "Fetch/XHR" to see API calls

### Common Environment Variable Issues
- Variables must be set in the correct scope (Production, not just Local)
- `VITE_` prefix is required for client-side variables
- Server-side functions use variables without `VITE_` prefix
- Redeploy is required after changing env vars

### Test Stripe Integration
- Use test mode first to verify the integration works
- Test card: `4242 4242 4242 4242`, any future expiry, any CVC
- Switch to live mode only after verification is complete
