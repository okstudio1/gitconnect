import { useState, useEffect } from 'react'

interface OrientationState {
  isLandscape: boolean
  width: number
  height: number
}

export function useOrientation(): OrientationState {
  const [state, setState] = useState<OrientationState>(() => ({
    isLandscape: typeof window !== 'undefined' ? window.innerWidth >= 768 && window.innerWidth > window.innerHeight : false,
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  }))

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      // Consider landscape if width >= 768px AND wider than tall
      const isLandscape = width >= 768 && width > height
      setState({ isLandscape, width, height })
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    
    // Initial check
    handleResize()

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])

  return state
}
