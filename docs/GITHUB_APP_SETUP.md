# GitHub App Setup Guide

This document provides complete instructions for setting up the GitConnect GitHub App.

---

## Prerequisites

- GitHub organization (e.g., `okstudio1`)
- Access to organization settings
- Domain configured (gitconnect.pro)

---

## Step-by-Step Setup

### 1. Navigate to GitHub App Creation

**URL**: https://github.com/organizations/okstudio1/settings/apps/new

Or: GitHub → Organization Settings → Developer settings → GitHub Apps → New GitHub App

---

### 2. Basic Information

| Field | Value |
|-------|-------|
| **GitHub App name** | `GitConnectPro` |
| **Description** | See below |
| **Homepage URL** | `https://gitconnect.pro` |

#### Description Text

```
GitConnect is a voice-powered GitHub editor that lets you browse, edit, and commit code using voice commands and AI assistance. Connect your GitHub repositories to edit files from any device with a browser.

Features:
• Browse and edit files in your GitHub repositories
• Voice-to-code generation powered by AI
• Real-time voice transcription
• Works on any device with a browser

GitConnect only requests access to repository contents you explicitly authorize. Your code is never stored on our servers.
```

---

### 3. Identifying and Authorizing Users

| Field | Value |
|-------|-------|
| **Callback URL** | `https://gitconnect.pro/api/github-auth/callback` |
| **Expire user authorization tokens** | ✅ Checked |
| **Request user authorization (OAuth) during installation** | ✅ Checked |
| **Enable Device Flow** | ✅ Checked |

---

### 4. Post Installation

| Field | Value |
|-------|-------|
| **Setup URL** | Leave empty (disabled when OAuth during installation is checked) |
| **Redirect on update** | ❌ Unchecked |

---

### 5. Webhook

| Field | Value |
|-------|-------|
| **Active** | ❌ Unchecked |
| **Webhook URL** | Leave empty |
| **Secret** | Leave empty |

> **Note**: GitConnect does not use webhooks. All interactions are user-initiated.

---

### 6. Permissions

#### Repository Permissions

| Permission | Access Level | Purpose |
|------------|--------------|---------|
| **Contents** | Read and write | Read files, commit changes |
| **Metadata** | Read-only | List repositories (required) |

#### Organization Permissions

None required.

#### Account Permissions

None required.

---

### 7. Installation Access

| Option | Selection |
|--------|-----------|
| **Where can this GitHub App be installed?** | ✅ **Any account** |

> **Important**: Select "Any account" to allow users outside your organization to install the app.

---

### 8. Create the App

Click **"Create GitHub App"**

---

## Post-Creation Steps

### 1. Note the Client ID

After creation, you'll see the app's settings page. Copy the **Client ID** (format: `Iv1.xxxxxxxxxxxx`).

### 2. Generate Client Secret

1. Scroll to "Client secrets" section
2. Click **"Generate a new client secret"**
3. Copy the secret immediately (it won't be shown again)

### 3. Store Credentials Securely

Save these values securely:
```
GITHUB_APP_CLIENT_ID=Iv1.xxxxxxxxxxxx
GITHUB_APP_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Environment Configuration

### Netlify Environment Variables

In Netlify Dashboard → Site settings → Environment variables:

| Variable | Value |
|----------|-------|
| `GITHUB_APP_CLIENT_ID` | Your Client ID |
| `GITHUB_APP_CLIENT_SECRET` | Your Client Secret |

### Local Development

Create `web/.env`:
```env
GITHUB_APP_CLIENT_ID=Iv1.xxxxxxxxxxxx
GITHUB_APP_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
URL=http://localhost:8888
```

For local development, you may need a separate GitHub App with callback URL:
```
http://localhost:8888/api/github-auth/callback
```

---

## Verification Checklist

After setup, verify:

- [ ] App appears at: https://github.com/organizations/okstudio1/settings/apps/gitconnectpro
- [ ] Client ID and Secret are saved securely
- [ ] Netlify environment variables are set
- [ ] Device Flow works: User can sign in via device code
- [ ] App installation works: User can select repos during installation
- [ ] File read/write works: Can load and save files to GitHub

---

## Troubleshooting

### "Redirect URI mismatch" Error

- Verify callback URL matches exactly: `https://gitconnect.pro/api/github-auth/callback`
- Check for trailing slashes
- Ensure HTTPS (not HTTP) for production

### "Bad credentials" Error

- Verify Client ID and Secret are correct
- Check that secret hasn't been regenerated
- Ensure environment variables are deployed (may need redeploy)

### User Can't Install App

- Verify "Any account" is selected in app settings
- Check that app is not suspended

### Token Refresh Fails

- Verify "Expire user authorization tokens" is enabled
- Check Netlify function logs for errors

---

## Security Notes

- **Client Secret**: Never commit to git or expose in frontend code
- **Token Storage**: Access tokens stored in browser localStorage (standard practice)
- **Token Expiry**: Tokens expire and auto-refresh via Netlify function
- **Permissions**: App only accesses repos user explicitly authorizes

---

## Updating the App

To modify settings after creation:

1. Go to: https://github.com/organizations/okstudio1/settings/apps/gitconnectpro
2. Make changes
3. Click "Save changes"

> **Note**: Changing permissions may require users to re-authorize.

---

## Reference Links

- [GitHub Apps Documentation](https://docs.github.com/en/apps)
- [Creating a GitHub App](https://docs.github.com/en/apps/creating-github-apps)
- [GitHub App Permissions](https://docs.github.com/en/apps/creating-github-apps/setting-up-a-github-app/choosing-permissions-for-a-github-app)
- [User Authorization Flow](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app)
