'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { ClientTaskWarningService } from '@/lib/clientTaskWarning'

interface TaskWarningAlertProps {
  employeeId: string
  onWarningProcessed?: (hasWarning: boolean, count: number) => void
}

export default function TaskWarningAlert({ employeeId, onWarningProcessed }: TaskWarningAlertProps) {
  const [warning, setWarning] = useState<{
    hasWarning: boolean
    warningCount: number
    message?: string
  } | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const checkTaskWarning = useCallback(async () => {
    try {
      setIsLoading(true)
      const result = await ClientTaskWarningService.processTaskWarning(employeeId)
      setWarning(result)
      setIsVisible(result.hasWarning)

      if (onWarningProcessed) {
        onWarningProcessed(result.hasWarning, result.warningCount)
      }
    } catch (error) {
      console.error('Error checking task warning:', error)
      setWarning(null)
      setIsVisible(false)
    } finally {
      setIsLoading(false)
    }
  }, [employeeId, onWarningProcessed])

  useEffect(() => {
    checkTaskWarning()
  }, [checkTaskWarning])

  const dismissWarning = () => {
    setIsVisible(false)
  }

  if (isLoading) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-3"></div>
          <span className="text-yellow-800 text-sm">Checking task status...</span>
        </div>
      </div>
    )
  }

  if (!warning || !warning.hasWarning || !isVisible) {
    return null
  }

  const getAlertColor = (count: number) => {
    if (count <= 2) return 'yellow'
    if (count <= 4) return 'orange'
    return 'red'
  }

  const color = getAlertColor(warning.warningCount)
  const colorClasses = {
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: 'text-yellow-600',
      button: 'text-yellow-600 hover:text-yellow-800'
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-800',
      icon: 'text-orange-600',
      button: 'text-orange-600 hover:text-orange-800'
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: 'text-red-600',
      button: 'text-red-600 hover:text-red-800'
    }
  }

  const classes = colorClasses[color]

  return (
    <div className={`${classes.bg} ${classes.border} border rounded-lg p-4 mb-6 transition-all duration-300`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <AlertTriangle className={`h-5 w-5 ${classes.icon} mt-0.5 mr-3 flex-shrink-0`} />
          <div className="flex-1">
            <h3 className={`text-sm font-medium ${classes.text} mb-1`}>
              Task Warning #{warning.warningCount}
            </h3>
            <p className={`text-sm ${classes.text}`}>
              {warning.message}
            </p>
            <div className="mt-3">
              <button
                onClick={() => window.location.href = '/tasks/create'}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
              >
                Create Task Now
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={dismissWarning}
          className={`${classes.button} hover:bg-white hover:bg-opacity-20 rounded-md p-1 transition-colors`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
