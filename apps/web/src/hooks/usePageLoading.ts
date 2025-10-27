'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useLoading } from '@/contexts/LoadingContext'

interface UsePageLoadingOptions {
  minLoadingTime?: number
  showGlobalLoading?: boolean
  loadingMessage?: string
}

export function usePageLoading(options: UsePageLoadingOptions = {}) {
  const {
    minLoadingTime = 300,
    showGlobalLoading = false,
    loadingMessage = 'Loading...'
  } = options

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  
  const { showGlobalLoading: showGlobal, hideGlobalLoading: hideGlobal } = useLoading()

  const startLoading = useCallback(() => {
    setIsLoading(true)
    setError(null)
    startTimeRef.current = Date.now()
    
    if (showGlobalLoading) {
      showGlobal(loadingMessage)
    }
  }, [showGlobalLoading, loadingMessage, showGlobal])

  const stopLoading = useCallback(() => {
    const elapsed = Date.now() - startTimeRef.current
    const remainingTime = Math.max(0, minLoadingTime - elapsed)

    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current)
    }

    loadingTimeoutRef.current = setTimeout(() => {
      setIsLoading(false)
      if (showGlobalLoading) {
        hideGlobal()
      }
    }, remainingTime)
  }, [minLoadingTime, showGlobalLoading, hideGlobal])

  const setLoadingError = useCallback((errorMessage: string) => {
    setError(errorMessage)
    stopLoading()
  }, [stopLoading])

  const executeWithLoading = useCallback(async <T>(
    asyncFunction: () => Promise<T>
  ): Promise<T | null> => {
    try {
      startLoading()
      const result = await asyncFunction()
      stopLoading()
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setLoadingError(errorMessage)
      return null
    }
  }, [startLoading, stopLoading, setLoadingError])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }
      if (showGlobalLoading) {
        hideGlobal()
      }
    }
  }, [showGlobalLoading, hideGlobal])

  return {
    isLoading,
    error,
    startLoading,
    stopLoading,
    setLoadingError,
    executeWithLoading,
    clearError: () => setError(null)
  }
}
