'use client'

import { useState, useEffect } from 'react'
import FloatingTimer from './FloatingTimer'
import { getActiveTimer } from '@/lib/timerService'

/**
 * TimerProvider Component
 * 
 * Wraps the application and shows the FloatingTimer when a timer is active.
 * Listens for storage events to show/hide the timer automatically.
 */
export default function TimerProvider({ children }: { children: React.ReactNode }) {
  const [showTimer, setShowTimer] = useState(false)

  useEffect(() => {
    // Check if there's an active timer on mount
    const checkTimer = () => {
      const timer = getActiveTimer()
      setShowTimer(!!timer)
    }

    checkTimer()

    // Listen for storage events (timer changes)
    const handleStorageChange = () => {
      checkTimer()
    }

    window.addEventListener('storage', handleStorageChange)
    
    // Also check periodically in case of same-tab changes
    const interval = setInterval(checkTimer, 1000)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  return (
    <>
      {children}
      {showTimer && <FloatingTimer onClose={() => setShowTimer(false)} />}
    </>
  )
}

