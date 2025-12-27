import { useState, useRef, useCallback } from 'react'

interface UseDeepgramOptions {
  onTranscript: (text: string, isFinal: boolean) => void
  apiKey?: string
  useProxy?: boolean
  githubId?: string
}

export function useDeepgram({ onTranscript, apiKey, useProxy, githubId }: UseDeepgramOptions) {
  const [isListening, setIsListening] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  
  const socketRef = useRef<WebSocket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const getApiKey = async (): Promise<string | null> => {
    // If using proxy (Pro subscriber), fetch key from server
    if (useProxy && githubId) {
      console.log('Pro user - fetching managed Deepgram key for github_id:', githubId)
      try {
        const response = await fetch('/api/deepgram-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ github_id: githubId })
        })
        
        if (response.status === 402) {
          // Subscription required - fall back to user key
          console.log('Subscription required for managed keys')
          return null
        }
        
        if (!response.ok) {
          const errorData = await response.json()
          console.error('Deepgram proxy error:', response.status, errorData)
          return null
        }
        
        const data = await response.json()
        if (data.apiKey) {
          console.log('Got managed Deepgram key successfully')
          return data.apiKey
        }
      } catch (error) {
        console.error('Failed to get proxy key:', error)
      }
    }
    
    // Fall back to user-provided key
    console.log('Using user-provided Deepgram key')
    return apiKey || localStorage.getItem('deepgram_api_key')
  }

  const startListening = useCallback(async () => {
    let finalKey = await getApiKey()
    
    if (!finalKey) {
      const userKey = prompt('Enter your Deepgram API key:')
      if (!userKey) return
      localStorage.setItem('deepgram_api_key', userKey)
      finalKey = userKey
    }
    
    if (!finalKey) return

    setIsConnecting(true)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      })
      streamRef.current = stream

      const socket = new WebSocket(
        `wss://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true&endpointing=300`,
        ['token', finalKey]
      )

      socket.onopen = () => {
        console.log('Deepgram connected')
        setIsConnecting(false)
        setIsListening(true)

        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        })

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(event.data)
          }
        }

        mediaRecorder.start(250)
        mediaRecorderRef.current = mediaRecorder
      }

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        const transcript = data.channel?.alternatives?.[0]?.transcript
        if (transcript) {
          onTranscript(transcript, data.is_final)
        }
      }

      socket.onerror = (error) => {
        console.error('Deepgram error:', error)
        setIsConnecting(false)
        setIsListening(false)
      }

      socket.onclose = () => {
        console.log('Deepgram disconnected')
        setIsListening(false)
      }

      socketRef.current = socket

    } catch (error) {
      console.error('Failed to start listening:', error)
      setIsConnecting(false)
    }
  }, [apiKey, onTranscript, useProxy, githubId])

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (socketRef.current) {
      socketRef.current.close()
      socketRef.current = null
    }

    setIsListening(false)
  }, [])

  return {
    isListening,
    isConnecting,
    startListening,
    stopListening
  }
}
