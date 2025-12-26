import { useState, useCallback } from 'react'

interface CodeEdit {
  action: 'insert' | 'replace' | 'delete'
  position?: { line: number }
  range?: { startLine: number; endLine: number }
  code: string
  explanation: string
}

interface UseClaudeOptions {
  onCodeGenerated: (edit: CodeEdit) => void
  onError: (error: string) => void
  useProxy?: boolean
  githubId?: string
}

export function useClaude({ onCodeGenerated, onError, useProxy, githubId }: UseClaudeOptions) {
  const [isProcessing, setIsProcessing] = useState(false)

  const generateCode = useCallback(async (
    transcript: string,
    context: {
      fileContent: string
      cursorLine: number
      language: string
      fileName: string
    }
  ) => {
    // Check if using proxy (Pro subscriber)
    const shouldUseProxy = useProxy && githubId
    
    let apiKey = localStorage.getItem('anthropic_api_key')
    
    if (!shouldUseProxy && !apiKey) {
      const userKey = prompt('Enter your Anthropic API key:')
      if (!userKey) {
        onError('API key required')
        return
      }
      localStorage.setItem('anthropic_api_key', userKey)
      apiKey = userKey
    }

    setIsProcessing(true)

    const systemPrompt = `You are a code assistant. The user will speak a request and you will modify their code.

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{
  "action": "insert" | "replace",
  "position": { "line": <line_number> },
  "code": "<the code to insert/replace>",
  "explanation": "<brief explanation>"
}

For "insert": Add new code at the specified line.
For "replace": Replace code starting at position.line.

Keep code minimal and focused on what was requested.`

    const userMessage = `Voice request: "${transcript}"

Current file: ${context.fileName}
Language: ${context.language}
Cursor at line: ${context.cursorLine}

Current code:
\`\`\`${context.language}
${context.fileContent}
\`\`\`

Generate the code modification as JSON.`

    try {
      let response: Response

      // Get user's preferred model from localStorage
      const selectedModel = localStorage.getItem('claude_model') || 'claude-sonnet-4-20250514'

      if (shouldUseProxy) {
        // Use proxy endpoint for Pro subscribers
        response = await fetch('/api/claude-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            github_id: githubId,
            system: systemPrompt,
            messages: [{ role: 'user', content: userMessage }],
            model: selectedModel,
            max_tokens: 2048
          })
        })
      } else {
        // Direct API call with user's key
        response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey!,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: selectedModel,
            max_tokens: 2048,
            system: systemPrompt,
            messages: [{ role: 'user', content: userMessage }]
          })
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'API request failed')
      }

      const data = await response.json()
      const content = data.content[0]?.text

      if (!content) {
        throw new Error('No response from Claude')
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Could not parse response')
      }

      const edit: CodeEdit = JSON.parse(jsonMatch[0])
      onCodeGenerated(edit)

    } catch (error) {
      console.error('Claude error:', error)
      onError(error instanceof Error ? error.message : 'Failed to generate code')
    } finally {
      setIsProcessing(false)
    }
  }, [onCodeGenerated, onError])

  return {
    isProcessing,
    generateCode
  }
}
