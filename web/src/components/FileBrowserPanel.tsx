import { useState, useEffect } from 'react'
import { Folder, File, ChevronLeft, ChevronRight, Loader2, Github, LogIn } from 'lucide-react'

interface RepoFile {
  name: string
  path: string
  type: 'file' | 'dir'
}

interface FileBrowserPanelProps {
  currentRepo: { owner: string; repo: string } | null
  isLoading: boolean
  isAuthenticated: boolean
  onLogin: () => void
  onSelectRepo: (fullName: string) => void
  onSelectFile: (path: string) => void
  listRepos: () => Promise<Array<{ full_name: string; private: boolean }>>
  listFiles: (path?: string) => Promise<RepoFile[]>
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function FileBrowserPanel({
  currentRepo,
  isLoading,
  isAuthenticated,
  onLogin,
  onSelectRepo,
  onSelectFile,
  listRepos,
  listFiles,
  collapsed = false,
  onToggleCollapse
}: FileBrowserPanelProps) {
  const [repos, setRepos] = useState<Array<{ full_name: string; private: boolean }>>([])
  const [files, setFiles] = useState<RepoFile[]>([])
  const [currentPath, setCurrentPath] = useState('')
  const [view, setView] = useState<'repos' | 'files'>('repos')

  useEffect(() => {
    if (view === 'repos' && repos.length === 0 && isAuthenticated) {
      listRepos().then(setRepos)
    }
  }, [view, repos.length, listRepos, isAuthenticated])

  useEffect(() => {
    if (currentRepo && view === 'files') {
      listFiles(currentPath).then(setFiles)
    }
  }, [currentRepo, currentPath, view, listFiles])

  useEffect(() => {
    if (currentRepo) {
      setView('files')
      setCurrentPath('')
    }
  }, [currentRepo])

  const handleSelectRepo = (fullName: string) => {
    onSelectRepo(fullName)
    setCurrentPath('')
    setView('files')
  }

  const handleSelectItem = (item: RepoFile) => {
    if (item.type === 'dir') {
      setCurrentPath(item.path)
    } else {
      onSelectFile(item.path)
    }
  }

  const handleBack = () => {
    if (currentPath) {
      const parts = currentPath.split('/')
      parts.pop()
      setCurrentPath(parts.join('/'))
    } else {
      setView('repos')
    }
  }

  if (collapsed) {
    return (
      <div className="w-10 bg-slate-800 border-r border-slate-700 flex flex-col items-center py-2">
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-slate-700 rounded transition-colors"
          title="Expand file browser"
        >
          <ChevronRight size={18} className="text-slate-400" />
        </button>
        <div className="mt-4">
          <Folder size={18} className="text-slate-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
        <div className="flex items-center gap-2 min-w-0">
          {(view === 'files' || currentPath) && (
            <button onClick={handleBack} className="p-1 hover:bg-slate-700 rounded flex-shrink-0">
              <ChevronLeft size={16} />
            </button>
          )}
          <span className="text-sm font-medium truncate">
            {view === 'repos' ? 'Repositories' : currentRepo?.repo}
          </span>
        </div>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 hover:bg-slate-700 rounded flex-shrink-0"
            title="Collapse"
          >
            <ChevronLeft size={16} className="text-slate-400" />
          </button>
        )}
      </div>

      {/* Path breadcrumb */}
      {view === 'files' && currentPath && (
        <div className="px-3 py-1.5 text-xs text-slate-500 border-b border-slate-700 truncate">
          /{currentPath}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-slate-400" size={20} />
          </div>
        ) : view === 'repos' ? (
          !isAuthenticated ? (
            <div className="px-4 py-8 text-center">
              <Github size={32} className="mx-auto text-slate-500 mb-3" />
              <p className="text-sm text-slate-400 mb-3">Sign in to access repos</p>
              <button
                onClick={onLogin}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
              >
                <LogIn size={14} />
                <span>Sign in</span>
              </button>
            </div>
          ) : (
            <div className="py-1">
              {repos.map((repo) => (
                <button
                  key={repo.full_name}
                  onClick={() => handleSelectRepo(repo.full_name)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 active:bg-slate-600 text-left text-sm"
                >
                  <Github size={14} className="text-slate-400 flex-shrink-0" />
                  <span className="truncate">{repo.full_name}</span>
                  {repo.private && (
                    <span className="text-[10px] bg-slate-600 px-1 rounded flex-shrink-0">🔒</span>
                  )}
                </button>
              ))}
              {repos.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-slate-500">
                  No repositories found
                </div>
              )}
            </div>
          )
        ) : (
          <div className="py-1">
            {files.map((file) => (
              <button
                key={file.path}
                onClick={() => handleSelectItem(file)}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-700 active:bg-slate-600 text-left text-sm"
              >
                {file.type === 'dir' ? (
                  <Folder size={14} className="text-blue-400 flex-shrink-0" />
                ) : (
                  <File size={14} className="text-slate-400 flex-shrink-0" />
                )}
                <span className="truncate">{file.name}</span>
              </button>
            ))}
            {files.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                Empty directory
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
