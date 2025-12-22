import { useState, useRef, useCallback, ReactNode } from 'react'

interface ResizablePanelsProps {
  left: ReactNode
  center: ReactNode
  right: ReactNode
  leftMinWidth?: number
  rightMinWidth?: number
  leftDefaultWidth?: number
  rightDefaultWidth?: number
}

export function ResizablePanels({
  left,
  center,
  right,
  leftMinWidth = 200,
  rightMinWidth = 280,
  leftDefaultWidth = 280,
  rightDefaultWidth = 320
}: ResizablePanelsProps) {
  const [leftWidth, setLeftWidth] = useState(leftDefaultWidth)
  const [rightWidth, setRightWidth] = useState(rightDefaultWidth)
  const containerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef<'left' | 'right' | null>(null)

  const handleMouseDown = useCallback((side: 'left' | 'right') => {
    draggingRef.current = side
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingRef.current || !containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    
    if (draggingRef.current === 'left') {
      const newWidth = e.clientX - containerRect.left
      if (newWidth >= leftMinWidth && newWidth <= containerRect.width - rightWidth - 200) {
        setLeftWidth(newWidth)
      }
    } else if (draggingRef.current === 'right') {
      const newWidth = containerRect.right - e.clientX
      if (newWidth >= rightMinWidth && newWidth <= containerRect.width - leftWidth - 200) {
        setRightWidth(newWidth)
      }
    }
  }, [leftWidth, rightWidth, leftMinWidth, rightMinWidth])

  const handleMouseUp = useCallback(() => {
    draggingRef.current = null
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  return (
    <div 
      ref={containerRef}
      className="flex h-full"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Left Panel */}
      <div style={{ width: leftWidth, minWidth: leftMinWidth }} className="flex-shrink-0">
        {left}
      </div>

      {/* Left Divider */}
      <div
        className="w-1 bg-slate-700 hover:bg-blue-500 cursor-col-resize transition-colors flex-shrink-0"
        onMouseDown={() => handleMouseDown('left')}
      />

      {/* Center Panel */}
      <div className="flex-1 min-w-0">
        {center}
      </div>

      {/* Right Divider */}
      <div
        className="w-1 bg-slate-700 hover:bg-blue-500 cursor-col-resize transition-colors flex-shrink-0"
        onMouseDown={() => handleMouseDown('right')}
      />

      {/* Right Panel */}
      <div style={{ width: rightWidth, minWidth: rightMinWidth }} className="flex-shrink-0">
        {right}
      </div>
    </div>
  )
}
