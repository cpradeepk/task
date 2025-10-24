import { ReactNode } from 'react'
import LoadingSpinner from './LoadingSpinner'

interface LoadingCardProps {
  children: ReactNode
  isLoading?: boolean
  loadingMessage?: string
  className?: string
  minHeight?: string
}

export default function LoadingCard({
  children,
  isLoading = false,
  loadingMessage = 'Loading...',
  className = '',
  minHeight = 'h-32'
}: LoadingCardProps) {
  if (isLoading) {
    return (
      <div className={`relative bg-white rounded-lg border border-gray-200 ${minHeight} ${className}`}>
        <LoadingSpinner 
          size="md" 
          message={loadingMessage} 
          center 
          overlay 
        />
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {children}
    </div>
  )
}
