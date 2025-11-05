'use client'

import { useState, useEffect } from 'react'
import { BugChecklist } from '@/lib/db/bugSubtasks'
import { CheckCircle2, Circle, Trash2 } from 'lucide-react'

interface BugChecklistListProps {
  parentBugId: string
  onUpdate?: () => void
  editable?: boolean
}

export default function BugChecklistList({
  parentBugId,
  onUpdate,
  editable = false
}: BugChecklistListProps) {
  const [checklists, setChecklists] = useState<BugChecklist[]>([])
  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0, notStarted: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSubTasks()
  }, [parentBugId])

  const loadSubTasks = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/development-checklists?parentBugId=${parentBugId}`)
      const data = await response.json()

      if (data.success) {
        setChecklists(data.data || [])
        setStats(data.stats || { total: 0, completed: 0, inProgress: 0, notStarted: 0 })
      } else {
        setError(data.error || 'Failed to load bug checklists')
      }
    } catch (err) {
      console.error('Failed to load bug checklists:', err)
      setError('Failed to load bug checklists')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleComplete = async (checklist: BugChecklist) => {
    try {
      const newIsCompleted = !checklist.isCompleted
      const newStatus = newIsCompleted ? 'Completed' : 'Not Started'

      const response = await fetch(`/api/development-checklists/${checklist.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isCompleted: newIsCompleted,
          status: newStatus
        })
      })

      const data = await response.json()
      if (data.success) {
        await loadSubTasks()
        onUpdate?.()
      } else {
        setError(data.error || 'Failed to update bug checklist item')
      }
    } catch (err) {
      console.error('Failed to toggle bug checklist item:', err)
      setError('Failed to update bug checklist item')
    }
  }

  const handleDelete = async (checklistId: number) => {
    if (!confirm('Are you sure you want to delete this checklist item?')) {
      return
    }

    try {
      // Get current user from localStorage
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
      const deletedBy = currentUser.employeeId || 'unknown'

      const response = await fetch(`/api/development-checklists/${checklistId}?deletedBy=${deletedBy}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        await loadSubTasks()
        onUpdate?.()
      } else {
        setError(data.error || 'Failed to delete bug checklist item')
      }
    } catch (err) {
      console.error('Failed to delete bug checklist item:', err)
      setError('Failed to delete bug checklist item')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-600 text-sm p-4 bg-red-50 rounded-lg">
        {error}
      </div>
    )
  }

  if (checklists.length === 0) {
    return (
      <div className="text-gray-500 text-sm text-center py-8">
        No checklist items yet. {editable && 'Add one below to get started.'}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Progress Stats */}
      {stats.total > 0 && (
        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4 pb-3 border-b border-gray-200">
          <span className="font-medium">
            {stats.completed} of {stats.total} completed
          </span>
          {stats.inProgress > 0 && (
            <span className="text-yellow-600">
              {stats.inProgress} in progress
            </span>
          )}
        </div>
      )}

      {/* Checklist Items */}
      <div className="space-y-2">
        {checklists.map((checklist) => (
          <div
            key={checklist.id}
            className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
              checklist.isCompleted
                ? 'bg-gray-50 border-gray-200'
                : 'bg-white border-gray-300 hover:border-blue-300'
            }`}
          >
            {/* Checkbox */}
            <button
              onClick={() => handleToggleComplete(checklist)}
              className="flex-shrink-0 mt-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              disabled={!editable}
            >
              {checklist.isCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className="h-5 w-5 text-gray-400 hover:text-blue-600" />
              )}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm ${
                  checklist.isCompleted
                    ? 'text-gray-500 line-through'
                    : 'text-gray-900'
                }`}
              >
                {checklist.description}
              </p>
            </div>

            {/* Delete Button */}
            {editable && (
              <button
                onClick={() => handleDelete(checklist.id)}
                className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                title="Delete checklist item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

