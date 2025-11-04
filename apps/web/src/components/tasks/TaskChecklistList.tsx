'use client'

import { useState, useEffect } from 'react'
import { getUserNameByEmployeeId } from '@/lib/auth'
import { CheckCircle2, Circle, Trash2, User } from 'lucide-react'

interface TaskChecklist {
  id: number
  parentTaskId: string
  description: string
  assignedTo: string
  status: 'Not Started' | 'In Progress' | 'Completed'
  isCompleted: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
  createdBy: string
}

interface TaskChecklistListProps {
  taskId: string
  onUpdate?: () => void
  editable?: boolean
  canEdit?: boolean
  showAssignee?: boolean
}

// Component to handle async user name fetching
function UserName({ employeeId }: { employeeId: string }) {
  const [name, setName] = useState<string>(employeeId)

  useEffect(() => {
    getUserNameByEmployeeId(employeeId).then(setName)
  }, [employeeId])

  return <span>{name}</span>
}

export default function TaskChecklistList({
  taskId,
  onUpdate,
  editable = false,
  canEdit = false,
  showAssignee = true
}: TaskChecklistListProps) {
  const [checklists, setChecklists] = useState<TaskChecklist[]>([])
  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0, notStarted: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadChecklists()
  }, [taskId])

  const loadChecklists = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/task-checklists?parentTaskId=${taskId}`)
      const data = await response.json()

      if (data.success) {
        setChecklists(data.data || [])
        setStats(data.stats || { total: 0, completed: 0, inProgress: 0, notStarted: 0 })
      } else {
        setError(data.error || 'Failed to load checklists')
      }
    } catch (err) {
      console.error('Failed to load checklists:', err)
      setError('Failed to load checklists')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleComplete = async (checklist: TaskChecklist) => {
    try {
      const newIsCompleted = !checklist.isCompleted
      const newStatus = newIsCompleted ? 'Completed' : 'Not Started'

      const response = await fetch(`/api/task-checklists/${checklist.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isCompleted: newIsCompleted,
          status: newStatus
        })
      })

      const data = await response.json()
      if (data.success) {
        await loadChecklists()
        onUpdate?.()
      } else {
        setError(data.error || 'Failed to update checklist item')
      }
    } catch (err) {
      console.error('Failed to toggle checklist item:', err)
      setError('Failed to update checklist item')
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

      const response = await fetch(`/api/task-checklists/${checklistId}?deletedBy=${deletedBy}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        await loadChecklists()
        onUpdate?.()
      } else {
        setError(data.error || 'Failed to delete checklist item')
      }
    } catch (err) {
      console.error('Failed to delete checklist item:', err)
      setError('Failed to delete checklist item')
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
            className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
          >
            {/* Checkbox */}
            <button
              onClick={() => editable && handleToggleComplete(checklist)}
              disabled={!editable}
              className={`mt-0.5 ${editable ? 'cursor-pointer' : 'cursor-default'}`}
            >
              {checklist.isCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className="h-5 w-5 text-gray-400" />
              )}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${checklist.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                {checklist.description}
              </p>
              {showAssignee && (
                <div className="flex items-center space-x-1 mt-1 text-xs text-gray-500">
                  <User className="h-3 w-3" />
                  <span><UserName employeeId={checklist.assignedTo} /></span>
                </div>
              )}
              <div className="flex items-center space-x-3 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  checklist.status === 'Completed' ? 'bg-green-100 text-green-800' :
                  checklist.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {checklist.status}
                </span>
              </div>
            </div>

            {/* Delete Button */}
            {editable && (
              <button
                onClick={() => handleDelete(checklist.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded text-red-600"
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

