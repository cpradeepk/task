'use client'

import { useState, useEffect } from 'react'
import { Play, Square } from 'lucide-react'
import { startTimer, stopTimer, isTimerRunning, getActiveTimer } from '@/lib/timerService'

interface TimerButtonProps {
  entityType: 'task' | 'bug'
  entityId: string
  entityTitle: string
  status?: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export default function TimerButton({
  entityType,
  entityId,
  entityTitle,
  status,
  size = 'md',
  showLabel = false
}: TimerButtonProps) {
  const [isActive, setIsActive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Statuses that should disable the timer
  const disabledStatuses = ['Done', 'Cancel', 'Hold', 'Stop']
  const isDisabled = status ? disabledStatuses.includes(status) : false

  // Check if timer is running for this entity
  useEffect(() => {
    const checkTimer = () => {
      setIsActive(isTimerRunning(entityType, entityId))
    }

    checkTimer()

    // Listen for storage events (timer changes)
    window.addEventListener('storage', checkTimer)
    
    // Also check periodically in case of same-tab changes
    const interval = setInterval(checkTimer, 1000)

    return () => {
      window.removeEventListener('storage', checkTimer)
      clearInterval(interval)
    }
  }, [entityType, entityId])

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering parent click events

    // Prevent starting timer on disabled statuses
    if (isDisabled && !isActive) {
      alert(`Cannot start timer on ${entityType} with status "${status}". Please change the status first.`)
      return
    }

    setIsLoading(true)
    try {
      if (isActive) {
        // Stop timer
        await stopTimer()
      } else {
        // Start timer (will auto-stop any other running timer)
        await startTimer(entityType, entityId, entityTitle)
      }
    } catch (error) {
      console.error('Timer action failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Size classes
  const sizeClasses = {
    sm: 'h-6 w-6 p-1',
    md: 'h-8 w-8 p-1.5',
    lg: 'h-10 w-10 p-2'
  }

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  const buttonClass = `
    ${sizeClasses[size]}
    rounded-full
    transition-all
    duration-200
    flex
    items-center
    justify-center
    ${isActive
      ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/50'
      : isDisabled
        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
        : 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg'
    }
    ${isLoading ? 'opacity-50 cursor-not-allowed' : isDisabled && !isActive ? 'cursor-not-allowed' : 'cursor-pointer'}
  `

  if (showLabel) {
    return (
      <button
        onClick={handleClick}
        disabled={isLoading || (isDisabled && !isActive)}
        className={`
          flex items-center space-x-2 px-3 py-1.5 rounded-lg
          transition-all duration-200
          ${isActive
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : isDisabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        title={
          isDisabled && !isActive
            ? `Cannot start timer - status is "${status}"`
            : isActive
              ? 'Stop timer'
              : 'Start timer'
        }
      >
        {isActive ? (
          <>
            <Square className="h-4 w-4" />
            <span className="text-sm font-medium">Stop</span>
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            <span className="text-sm font-medium">Start</span>
          </>
        )}
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading || (isDisabled && !isActive)}
      className={buttonClass}
      title={
        isDisabled && !isActive
          ? `Cannot start timer - status is "${status}"`
          : isActive
            ? 'Stop timer'
            : 'Start timer'
      }
    >
      {isActive ? (
        <Square className={iconSizeClasses[size]} />
      ) : (
        <Play className={iconSizeClasses[size]} />
      )}
    </button>
  )
}

