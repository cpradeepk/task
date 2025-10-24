'use client'

import { useState, useEffect } from 'react'
import { Task } from '@/lib/types'
import { getTaskUpdateOptions } from '@/lib/data'

import { optimizedDataService } from '@/lib/optimizedDataService'
import { getUserNameByEmployeeId } from '@/lib/auth'
import { X, Save, Clock, MessageSquare, AlertCircle } from 'lucide-react'
import {
  addHoursToDate,
  getHoursForDate,
  calculateTotalHours,
  getTodayDate,
  formatDateForTracking
} from '@/lib/dailyHours'

// Component to handle async user name fetching
function UserName({ employeeId }: { employeeId: string }) {
  const [name, setName] = useState<string>(employeeId)

  useEffect(() => {
    getUserNameByEmployeeId(employeeId).then(setName)
  }, [employeeId])

  return <span>{name}</span>
}

// Component to handle async support team names
function SupportTeam({ supportIds }: { supportIds: string[] }) {
  const [names, setNames] = useState<string[]>(supportIds)

  useEffect(() => {
    Promise.all(supportIds.map(id => getUserNameByEmployeeId(id)))
      .then(setNames)
  }, [supportIds])

  return <span>{names.join(', ')}</span>
}

interface TaskUpdateModalProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export default function TaskUpdateModal({ task, isOpen, onClose, onUpdate }: TaskUpdateModalProps) {
  const [formData, setFormData] = useState({
    status: '',
    remarks: '', // This will now be for additional remarks only
    actualHours: '',
    additionalHours: '', // New field for adding hours
    difficulties: '', // This will now be for additional difficulties only
    newRemarks: '', // New field for additional remarks
    newDifficulties: '' // New field for additional difficulties
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { statuses } = getTaskUpdateOptions()

  useEffect(() => {
    if (task) {
      setFormData({
        status: task.status,
        remarks: task.remarks || '', // Keep existing remarks for display
        actualHours: task.actualHours?.toString() || '',
        additionalHours: '', // Reset additional hours when modal opens
        difficulties: task.difficulties || '', // Keep existing difficulties for display
        newRemarks: '', // Reset new remarks when modal opens
        newDifficulties: '' // Reset new difficulties when modal opens
      })
    }
  }, [task])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!task) return

    setIsLoading(true)
    setError('')

    try {
      // Get today's date for tracking daily hours
      const todayDate = getTodayDate()

      // Calculate daily hours: add additional hours to today's existing hours
      const additionalHours = formData.additionalHours ? parseFloat(formData.additionalHours) : 0

      // Validate additional hours input
      if (formData.additionalHours && (isNaN(additionalHours) || additionalHours < 0)) {
        throw new Error('Please enter a valid number for additional hours')
      }

      // Basic validation for positive hours
      if (additionalHours < 0) {
        throw new Error('Additional hours must be a positive number')
      }

      // Update daily hours tracking (add to today's hours)
      let updatedDailyHours = task.dailyHours || '{}'
      if (additionalHours > 0) {
        updatedDailyHours = addHoursToDate(task.dailyHours, todayDate, additionalHours)
      }

      // Calculate new total hours from all daily hours
      const finalTotalHours = calculateTotalHours(updatedDailyHours)

      // Prepare additive remarks and difficulties with timestamps
      const currentDate = new Date().toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })

      // Build final remarks (existing + new with timestamp)
      let finalRemarks = task.remarks || ''
      if (formData.newRemarks?.trim()) {
        const newRemarkEntry = `[${currentDate}] ${formData.newRemarks.trim()}`
        finalRemarks = finalRemarks
          ? `${finalRemarks}\n\n${newRemarkEntry}`
          : newRemarkEntry
      }

      // Build final difficulties (existing + new with timestamp)
      let finalDifficulties = task.difficulties || ''
      if (formData.newDifficulties?.trim()) {
        const newDifficultyEntry = `[${currentDate}] ${formData.newDifficulties.trim()}`
        finalDifficulties = finalDifficulties
          ? `${finalDifficulties}\n\n${newDifficultyEntry}`
          : newDifficultyEntry
      }

