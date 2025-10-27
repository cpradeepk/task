'use client'

import React, { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react'
import { Loader2 } from 'lucide-react'

interface LoadingContextType {
  isLoading: boolean
  loadingMessage: string
  setLoading: (loading: boolean, message?: string) => void
  showGlobalLoading: (message?: string) => void
  hideGlobalLoading: () => void
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

export function useLoading() {
  const context = useContext(LoadingContext)
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider')
  }
  return context
}

interface LoadingProviderProps {
  children: ReactNode
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const setLoading = useCallback((loading: boolean, message: string = '') => {
    setIsLoading(loading)
    setLoadingMessage(message)
  }, [])

  const showGlobalLoading = useCallback((message: string = 'Loading...') => {
    setIsLoading(true)
    setLoadingMessage(message)

    // Auto-hide after 30 seconds to prevent stuck loading states
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current)
    }
    loadingTimeoutRef.current = setTimeout(() => {
      setIsLoading(false)
    }, 30000)
  }, [])

  const hideGlobalLoading = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current)
      loadingTimeoutRef.current = null
    }
    setIsLoading(false)
    setLoadingMessage('')
  }, [])

  return (
    <LoadingContext.Provider
      value={{
        isLoading,
        loadingMessage,
        setLoading,
        showGlobalLoading,
        hideGlobalLoading
      }}
    >
      {children}
      {isLoading && <GlobalLoadingOverlay message={loadingMessage} />}
    </LoadingContext.Provider>
  )
}

interface GlobalLoadingOverlayProps {
  message: string
}

function GlobalLoadingOverlay({ message }: GlobalLoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center transition-all duration-300 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center space-y-4 max-w-sm mx-4 animate-scale-in border border-gray-100">
        <div className="relative">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="absolute inset-0 h-10 w-10 rounded-full border-2 border-primary/20"></div>
        </div>
        <div className="text-center">
          <p className="text-gray-800 font-semibold text-lg">{message}</p>
          <p className="text-gray-500 text-sm mt-1">Please wait...</p>
        </div>
      </div>
    </div>
  )
}
