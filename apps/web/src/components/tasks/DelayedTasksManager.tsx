'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, RefreshCw, Clock, CheckCircle } from 'lucide-react'

interface DelayedTasksSummary {
  totalDelayed: number
  newlyDelayed: number
  delayedTasks: any[]
}

interface UpdateResult {
  updated: number
  tasks: Array<{
    taskId: string
    description: string
    endDate: string
    previousStatus: string
    newStatus: string
  }>
}

export default function DelayedTasksManager() {
  const [summary, setSummary] = useState<DelayedTasksSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<UpdateResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSummary()
  }, [])

  const loadSummary = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      const response = await fetch('/api/tasks/update-delayed')
      const data = await response.json()
      
      if (data.success) {
        setSummary(data.data)
      } else {
        setError(data.error || 'Failed to load delayed tasks summary')
      }
    } catch (err) {
      setError('Failed to load delayed tasks summary')
      console.error('Error loading delayed tasks summary:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const updateDelayedTasks = async () => {
    try {
      setIsUpdating(true)
      setError('')
      
      const response = await fetch('/api/tasks/update-delayed', {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.success) {
        setLastUpdate(data.data)
        // Reload summary after update
        await loadSummary()
      } else {
        setError(data.error || 'Failed to update delayed tasks')
      }
    } catch (err) {
      setError('Failed to update delayed tasks')
      console.error('Error updating delayed tasks:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          <span className="text-gray-600">Loading delayed tasks...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <h3 className="text-lg font-semibold text-black">Delayed Tasks Management</h3>
          </div>
          <button
            onClick={updateDelayedTasks}
            disabled={isUpdating}
            className="btn-primary flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? 'Updating...' : 'Update Delayed Tasks'}</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Clock className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold text-red-700">{summary.totalDelayed}</p>
                  <p className="text-sm text-red-600">Total Delayed Tasks</p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold text-orange-700">{summary.newlyDelayed}</p>
                  <p className="text-sm text-orange-600">Need Status Update</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold text-blue-700">
                    {summary.totalDelayed - summary.newlyDelayed}
                  </p>
                  <p className="text-sm text-blue-600">Already Marked</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Last Update Results */}
      {lastUpdate && (
        <div className="card">
          <h4 className="text-md font-semibold text-black mb-3">Last Update Results</h4>
          {lastUpdate.updated > 0 ? (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                <p className="font-medium">✅ Successfully updated {lastUpdate.updated} tasks to delayed status</p>
              </div>
              
              <div className="space-y-2">
                <h5 className="font-medium text-black">Updated Tasks:</h5>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {lastUpdate.tasks.map((task, index) => (
                    <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-black">{task.taskId}</p>
                          <p className="text-sm text-gray-600 truncate">{task.description}</p>
                          <p className="text-xs text-gray-500">End Date: {task.endDate}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">
                            {task.previousStatus} → <span className="text-red-600 font-medium">Delayed</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
              <p>ℹ️ No tasks needed to be updated to delayed status</p>
            </div>
          )}
        </div>
      )}

      {/* Information */}
      <div className="card bg-blue-50 border border-blue-200">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-blue-500 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-2">How Delayed Task Detection Works:</p>
            <ul className="space-y-1 text-xs">
              <li>• Tasks are automatically checked when task lists are loaded</li>
              <li>• Tasks are marked as &quot;Delayed&quot; only AFTER their end date has passed</li>
              <li>• Tasks due today are NOT considered overdue until tomorrow</li>
              <li>• Only tasks with status &quot;Yet to Start&quot;, &quot;In Progress&quot;, &quot;Hold&quot;, or &quot;ReOpened&quot; are affected</li>
              <li>• Completed, Cancelled, Stopped, or already Delayed tasks are not changed</li>
              <li>• You can manually trigger an update using the button above</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