      console.log('Updating task:', {
        taskId: task.id,
        todayDate,
        additionalHours,
        finalTotalHours,
        dailyHours: updatedDailyHours,
        updates: {
          status: formData.status,
          remarks: finalRemarks || undefined,
          actualHours: finalTotalHours,
          dailyHours: updatedDailyHours,
          difficulties: finalDifficulties || undefined
        }
      })

      // Update task via API
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: formData.status,
          remarks: finalRemarks || undefined,
          actualHours: finalTotalHours,
          dailyHours: updatedDailyHours,
          difficulties: finalDifficulties || undefined
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update task')
      }

      const result = await response.json()
      const success = result.success

      console.log('Update result:', success)

      if (success) {
        // Clear task cache to ensure fresh data is loaded
        optimizedDataService.clearTaskCache()

        onUpdate()
        onClose()
      } else {
        throw new Error('Failed to update task')
      }
    } catch (err) {
      console.error('Task update error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen || !task) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-black">Update Task Status</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="font-medium text-black">{task.description}</p>
          <p className="text-sm text-gray-600 mt-1">
            Task ID: {task.taskId} • Assigned to: <UserName employeeId={task.assignedTo} />
          </p>
          {task.support && task.support.length > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              Support: <SupportTeam supportIds={task.support} />
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-gray-100 border border-gray-300 text-black px-3 py-2 rounded-lg flex items-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">⚠️ {error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Status *
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              required
              className="input-field"
            >
              {statuses.map(status => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* Current Hours Display */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Hours Summary
            </label>
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 space-y-2">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">
                  Today&apos;s hours: <span className="font-medium text-black">{getHoursForDate(getTodayDate(), task.dailyHours)} hours</span>
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">
                  Total hours: <span className="font-medium text-black">{calculateTotalHours(task.dailyHours)} hours</span>
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Estimated: {task.estimatedHours} hours
            </p>
          </div>

          {/* Additional Hours Input */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Add Additional Hours
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="number"
                name="additionalHours"
                value={formData.additionalHours}
                onChange={handleInputChange}
                step="0.5"
                min="0"

                className="input-field pl-10"
                placeholder="e.g., 2.5 (hours to add)"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {(() => {
                const currentTotal = calculateTotalHours(task.dailyHours)
                const additionalHours = parseFloat(formData.additionalHours || '0')

                if (formData.additionalHours) {
                  const newTotal = currentTotal + additionalHours
                  return `Today's total: ${getHoursForDate(getTodayDate(), task.dailyHours) + additionalHours} hours | Overall total: ${newTotal} hours`
                } else {
                  return `Current total: ${currentTotal} hours`
                }
              })()}
            </p>
          </div>

          {/* Current Remarks Display */}
          {formData.remarks && (
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Current Remarks
              </label>
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 max-h-32 overflow-y-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                  {formData.remarks}
                </pre>
              </div>
            </div>
          )}

          {/* Add New Remarks */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Add New Remarks
            </label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
              <textarea
                name="newRemarks"
                value={formData.newRemarks}
                onChange={handleInputChange}
                rows={3}
                className="input-field pl-10"
                placeholder="Add any new comments about the task progress..."
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              New remarks will be added with timestamp to existing remarks
            </p>
          </div>

          {/* Current Difficulties Display */}
          {formData.difficulties && (
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Current Difficulties
              </label>
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 max-h-32 overflow-y-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                  {formData.difficulties}
                </pre>
              </div>
            </div>
          )}

          {/* Add New Difficulties */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Add New Difficulties (Optional)
            </label>
            <textarea
              name="newDifficulties"
              value={formData.newDifficulties}
              onChange={handleInputChange}
              rows={2}
              className="input-field"
              placeholder="Describe any new challenges or blockers..."
            />
            <p className="text-xs text-gray-500 mt-1">
              New difficulties will be added with timestamp to existing difficulties
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{isLoading ? 'Updating...' : 'Update Task'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
