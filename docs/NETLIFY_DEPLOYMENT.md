# Netlify Deployment Guide

This guide walks through deploying GitConnect to Netlify from the GitHub repository.

---

## Overview

**What happens during deployment:**
1. Netlify connects to your GitHub repo (`okstudio1/gitconnect`)
2. On every push to `main`, Netlify automatically builds and deploys
3. Netlify Functions (serverless) handle the GitHub OAuth token exchange
4. Your custom domain (gitconnect.pro) serves the app

---

## Step-by-Step Deployment

### Step 1: Create Netlify Account (if needed)

1. Go to https://app.netlify.com/signup
2. Sign up with GitHub (recommended) for easy repo access

---

### Step 2: Create New Site from Git

1. Go to https://app.netlify.com
2. Click **"Add new site"** → **"Import an existing project"**
3. Select **"Deploy with GitHub"**
4. Authorize Netlify to access your GitHub account (if not already done)
5. Search for and select the repository: `okstudio1/gitconnect`

---

### Step 3: Configure Build Settings

On the "Site configuration" screen, set:

| Setting | Value |
|---------|-------|
| **Branch to deploy** | `main` |
| **Base directory** | `web` |
| **Build command** | `npm run build` |
| **Publish directory** | `web/dist` |
| **Functions directory** | `web/netlify/functions` |

> **Important**: The base directory is `web` because the React app lives in the `web/` subfolder, not the repo root.

---

### Step 4: Add Environment Variables

Before clicking deploy, add environment variables:

1. Expand **"Environment variables"** section (or add after deploy in Site settings)
2. Add the following:

| Key | Value |
|-----|-------|
| `GITHUB_APP_CLIENT_ID` | Your GitHub App Client ID (e.g., `Iv1.xxxxxxxxxxxx`) |
| `GITHUB_APP_CLIENT_SECRET` | Your GitHub App Client Secret |

> **Security Note**: These are stored encrypted in Netlify. Never commit them to git.

---

### Step 5: Deploy

1. Click **"Deploy site"**
2. Wait for the build to complete (typically 1-2 minutes)
3. Netlify will assign a random subdomain like `random-name-123.netlify.app`

---

### Step 6: Verify Deployment

1. Click the preview URL (e.g., `https://random-name-123.netlify.app`)
2. The GitConnect app should load
3. **Note**: GitHub login won't work yet until custom domain is configured (callback URL mismatch)

---

## Custom Domain Configuration

### Step 7: Add Custom Domain

1. In Netlify dashboard, go to **Site settings** → **Domain management**
2. Click **"Add custom domain"**
3. Enter: `gitconnect.pro`
4. Click **"Verify"** → **"Add domain"**

### Step 8: Configure DNS

**If you chose Netlify DNS:**
1. Netlify will show you nameservers (e.g., `dns1.p01.nsone.net`, `dns2.p01.nsone.net`)
2. Go to your domain registrar (where you bought gitconnect.pro)
3. Update the nameservers to Netlify's nameservers
4. Wait for DNS propagation (can take up to 48 hours, usually faster)

**If you kept external DNS:**
Add these records at your registrar:
```
Type    Name    Value
A       @       75.2.60.5
CNAME   www     your-site-name.netlify.app
```

### Step 9: Enable HTTPS

1. Once DNS propagates, go to **Domain management** → **HTTPS**
2. Click **"Verify DNS configuration"**
3. Click **"Provision certificate"**
4. Netlify will automatically provision a Let's Encrypt SSL certificate

---

## Verify Everything Works

### Test the OAuth Flow

1. Visit https://gitconnect.pro
2. Click **"Sign in with GitHub"**
3. You should be redirected to GitHub to authorize
4. After authorization, you should be redirected back to GitConnect
5. You should see your GitHub repos listed

### If OAuth Fails

Check these common issues:

| Error | Cause | Fix |
|-------|-------|-----|
| "Redirect URI mismatch" | Callback URL doesn't match | Verify GitHub App callback is exactly `https://gitconnect.pro/api/github-auth/callback` |
| "Bad credentials" | Wrong Client ID/Secret | Check Netlify environment variables |
| 404 on callback | Functions not deployed | Check build logs; ensure base directory is `web` |

---

## Netlify Functions

GitConnect uses Netlify Functions for the OAuth token exchange. The function is located at:

```
web/netlify/functions/github-auth.ts
```

This function:
1. Receives the OAuth code from GitHub
2. Exchanges it for an access token (using the Client Secret)
3. Returns the token to the frontend

The function is automatically deployed and available at:
```
https://gitconnect.pro/api/github-auth/callback
```

---

## Continuous Deployment

After initial setup:
- Every push to `main` triggers a new build
- Deploys are atomic (old version stays live until new build succeeds)
- Preview deploys are created for pull requests

### Build Notifications (Optional)

In Site settings → Build & deploy → Deploy notifications:
- Add Slack, email, or webhook notifications for deploy status

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_APP_CLIENT_ID` | Yes | GitHub App Client ID |
| `GITHUB_APP_CLIENT_SECRET` | Yes | GitHub App Client Secret |
| `SITE_URL` | Yes | Your site URL (e.g., `https://gitconnect.pro`) — used for OAuth callback |

> **Note**: `URL` is a reserved variable in Netlify, so we use `SITE_URL` instead.

---

## Troubleshooting

### Build Fails

1. Check build logs in Netlify dashboard
2. Common issues:
   - Missing dependencies: Run `npm install` locally to verify
   - TypeScript errors: Run `npm run build` locally to verify
   - Wrong base directory: Must be `web`

### Functions Not Working

1. Go to **Functions** tab in Netlify dashboard
2. Check if `github-auth` function is listed
3. View function logs for errors
4. Verify `netlify.toml` is in the `web/` directory

### HTTPS Certificate Issues

1. Ensure DNS has fully propagated (check with https://dnschecker.org)
2. Wait 24-48 hours for DNS changes
3. Try "Renew certificate" in Netlify HTTPS settings

---

## Rollback

If a deploy breaks the site:

1. Go to **Deploys** tab
2. Find a previous working deploy
3. Click **"Publish deploy"** to roll back instantly

---

## Local Development vs Production

| Aspect | Local | Production |
|--------|-------|------------|
| URL | `http://localhost:8888` | `https://gitconnect.pro` |
| Functions | `netlify dev` runs them locally | Auto-deployed |
| Environment | `web/.env` file | Netlify environment variables |
| GitHub Callback | Need separate GitHub App for localhost | Uses production GitHub App |

### Running Locally with Netlify CLI

```bash
cd web
npm install
npx netlify dev
```

This runs the app at `http://localhost:8888` with functions support.

---

## Summary Checklist

- [ ] Created Netlify account
- [ ] Connected GitHub repo (`okstudio1/gitconnect`)
- [ ] Set base directory to `web`
- [ ] Set build command to `npm run build`
- [ ] Set publish directory to `web/dist`
- [ ] Added `GITHUB_APP_CLIENT_ID` environment variable
- [ ] Added `GITHUB_APP_CLIENT_SECRET` environment variable
- [ ] Deployed site
- [ ] Added custom domain `gitconnect.pro`
- [ ] Configured DNS (nameservers or records)
- [ ] Waited for DNS propagation
- [ ] HTTPS certificate provisioned
- [ ] Tested GitHub OAuth flow
- [ ] Tested file loading and saving
