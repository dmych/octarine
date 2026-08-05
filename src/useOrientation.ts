import { useState, useEffect } from 'react'

export function useOrientation() {
  const [isLandscape, setIsLandscape] = useState(() => {
    return window.innerWidth > window.innerHeight
  })

  useEffect(() => {
    const handleResize = () => {
      setIsLandscape(window.innerWidth > window.innerHeight)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])

  return isLandscape
}
