# GitHub Integration Guide

This document explains how GitConnect integrates with GitHub, including authentication, file operations, and the commit workflow.

---

## Overview

GitConnect uses **GitHub's REST API** to browse, edit, and commit files directly to repositories. There is no local file storage — everything is synced with GitHub in real-time.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   GitConnect    │────▶│   GitHub API    │────▶│   Repository    │
│   (Browser)     │◀────│   (REST)        │◀────│   (Remote)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Authentication

### GitHub App + Device Flow

GitConnect uses a **GitHub App** (GitConnectPro) with Device Flow authentication:

1. User clicks "Sign in"
2. App displays a code and GitHub URL
3. User enters code at github.com/login/device
4. App polls for authorization
5. Once authorized, app receives access token
6. Token stored in `localStorage`

**Why Device Flow?**
- Works on mobile without redirect issues
- No server-side session management needed
- User can authenticate on a different device

### Token Storage

```javascript
// Token stored in browser localStorage
localStorage.setItem('github_token', token)

// Retrieved for API calls
const token = localStorage.getItem('github_token')
```

**Security Note**: Token only has access to repos the user has granted via GitHub App installation.

---

## File Operations

### How Files Are Loaded

When you select a file in the browser:

```
1. User clicks file in FileBrowser
2. App calls GitHub Contents API: GET /repos/{owner}/{repo}/contents/{path}
3. GitHub returns file content (base64 encoded) + SHA
4. App decodes content and displays in editor
5. SHA is stored for later updates
```

**Code** (`useGitHub.ts`):
```typescript
const loadFile = async (path: string) => {
  const file = await fetchApi(`/repos/${owner}/${repo}/contents/${path}`)
  const content = decodeBase64(file.content)
  return { content, sha: file.sha, path: file.path }
}
```

### The SHA Explained

Every file in GitHub has a **SHA hash** that identifies its current version:
- When you load a file, you get its current SHA
- When you save/commit, you must provide the SHA you loaded
- If someone else changed the file, the SHA won't match = conflict

This prevents accidentally overwriting changes made by others.

---

## Commit Workflow

### Current Implementation: Direct Commit

GitConnect uses GitHub's **Contents API** which combines stage + commit + push into one operation:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Edit in    │────▶│   Click      │────▶│   GitHub     │
│   Browser    │     │   Commit     │     │   Updated    │
└──────────────┘     └──────────────┘     └──────────────┘
         │                   │
         │                   ▼
         │           PUT /repos/{owner}/{repo}/contents/{path}
         │           {
         │             "message": "commit message",
         │             "content": base64(new_content),
         │             "sha": original_sha
         │           }
         │
         ▼
   Changes exist only in browser memory until committed
```

**Key Points**:
1. There is **no local staging area** — changes exist only in browser state
2. **Save = Commit** — clicking Commit pushes directly to GitHub
3. **One file at a time** — Contents API only supports single-file commits
4. **No branching** — commits go to the default branch

### Code Example

```typescript
const saveFile = async (path, content, sha, message) => {
  await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message,                    // Commit message
      content: btoa(content),     // Base64 encoded content
      sha                         // SHA of the file we loaded (for conflict detection)
    })
  })
}
```

---

## What Happens to New Files?

### Creating a New File

When you create a new file (one that doesn't exist in the repo):

1. File has `sha: null` (no existing version)
2. When you commit, GitHub creates the file
3. After commit, you get the new file's SHA

```typescript
// For new files, don't include sha in the request
body: JSON.stringify({
  message: "Add new file",
  content: btoa(content)
  // No sha = create new file
})
```

### Unsaved Changes Warning

Currently, if you:
- Close the browser tab
- Navigate to a different file
- Switch repos

**Your changes are lost** unless you committed them first.

---

## Limitations of Current Approach

| Limitation | Description |
|------------|-------------|
| Single file commits | Can't commit multiple files at once |
| No staging | No way to review changes before committing |
| No branching | Always commits to default branch |
| No diff view | Can't see what changed before committing |
| No conflict resolution | If SHA doesn't match, commit fails |
| No offline support | Requires internet connection |

---

## API Reference

### Endpoints Used

| Operation | Endpoint | Method |
|-----------|----------|--------|
| List repos | `/user/repos` | GET |
| List files | `/repos/{owner}/{repo}/contents/{path}` | GET |
| Load file | `/repos/{owner}/{repo}/contents/{path}` | GET |
| Save/Create file | `/repos/{owner}/{repo}/contents/{path}` | PUT |

### Rate Limits

- **Authenticated**: 5,000 requests/hour
- **Per-repo cache**: 5 minute TTL to reduce API calls

---

## Future Improvements

See `GITHUB_MENU_DESIGN.md` for planned enhancements including:
- Multi-file commits
- Staging area
- Branch support
- Diff viewer
- Conflict resolution
