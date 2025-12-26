import { useMemo } from 'react'
import Papa from 'papaparse'

interface CSVPreviewProps {
  content: string
  className?: string
}

// Rainbow colors similar to RainbowCSV extension
const COLUMN_COLORS = [
  'text-red-400',
  'text-orange-400', 
  'text-yellow-400',
  'text-green-400',
  'text-cyan-400',
  'text-blue-400',
  'text-purple-400',
  'text-pink-400',
  'text-rose-400',
  'text-amber-400',
  'text-lime-400',
  'text-teal-400',
]

const HEADER_COLORS = [
  'bg-red-900/30 text-red-300',
  'bg-orange-900/30 text-orange-300',
  'bg-yellow-900/30 text-yellow-300',
  'bg-green-900/30 text-green-300',
  'bg-cyan-900/30 text-cyan-300',
  'bg-blue-900/30 text-blue-300',
  'bg-purple-900/30 text-purple-300',
  'bg-pink-900/30 text-pink-300',
  'bg-rose-900/30 text-rose-300',
  'bg-amber-900/30 text-amber-300',
  'bg-lime-900/30 text-lime-300',
  'bg-teal-900/30 text-teal-300',
]

function getColumnColor(index: number, isHeader: boolean = false): string {
  const colors = isHeader ? HEADER_COLORS : COLUMN_COLORS
  return colors[index % colors.length]
}

export function CSVPreview({ content, className = '' }: CSVPreviewProps) {
  const { data, headers, error } = useMemo(() => {
    if (!content.trim()) {
      return { data: [], headers: [], error: null }
    }

    try {
      const result = Papa.parse<string[]>(content, {
        header: false,
        skipEmptyLines: true,
        dynamicTyping: false,
      })

      if (result.errors.length > 0) {
        return { 
          data: [], 
          headers: [], 
          error: result.errors[0].message 
        }
      }

      const rows = result.data as string[][]
      if (rows.length === 0) {
        return { data: [], headers: [], error: null }
      }

      // First row as headers
      const headers = rows[0] || []
      const data = rows.slice(1)

      return { data, headers, error: null }
    } catch (e) {
      return { 
        data: [], 
        headers: [], 
        error: e instanceof Error ? e.message : 'Failed to parse CSV' 
      }
    }
  }, [content])

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-red-400 bg-red-900/20 border border-red-800 rounded-lg p-4">
          <span className="font-medium">Parse Error:</span> {error}
        </div>
      </div>
    )
  }

  if (headers.length === 0) {
    return (
      <div className={`p-4 text-slate-400 ${className}`}>
        No data to display
      </div>
    )
  }

  return (
    <div className={`overflow-auto ${className}`}>
      <div className="mb-3 flex items-center gap-4 text-xs text-slate-500">
        <span>{headers.length} columns</span>
        <span>{data.length} rows</span>
      </div>
      
      <table className="w-full border-collapse text-sm font-mono">
        <thead className="sticky top-0">
          <tr>
            <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-500 bg-slate-800 border-b border-slate-700 w-12">
              #
            </th>
            {headers.map((header, colIndex) => (
              <th
                key={colIndex}
                className={`px-3 py-1.5 text-left font-semibold border-b border-slate-700 ${getColumnColor(colIndex, true)}`}
              >
                {header || `Column ${colIndex + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr 
              key={rowIndex} 
              className="hover:bg-slate-800/50 transition-colors"
            >
              <td className="px-2 py-1 text-xs text-slate-600 border-b border-slate-800">
                {rowIndex + 1}
              </td>
              {headers.map((_, colIndex) => (
                <td
                  key={colIndex}
                  className={`px-3 py-1 border-b border-slate-800 ${getColumnColor(colIndex)}`}
                >
                  {row[colIndex] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {data.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          CSV file contains only headers
        </div>
      )}
    </div>
  )
}
