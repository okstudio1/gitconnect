import { useState, useEffect, useRef } from 'react'
import { LogOut, Github, Key, ExternalLink, Bot } from 'lucide-react'

export const CLAUDE_MODELS = [
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Balanced performance' },
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: 'Most capable' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fastest & cheapest' },
] as const

export type ClaudeModelId = typeof CLAUDE_MODELS[number]['id']

interface UserSettingsProps {
  user: { login: string; avatar_url: string; name: string | null } | null
  onLogout: () => void
}

export function UserSettings({ user, onLogout }: UserSettingsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showApiKeys, setShowApiKeys] = useState(false)
  const [deepgramKey, setDeepgramKey] = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')
  const [claudeModel, setClaudeModel] = useState<ClaudeModelId>('claude-sonnet-4-20250514')
  const [showModelSelector, setShowModelSelector] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDeepgramKey(localStorage.getItem('deepgram_api_key') || '')
    setAnthropicKey(localStorage.getItem('anthropic_api_key') || '')
    const savedModel = localStorage.getItem('claude_model') as ClaudeModelId | null
    if (savedModel && CLAUDE_MODELS.some(m => m.id === savedModel)) {
      setClaudeModel(savedModel)
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const saveApiKeys = () => {
    if (deepgramKey) {
      localStorage.setItem('deepgram_api_key', deepgramKey)
    } else {
      localStorage.removeItem('deepgram_api_key')
    }
    if (anthropicKey) {
      localStorage.setItem('anthropic_api_key', anthropicKey)
    } else {
      localStorage.removeItem('anthropic_api_key')
    }
    setShowApiKeys(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('deepgram_api_key')
    localStorage.removeItem('anthropic_api_key')
    onLogout()
    setIsOpen(false)
  }

  if (!user) return null

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-700 transition-colors"
      >
        <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full" />
              <div>
                <div className="font-medium text-white">{user.name || user.login}</div>
                <div className="text-sm text-slate-400">@{user.login}</div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <a
              href="https://github.com/apps/gitconnectpro/installations/select_target"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700 transition-colors text-slate-300"
            >
              <Github size={18} />
              <span className="flex-1">Manage Repository Access</span>
              <ExternalLink size={14} className="text-slate-500" />
            </a>

            <button
              onClick={() => setShowApiKeys(!showApiKeys)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700 transition-colors text-slate-300"
            >
              <Key size={18} />
              <span className="flex-1 text-left">API Keys</span>
              <span className="text-xs text-slate-500">
                {deepgramKey && anthropicKey ? '✓ Set' : 'Configure'}
              </span>
            </button>

            <button
              onClick={() => setShowModelSelector(!showModelSelector)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700 transition-colors text-slate-300"
            >
              <Bot size={18} />
              <span className="flex-1 text-left">Claude Model</span>
              <span className="text-xs text-slate-500">
                {CLAUDE_MODELS.find(m => m.id === claudeModel)?.name || 'Sonnet 4'}
              </span>
            </button>

            {showModelSelector && (
              <div className="px-4 py-3 bg-slate-900 border-y border-slate-700">
                <div className="text-xs text-slate-400 mb-2">Select Claude Model for Agent Mode</div>
                <div className="space-y-1">
                  {CLAUDE_MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setClaudeModel(model.id)
                        localStorage.setItem('claude_model', model.id)
                        setShowModelSelector(false)
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm transition-colors ${
                        claudeModel === model.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <span>{model.name}</span>
                      <span className="text-xs opacity-70">{model.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showApiKeys && (
              <div className="px-4 py-3 bg-slate-900 border-y border-slate-700">
                <div className="mb-3">
                  <label className="block text-xs text-slate-400 mb-1">
                    Deepgram API Key
                    <a 
                      href="https://console.deepgram.com/signup" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-2 text-blue-400 hover:underline"
                    >
                      Get key →
                    </a>
                  </label>
                  <input
                    type="password"
                    value={deepgramKey}
                    onChange={(e) => setDeepgramKey(e.target.value)}
                    placeholder="Enter Deepgram API key"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="mb-3">
                  <label className="block text-xs text-slate-400 mb-1">
                    Anthropic API Key
                    <a 
                      href="https://console.anthropic.com/account/keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-2 text-blue-400 hover:underline"
                    >
                      Get key →
                    </a>
                  </label>
                  <input
                    type="password"
                    value={anthropicKey}
                    onChange={(e) => setAnthropicKey(e.target.value)}
                    placeholder="Enter Anthropic API key"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveApiKeys}
                    className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white"
                  >
                    Save Keys
                  </button>
                  <button
                    onClick={() => setShowApiKeys(false)}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm text-white"
                  >
                    Cancel
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Keys are stored locally in your browser. Never sent to our servers.
                </p>
              </div>
            )}

            <div className="border-t border-slate-700 mt-1 pt-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700 transition-colors text-red-400"
              >
                <LogOut size={18} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
