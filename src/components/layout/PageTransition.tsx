'use client'

import { ReactNode, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

interface PageTransitionProps {
  children: ReactNode
}

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [displayChildren, setDisplayChildren] = useState(children)

  useEffect(() => {
    // Start transition
    setIsTransitioning(true)
    
    // Small delay to show transition effect
    const timer = setTimeout(() => {
      setDisplayChildren(children)
      setIsTransitioning(false)
    }, 150)

    return () => clearTimeout(timer)
  }, [pathname, children])

  return (
    <div className="relative min-h-screen">
      {/* Transition overlay */}
      {isTransitioning && (
        <div className="fixed inset-0 bg-white z-40 animate-fade-in" />
      )}
      
      {/* Page content */}
      <div 
        className={`transition-all duration-300 ${
          isTransitioning 
            ? 'opacity-0 transform translate-y-2' 
            : 'opacity-100 transform translate-y-0'
        }`}
      >
        {displayChildren}
      </div>
    </div>
  )
}
