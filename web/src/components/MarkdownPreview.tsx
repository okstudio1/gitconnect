import ReactMarkdown from 'react-markdown'

interface MarkdownPreviewProps {
  content: string
  className?: string
}

export function MarkdownPreview({ content, className = '' }: MarkdownPreviewProps) {
  return (
    <div className={`prose prose-invert prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h1 className="text-2xl font-bold text-white mb-4 pb-2 border-b border-slate-700">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-semibold text-white mt-6 mb-3">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-medium text-white mt-4 mb-2">{children}</h3>,
          h4: ({ children }) => <h4 className="text-base font-medium text-slate-200 mt-3 mb-2">{children}</h4>,
          p: ({ children }) => <p className="text-slate-300 mb-4 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc list-inside text-slate-300 mb-4 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside text-slate-300 mb-4 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="text-slate-300">{children}</li>,
          a: ({ href, children }) => (
            <a href={href} className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          code: ({ className, children }) => {
            const isInline = !className
            if (isInline) {
              return <code className="bg-slate-700 text-pink-400 px-1.5 py-0.5 rounded text-sm">{children}</code>
            }
            return (
              <code className="block bg-slate-900 p-4 rounded-lg text-sm overflow-x-auto text-slate-300">
                {children}
              </code>
            )
          },
          pre: ({ children }) => <pre className="bg-slate-900 rounded-lg mb-4 overflow-x-auto">{children}</pre>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-slate-600 pl-4 italic text-slate-400 my-4">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-slate-700 my-6" />,
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full border-collapse border border-slate-700">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border border-slate-700 bg-slate-800 px-3 py-2 text-left text-white">{children}</th>,
          td: ({ children }) => <td className="border border-slate-700 px-3 py-2 text-slate-300">{children}</td>,
          img: ({ src, alt }) => (
            <img src={src} alt={alt || ''} className="max-w-full h-auto rounded-lg my-4" />
          ),
          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
          em: ({ children }) => <em className="italic text-slate-300">{children}</em>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
