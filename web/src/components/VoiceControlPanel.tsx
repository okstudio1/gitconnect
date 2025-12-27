import { Mic, MicOff, Loader2, Check, X, Bot, Type, Copy, Trash2 } from 'lucide-react'

interface PendingEdit {
  code: string
  explanation: string
  line: number
}

interface VoiceControlPanelProps {
  isListening: boolean
  isConnecting: boolean
  isProcessing: boolean
  audioLevel: number
  mode: 'agent' | 'transcribe'
  transcript: string
  pendingEdit: PendingEdit | null
  error: string | null
  onToggleMic: () => void
  onToggleMode: () => void
  onAcceptEdit: () => void
  onRejectEdit: () => void
  onClearError: () => void
  onTranscriptChange: (text: string) => void
  onClearTranscript: () => void
}

export function VoiceControlPanel({
  isListening,
  isConnecting,
  isProcessing,
  audioLevel,
  mode,
  transcript,
  pendingEdit,
  error,
  onToggleMic,
  onToggleMode,
  onAcceptEdit,
  onRejectEdit,
  onClearError,
  onTranscriptChange,
  onClearTranscript
}: VoiceControlPanelProps) {
  const copyTranscript = async () => {
    if (transcript) {
      await navigator.clipboard.writeText(transcript)
    }
  }
  return (
    <div className="w-72 bg-slate-800 border-l border-slate-700 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700">
        <h2 className="text-sm font-medium text-slate-300">Voice Controls</h2>
      </div>

      {/* Mode Toggle */}
      <div className="px-4 py-3 border-b border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500 uppercase tracking-wide">Mode</span>
        </div>
        <button
          onClick={onToggleMode}
          className={`
            w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all
            ${mode === 'agent' 
              ? 'bg-purple-600/20 border border-purple-500/50 text-purple-300' 
              : 'bg-blue-600/20 border border-blue-500/50 text-blue-300'}
          `}
        >
          {mode === 'agent' ? (
            <>
              <Bot size={18} />
              <span className="text-sm font-medium">Agent Mode</span>
            </>
          ) : (
            <>
              <Type size={18} />
              <span className="text-sm font-medium">Dictation Mode</span>
            </>
          )}
        </button>
        <p className="mt-2 text-xs text-slate-500 text-center">
          {mode === 'agent' 
            ? 'AI interprets and generates code' 
            : 'Direct speech-to-text input'}
        </p>
      </div>

      {/* Mic Button */}
      <div className="px-4 py-6 flex flex-col items-center">
        <div className="relative">
          {/* Audio level rings - only show when listening */}
          {isListening && (
            <>
              <div 
                className="absolute inset-0 rounded-full bg-red-500/30 transition-transform duration-75"
                style={{ 
                  transform: `scale(${1 + audioLevel * 0.5})`,
                  opacity: audioLevel * 0.8
                }}
              />
              <div 
                className="absolute inset-0 rounded-full bg-red-500/20 transition-transform duration-100"
                style={{ 
                  transform: `scale(${1 + audioLevel * 0.8})`,
                  opacity: audioLevel * 0.5
                }}
              />
              <div 
                className="absolute inset-0 rounded-full bg-red-500/10 transition-transform duration-150"
                style={{ 
                  transform: `scale(${1 + audioLevel * 1.2})`,
                  opacity: audioLevel * 0.3
                }}
              />
            </>
          )}
          <button
            onClick={onToggleMic}
            disabled={isConnecting}
            className={`
              relative z-10 flex items-center justify-center w-20 h-20 rounded-full transition-all
              ${isListening 
                ? 'bg-red-500 hover:bg-red-600 active:bg-red-700' 
                : mode === 'agent' 
                  ? 'bg-purple-500 hover:bg-purple-600 active:bg-purple-700'
                  : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700'}
              ${isConnecting ? 'opacity-50' : ''}
              shadow-lg active:scale-95
            `}
          >
            {isConnecting ? (
              <Loader2 size={32} className="text-white animate-spin" />
            ) : isListening ? (
              <MicOff size={32} className="text-white" />
            ) : (
              <Mic size={32} className="text-white" />
            )}
          </button>
        </div>
        <span className="mt-3 text-xs text-slate-500">
          {isConnecting ? 'Connecting...' : isListening ? 'Listening...' : 'Tap to speak'}
        </span>
        {/* Audio level indicator bar */}
        {isListening && (
          <div className="mt-2 w-16 h-1 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-red-500 transition-all duration-75 rounded-full"
              style={{ width: `${audioLevel * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Status / Transcript */}
      <div className="flex-1 px-4 py-3 overflow-y-auto">
        {error && (
          <div className="mb-3 p-2 bg-red-900/30 border border-red-700/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs text-red-400">{error}</span>
              <button onClick={onClearError} className="text-red-400 hover:text-red-300">
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {pendingEdit ? (
          <div className="space-y-3">
            <div className="text-xs text-green-400 uppercase tracking-wide flex items-center gap-1">
              ✨ Generated Code
            </div>
            <div className="text-xs text-slate-400">{pendingEdit.explanation}</div>
            <pre className="text-xs text-slate-300 bg-slate-900 p-2 rounded overflow-x-auto max-h-32">
              {pendingEdit.code}
            </pre>
            <div className="flex gap-2">
              <button
                onClick={onAcceptEdit}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-sm text-white"
              >
                <Check size={16} /> Accept
              </button>
              <button
                onClick={onRejectEdit}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-slate-600 hover:bg-slate-700 rounded text-sm text-white"
              >
                <X size={16} /> Reject
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-slate-500 uppercase tracking-wide">
                {isProcessing ? '⚡ Generating...' : isListening ? '🎤 Listening...' : 'Transcript'}
              </div>
              {transcript && !isListening && (
                <div className="flex gap-1">
                  <button
                    onClick={copyTranscript}
                    className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded"
                    title="Copy transcript"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={onClearTranscript}
                    className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded"
                    title="Clear transcript"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
            {isProcessing ? (
              <span className="text-blue-400 flex items-center gap-2 text-sm">
                <Loader2 size={14} className="animate-spin" /> Processing with Claude...
              </span>
            ) : transcript ? (
              <textarea
                value={transcript}
                onChange={(e) => onTranscriptChange(e.target.value)}
                className="flex-1 w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-300 resize-none focus:outline-none focus:border-slate-500 min-h-[80px]"
                placeholder="Speak to see transcript here..."
                disabled={isListening}
              />
            ) : (
              <div className="text-sm text-slate-500 italic min-h-[60px]">
                Speak to see transcript here...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 border-t border-slate-700">
        <p className="text-[10px] text-slate-600 text-center">
          Voice powered by Deepgram • AI by Claude
        </p>
      </div>
    </div>
  )
}
