interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  message?: string
  center?: boolean
  overlay?: boolean
}

export default function LoadingSpinner({
  size = 'md',
  className = '',
  message,
  center = false,
  overlay = false
}: LoadingSpinnerProps) {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  }

  const spinner = (
    <div className={`flex ${center ? 'items-center justify-center' : ''} ${overlay ? 'flex-col space-y-2' : ''}`}>
      <div className={`loading-spinner ${sizeClasses[size]} ${className}`} />
      {message && (
        <p className={`text-gray-600 ${size === 'xs' || size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          {message}
        </p>
      )}
    </div>
  )

  if (overlay) {
    return (
      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
        {spinner}
      </div>
    )
  }

  if (center) {
    return (
      <div className="flex items-center justify-center py-8">
        {spinner}
      </div>
    )
  }

  return spinner
}
