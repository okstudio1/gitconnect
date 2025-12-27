# GitHub Menu Design Document

**Status**: Proposed  
**Priority**: Medium  
**Complexity**: High

This document outlines the design for a full-featured GitHub operations menu, enabling multi-file commits, staging, branching, and voice-controlled Git workflows.

---

## Goals

1. **Multi-file tracking** — Track changes across multiple files before committing
2. **Staging area** — Review and select which changes to include in a commit
3. **AI commit messages** — Auto-generate commit messages from diffs ✅ (Implemented)
4. **Voice commands** — "Stage all", "Commit changes", "Generate commit message"
5. **Branch support** — Create branches, switch branches, view branch list
6. **Diff viewer** — See what changed before committing

---

## UI Design

### GitHub Panel (Right sidebar or modal)

```
┌─────────────────────────────────────┐
│ 🔀 GitHub                     [×]   │
├─────────────────────────────────────┤
│ Branch: main ▾        [+ New Branch]│
├─────────────────────────────────────┤
│ CHANGES (3)                         │
│ ┌─────────────────────────────────┐ │
│ │ ☑ M  src/App.tsx           [⊖] │ │
│ │ ☑ A  src/utils/helper.ts   [⊖] │ │
│ │ ☐ M  README.md             [⊖] │ │
│ └─────────────────────────────────┘ │
│ [Stage All] [Unstage All]           │
├─────────────────────────────────────┤
│ STAGED (2)                          │
│ ┌─────────────────────────────────┐ │
│ │   M  src/App.tsx                │ │
│ │   A  src/utils/helper.ts        │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ Commit Message:                     │
│ ┌─────────────────────────────────┐ │
│ │ feat: add helper utilities  [✨]│ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Commit & Push]                     │
└─────────────────────────────────────┘

Legend:
  M = Modified
  A = Added (new file)
  D = Deleted
  ☑ = Staged
  ☐ = Unstaged
  [⊖] = View diff
  [✨] = Generate AI message
```

---

## Technical Implementation

### 1. Change Tracking State

Track all modified files in app state:

```typescript
interface FileChange {
  path: string
  originalContent: string
  currentContent: string
  originalSha: string | null  // null for new files
  status: 'modified' | 'added' | 'deleted'
  staged: boolean
}

const [changes, setChanges] = useState<Map<string, FileChange>>(new Map())
```

### 2. Multi-File Commits with Git Data API

The Contents API only supports single-file commits. For multi-file commits, use GitHub's **Git Data API**:

```
1. Get current commit SHA (HEAD)
2. Get the tree SHA from that commit
3. Create new blobs for each changed file
4. Create a new tree with the updated blobs
5. Create a new commit pointing to the new tree
6. Update the branch ref to point to the new commit
```

**API Calls**:
```typescript
// 1. Get current commit
const ref = await fetch(`/repos/${owner}/${repo}/git/refs/heads/${branch}`)
const commitSha = ref.object.sha

// 2. Get tree
const commit = await fetch(`/repos/${owner}/${repo}/git/commits/${commitSha}`)
const treeSha = commit.tree.sha

// 3. Create blobs for each file
const blobs = await Promise.all(files.map(async (file) => {
  const blob = await fetch(`/repos/${owner}/${repo}/git/blobs`, {
    method: 'POST',
    body: JSON.stringify({ content: file.content, encoding: 'utf-8' })
  })
  return { path: file.path, sha: blob.sha, mode: '100644', type: 'blob' }
}))

// 4. Create new tree
const newTree = await fetch(`/repos/${owner}/${repo}/git/trees`, {
  method: 'POST',
  body: JSON.stringify({ base_tree: treeSha, tree: blobs })
})

// 5. Create commit
const newCommit = await fetch(`/repos/${owner}/${repo}/git/commits`, {
  method: 'POST',
  body: JSON.stringify({
    message: commitMessage,
    tree: newTree.sha,
    parents: [commitSha]
  })
})

// 6. Update ref
await fetch(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
  method: 'PATCH',
  body: JSON.stringify({ sha: newCommit.sha })
})
```

### 3. Branch Support

```typescript
// List branches
const branches = await fetch(`/repos/${owner}/${repo}/branches`)

// Create branch
await fetch(`/repos/${owner}/${repo}/git/refs`, {
  method: 'POST',
  body: JSON.stringify({
    ref: `refs/heads/${newBranchName}`,
    sha: currentCommitSha
  })
})

// Switch branch (update app state, reload files)
const switchBranch = (branchName: string) => {
  setCurrentBranch(branchName)
  // Clear cached files
  // Reload current file from new branch
}
```

### 4. Diff Generation

Use a diff library like `diff` or `jsdiff` to show changes:

```typescript
import { diffLines } from 'diff'

const generateDiff = (original: string, modified: string) => {
  return diffLines(original, modified).map(part => ({
    type: part.added ? 'add' : part.removed ? 'remove' : 'unchanged',
    value: part.value
  }))
}
```

---

## Voice Commands

Add these commands to the Agent mode prompt:

| Voice Command | Action |
|--------------|--------|
| "Stage this file" | Stage current file |
| "Stage all changes" | Stage all modified files |
| "Unstage all" | Unstage all files |
| "Generate commit message" | AI generates message from staged changes |
| "Commit changes" | Commit staged files with current message |
| "Commit and push" | Same as above (push is automatic) |
| "Create branch [name]" | Create and switch to new branch |
| "Switch to branch [name]" | Switch to existing branch |
| "Show changes" | Open GitHub panel |
| "Discard changes" | Revert current file to original |

**Implementation**:

Update the Claude system prompt to recognize Git commands and return appropriate actions:

```typescript
const systemPrompt = `...existing prompt...

You can also handle Git operations. Return JSON with action type:
{
  "action": "git",
  "operation": "stage" | "unstage" | "commit" | "branch" | "discard",
  "target": "current" | "all" | "filename",
  "message": "commit message if applicable",
  "branchName": "branch name if applicable"
}
`
```

---

## State Management

### New State Structure

```typescript
// App.tsx additions
const [gitPanelOpen, setGitPanelOpen] = useState(false)
const [currentBranch, setCurrentBranch] = useState('main')
const [branches, setBranches] = useState<string[]>([])
const [fileChanges, setFileChanges] = useState<Map<string, FileChange>>(new Map())

// Track changes when editing
const handleCodeChange = (value: string) => {
  setCode(value)
  
  // Update change tracking
  setFileChanges(prev => {
    const updated = new Map(prev)
    const existing = updated.get(currentFile.path)
    
    if (value === originalCode) {
      // No changes, remove from tracking
      updated.delete(currentFile.path)
    } else {
      updated.set(currentFile.path, {
        path: currentFile.path,
        originalContent: originalCode,
        currentContent: value,
        originalSha: currentFile.sha,
        status: currentFile.sha ? 'modified' : 'added',
        staged: existing?.staged || false
      })
    }
    
    return updated
  })
}
```

---

## New Components

### 1. GitPanel Component

```typescript
// components/GitPanel.tsx
interface GitPanelProps {
  changes: Map<string, FileChange>
  currentBranch: string
  branches: string[]
  onStage: (path: string) => void
  onUnstage: (path: string) => void
  onStageAll: () => void
  onCommit: (message: string) => void
  onBranchSwitch: (branch: string) => void
  onBranchCreate: (name: string) => void
  onViewDiff: (path: string) => void
  onGenerateMessage: () => void
}
```

### 2. DiffViewer Component

```typescript
// components/DiffViewer.tsx
interface DiffViewerProps {
  original: string
  modified: string
  filename: string
  onClose: () => void
}
```

---

## Implementation Phases

### Phase 1: Change Tracking (1-2 days)
- [ ] Add `fileChanges` state to App.tsx
- [ ] Track changes when editing files
- [ ] Show "unsaved" indicator per file
- [ ] Warn before navigating away with unsaved changes

### Phase 2: Git Panel UI (2-3 days)
- [ ] Create GitPanel component
- [ ] Show list of changed files
- [ ] Add stage/unstage checkboxes
- [ ] Integrate AI commit message (already done)

### Phase 3: Multi-File Commits (2-3 days)
- [ ] Implement Git Data API for multi-file commits
- [ ] Create `useGitOperations` hook
- [ ] Handle commit errors and conflicts

### Phase 4: Diff Viewer (1-2 days)
- [ ] Add `diff` library
- [ ] Create DiffViewer component
- [ ] Syntax highlighting for diffs

### Phase 5: Branch Support (2-3 days)
- [ ] List branches
- [ ] Branch switching
- [ ] Create new branches
- [ ] Update UI to show current branch

### Phase 6: Voice Commands (1-2 days)
- [ ] Update Claude system prompt
- [ ] Handle Git action responses
- [ ] Test voice workflow

---

## Dependencies

```json
{
  "diff": "^5.1.0"  // For generating diffs
}
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Git Data API complexity | Start with single-file, add multi-file later |
| Lost changes on navigation | Add "unsaved changes" warning modal |
| Merge conflicts | Show error message, suggest manual resolution on GitHub |
| API rate limits | Cache aggressively, batch operations |

---

## Success Metrics

- Users can commit multiple files in one commit
- Voice command "commit changes" works end-to-end
- < 5 seconds to commit after clicking button
- Zero data loss from accidental navigation
