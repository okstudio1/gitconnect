import { useState, useEffect, useRef } from 'react'
import { Github, ExternalLink, Loader2, CheckCircle, XCircle, Copy, Check, Settings } from 'lucide-react'

const GITHUB_APP_INSTALL_URL = 'https://github.com/apps/gitconnectpro/installations/new'

interface DeviceFlowLoginProps {
  onSuccess: (token: string) => void
  onCancel: () => void
}

interface DeviceFlowState {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
}

export function DeviceFlowLogin({ onSuccess, onCancel }: DeviceFlowLoginProps) {
  const [state, setState] = useState<'install' | 'init' | 'waiting' | 'success' | 'error'>('install')
  const [deviceFlow, setDeviceFlow] = useState<DeviceFlowState | null>(null)
  const [copied, setCopied] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [timeLeft, setTimeLeft] = useState(0)
  const pollingRef = useRef<number | null>(null)
  const timerRef = useRef<number | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const proceedToDeviceFlow = () => {
    setState('init')
    startDeviceFlow()
  }

  const startDeviceFlow = async () => {
    try {
      console.log('[DeviceFlow] Starting device flow...')
      const response = await fetch('/api/github-auth/device', { method: 'POST' })
      const data = await response.json()
      console.log('[DeviceFlow] Got device data:', data)

      if (data.error) {
        setErrorMessage(data.error)
        setState('error')
        return
      }

      // Store device code for polling
      const deviceCode = data.device_code
      console.log('[DeviceFlow] Device code:', deviceCode)
      
      setDeviceFlow(data)
      setTimeLeft(data.expires_in)
      setState('waiting')

      // Start countdown timer
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev: number) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current)
            if (pollingRef.current) clearInterval(pollingRef.current)
            setErrorMessage('Code expired. Please try again.')
            setState('error')
            return 0
          }
          return prev - 1
        })
      }, 1000)

      // Start polling for authorization
      const pollInterval = (data.interval || 5) * 1000
      console.log('[DeviceFlow] Starting polling every', pollInterval, 'ms')
      
      // Poll immediately once, then set up interval
      pollForToken(deviceCode)
      
      pollingRef.current = window.setInterval(() => {
        pollForToken(deviceCode)
      }, pollInterval)

    } catch (err) {
      setErrorMessage('Failed to start authentication')
      setState('error')
    }
  }

  const pollForToken = async (deviceCode: string) => {
    try {
      console.log('[DeviceFlow] Polling for token...')
      const response = await fetch('/api/github-auth/device/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_code: deviceCode })
      })

      const data = await response.json()
      console.log('[DeviceFlow] Poll response:', data)

      if (data.error) {
        if (data.error === 'authorization_pending') {
          // Still waiting - continue polling
          return
        }
        if (data.error === 'slow_down') {
          // Need to slow down - handled by interval already
          return
        }
        if (data.error === 'expired_token') {
          if (pollingRef.current) clearInterval(pollingRef.current)
          setErrorMessage('Code expired. Please try again.')
          setState('error')
          return
        }
        if (data.error === 'access_denied') {
          if (pollingRef.current) clearInterval(pollingRef.current)
          setErrorMessage('Authorization denied')
          setState('error')
          return
        }
        // Unknown error
        if (pollingRef.current) clearInterval(pollingRef.current)
        setErrorMessage(data.error_description || data.error)
        setState('error')
        return
      }

      // Success!
      console.log('[DeviceFlow] Success! Token received')
      if (pollingRef.current) clearInterval(pollingRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
      setState('success')
      
      // Save token and notify parent
      localStorage.setItem('github_token', data.access_token)
      setTimeout(() => onSuccess(data.access_token), 1000)

    } catch (err) {
      // Network error - continue polling
      console.error('Poll error:', err)
    }
  }

  const copyCode = async () => {
    if (deviceFlow?.user_code) {
      await navigator.clipboard.writeText(deviceFlow.user_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const openGitHub = () => {
    if (deviceFlow?.verification_uri) {
      window.open(deviceFlow.verification_uri, '_blank')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const retry = () => {
    setState('init')
    setErrorMessage('')
    setDeviceFlow(null)
    startDeviceFlow()
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl max-w-sm w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700 flex items-center gap-3">
          <Github size={24} className="text-white" />
          <span className="font-semibold text-white">Sign in with GitHub</span>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {state === 'install' && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700 flex items-center justify-center">
                  <Settings size={32} className="text-blue-400" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">First, install GitConnectPro</h3>
                <p className="text-sm text-slate-400">
                  Choose which repositories GitConnect can access. You can change this anytime.
                </p>
              </div>

              <a
                href={GITHUB_APP_INSTALL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white font-medium"
              >
                <Github size={18} />
                <span>Install on GitHub</span>
                <ExternalLink size={14} />
              </a>

              <div className="text-center">
                <p className="text-xs text-slate-500 mb-3">Already installed?</p>
                <button
                  onClick={proceedToDeviceFlow}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Continue to sign in →
                </button>
              </div>
            </div>
          )}

          {state === 'init' && (
            <div className="flex flex-col items-center py-8">
              <Loader2 size={32} className="text-blue-400 animate-spin" />
              <p className="mt-4 text-slate-400">Initializing...</p>
            </div>
          )}

          {state === 'waiting' && deviceFlow && (
            <div className="space-y-6">
              {/* Instructions */}
              <div className="text-center">
                <p className="text-sm text-slate-400 mb-2">
                  Open GitHub and enter this code:
                </p>
                
                {/* Code display */}
                <button
                  onClick={copyCode}
                  className="group relative inline-flex items-center gap-2 px-6 py-3 bg-slate-900 rounded-lg border-2 border-slate-600 hover:border-blue-500 transition-colors"
                >
                  <span className="text-2xl font-mono font-bold text-white tracking-wider">
                    {deviceFlow.user_code}
                  </span>
                  {copied ? (
                    <Check size={20} className="text-green-400" />
                  ) : (
                    <Copy size={20} className="text-slate-500 group-hover:text-blue-400" />
                  )}
                </button>
                
                {copied && (
                  <p className="mt-2 text-xs text-green-400">Copied to clipboard!</p>
                )}
              </div>

              {/* Open GitHub button */}
              <button
                onClick={openGitHub}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white font-medium"
              >
                <ExternalLink size={18} />
                <span>Open github.com/login/device</span>
              </button>

              {/* Status */}
              <div className="flex items-center justify-center gap-2 text-sm">
                <Loader2 size={16} className="text-blue-400 animate-spin" />
                <span className="text-slate-400">Waiting for authorization...</span>
              </div>

              {/* Timer */}
              <div className="text-center">
                <p className="text-xs text-slate-500">
                  Code expires in {formatTime(timeLeft)}
                </p>
              </div>
            </div>
          )}

          {state === 'success' && (
            <div className="flex flex-col items-center py-8">
              <CheckCircle size={48} className="text-green-400" />
              <p className="mt-4 text-white font-medium">Successfully authenticated!</p>
              <p className="mt-1 text-sm text-slate-400">Redirecting...</p>
            </div>
          )}

          {state === 'error' && (
            <div className="flex flex-col items-center py-6">
              <XCircle size={48} className="text-red-400" />
              <p className="mt-4 text-white font-medium">Authentication failed</p>
              <p className="mt-1 text-sm text-slate-400 text-center">{errorMessage}</p>
              <button
                onClick={retry}
                className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white"
              >
                Try again
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {state !== 'success' && (
          <div className="px-6 py-4 border-t border-slate-700">
            <button
              onClick={onCancel}
              className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
