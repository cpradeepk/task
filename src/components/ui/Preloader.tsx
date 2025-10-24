'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface PreloaderProps {
  isLoading: boolean
  message?: string
  showProgress?: boolean
}

export default function Preloader({ 
  isLoading, 
  message = 'Loading...', 
  showProgress = false 
}: PreloaderProps) {
  const [progress, setProgress] = useState(0)
  const [dots, setDots] = useState('')

  useEffect(() => {
    if (!isLoading) return

    // Animate dots
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)

    // Simulate progress if enabled
    if (showProgress) {
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev
          return prev + Math.random() * 10
        })
      }, 200)

      return () => {
        clearInterval(dotsInterval)
        clearInterval(progressInterval)
      }
    }

    return () => clearInterval(dotsInterval)
  }, [isLoading, showProgress])

  useEffect(() => {
    if (!isLoading) {
      setProgress(100)
      setTimeout(() => setProgress(0), 500)
    }
  }, [isLoading])

  if (!isLoading) return null

  return (
    <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
      <div className="text-center space-y-6 animate-fade-in">
        {/* Logo/Brand */}
        <div className="mb-8">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto animate-bounce-in">
            <span className="text-black font-bold text-xl">E</span>
          </div>
          <h1 className="text-2xl font-bold text-black mt-4">EassyLife</h1>
        </div>

        {/* Loading spinner */}
        <div className="flex items-center justify-center space-x-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-lg text-gray-700 font-medium">
            {message}{dots}
          </span>
        </div>

        {/* Progress bar */}
        {showProgress && (
          <div className="w-64 mx-auto">
            <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">{Math.round(progress)}%</p>
          </div>
        )}

        {/* Loading tips */}
        <div className="text-sm text-gray-500 max-w-md mx-auto">
          <p>Setting up your workspace...</p>
        </div>
      </div>
    </div>
  )
}
