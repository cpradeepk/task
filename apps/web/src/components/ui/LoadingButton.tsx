import { ReactNode } from 'react'
import LoadingSpinner from './LoadingSpinner'

interface LoadingButtonProps {
  children: ReactNode
  isLoading?: boolean
  loadingText?: string
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  className?: string
  variant?: 'primary' | 'secondary' | 'danger' | 'outline'
}

export default function LoadingButton({
  children,
  isLoading = false,
  loadingText,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  variant = 'primary'
}: LoadingButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variantClasses = {
    primary: 'bg-primary hover:bg-primary-600 text-black border border-primary-600 shadow-sm hover:shadow-md',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300 shadow-sm hover:shadow-md',
    danger: 'bg-red-600 hover:bg-red-700 text-white border border-red-600 shadow-sm hover:shadow-md',
    outline: 'bg-transparent hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm hover:shadow-md'
  }

  const isDisabled = disabled || isLoading

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {isLoading && <LoadingSpinner size="sm" />}
      {isLoading && loadingText ? <span>{loadingText}</span> : children}
    </button>
  )
}
