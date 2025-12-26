import { useState, useCallback, useEffect } from 'react'

interface RepoFile {
  name: string
  path: string
  type: 'file' | 'dir'
  sha?: string
}

interface FileContent {
  content: string
  sha: string
  path: string
}

interface GitHubUser {
  id: number
  login: string
  avatar_url: string
  name: string | null
  email: string | null
}

interface UseGitHubOptions {
  onError: (error: string) => void
  onLogout?: () => void
}

// Cache for file listings to avoid repeated API calls
const fileCache = new Map<string, { data: RepoFile[]; timestamp: number }>()
const CACHE_TTL = 60000 // 1 minute cache

export function useGitHub({ onError, onLogout }: UseGitHubOptions) {
  const [isLoading, setIsLoading] = useState(false)
  const [currentRepo, setCurrentRepo] = useState<{ owner: string; repo: string } | null>(null)
  const [user, setUser] = useState<GitHubUser | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Check for token on mount (from URL or localStorage)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tokenFromUrl = params.get('token')
    const errorFromUrl = params.get('error')

    if (errorFromUrl) {
      onError(`GitHub login failed: ${errorFromUrl}`)
      window.history.replaceState({}, '', '/')
      return
    }

    if (tokenFromUrl) {
      localStorage.setItem('github_token', tokenFromUrl)
      window.history.replaceState({}, '', '/')
    }

    const token = localStorage.getItem('github_token')
    if (token) {
      fetchUser(token)
    }
  }, [])

  const fetchUser = async (token: string) => {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        setIsAuthenticated(true)
      } else {
        localStorage.removeItem('github_token')
        setIsAuthenticated(false)
      }
    } catch {
      localStorage.removeItem('github_token')
      setIsAuthenticated(false)
    }
  }

  const [showDeviceFlow, setShowDeviceFlow] = useState(false)

  const login = useCallback(async () => {
    // Use Device Flow for better mobile experience
    setShowDeviceFlow(true)
  }, [])

  const loginWithRedirect = useCallback(async () => {
    // Fallback: traditional OAuth redirect flow
    setIsLoading(true)
    try {
      const response = await fetch('/api/github-auth/login')
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      onError('Failed to initiate GitHub login')
    } finally {
      setIsLoading(false)
    }
  }, [onError])

  const handleDeviceFlowSuccess = useCallback((token: string) => {
    setShowDeviceFlow(false)
    fetchUser(token)
  }, [])

  const handleDeviceFlowCancel = useCallback(() => {
    setShowDeviceFlow(false)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('github_token')
    setUser(null)
    setIsAuthenticated(false)
    setCurrentRepo(null)
    // Clear the file cache
    fileCache.clear()
    // Call the onLogout callback to let the app clear its state
    if (onLogout) onLogout()
  }, [onLogout])

  const getToken = useCallback(() => {
    return localStorage.getItem('github_token')
  }, [])

  const fetchApi = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const token = getToken()
    if (!token) throw new Error('GitHub token required')

    const response = await fetch(`https://api.github.com${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'GitHub API error')
    }

    return response.json()
  }, [getToken])

  const listRepos = useCallback(async (): Promise<Array<{ full_name: string; private: boolean }>> => {
    setIsLoading(true)
    try {
      const repos = await fetchApi('/user/repos?sort=updated&per_page=20')
      return repos.map((r: any) => ({ full_name: r.full_name, private: r.private }))
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to list repos')
      return []
    } finally {
      setIsLoading(false)
    }
  }, [fetchApi, onError])

  const selectRepo = useCallback((fullName: string) => {
    const [owner, repo] = fullName.split('/')
    setCurrentRepo({ owner, repo })
  }, [])

  const listFiles = useCallback(async (path: string = ''): Promise<RepoFile[]> => {
    if (!currentRepo) return []
    
    // Check cache first
    const cacheKey = `${currentRepo.owner}/${currentRepo.repo}/${path}`
    const cached = fileCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data
    }
    
    setIsLoading(true)
    try {
      const contents = await fetchApi(`/repos/${currentRepo.owner}/${currentRepo.repo}/contents/${path}`)
      if (Array.isArray(contents)) {
        const files: RepoFile[] = contents.map((item: any) => ({
          name: item.name,
          path: item.path,
          type: (item.type === 'dir' ? 'dir' : 'file') as 'file' | 'dir',
          sha: item.sha
        })).sort((a, b) => {
          // Sort: directories first, then files, alphabetically
          if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
          return a.name.localeCompare(b.name)
        })
        
        // Cache the result
        fileCache.set(cacheKey, { data: files, timestamp: Date.now() })
        return files
      }
      return []
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to list files')
      return []
    } finally {
      setIsLoading(false)
    }
  }, [currentRepo, fetchApi, onError])

  const loadFile = useCallback(async (path: string): Promise<FileContent | null> => {
    if (!currentRepo) return null
    setIsLoading(true)
    try {
      const file = await fetchApi(`/repos/${currentRepo.owner}/${currentRepo.repo}/contents/${path}`)
      const content = atob(file.content.replace(/\n/g, ''))
      return {
        content,
        sha: file.sha,
        path: file.path
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to load file')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [currentRepo, fetchApi, onError])

  const saveFile = useCallback(async (
    path: string, 
    content: string, 
    sha: string | null,
    message: string = 'Update via GitConnect'
  ): Promise<boolean> => {
    if (!currentRepo) return false
    setIsLoading(true)
    try {
      await fetchApi(`/repos/${currentRepo.owner}/${currentRepo.repo}/contents/${path}`, {
        method: 'PUT',
        body: JSON.stringify({
          message,
          content: btoa(content),
          sha: sha || undefined
        })
      })
      return true
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to save file')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [currentRepo, fetchApi, onError])

  return {
    isLoading,
    isAuthenticated,
    user,
    currentRepo,
    login,
    loginWithRedirect,
    logout,
    listRepos,
    selectRepo,
    listFiles,
    loadFile,
    saveFile,
    // Device Flow
    showDeviceFlow,
    handleDeviceFlowSuccess,
    handleDeviceFlowCancel
  }
}
