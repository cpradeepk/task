'use client'

import { useState, useEffect } from 'react'
import { getUserNameByEmployeeId } from '@/lib/auth'
import { CheckCircle2, Circle, Trash2, User } from 'lucide-react'

interface TaskSubTask {
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

interface TaskSubTaskListProps {
  taskId: string
  onUpdate?: () => void
  editable?: boolean
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

export default function TaskSubTaskList({ 
  taskId, 
  onUpdate, 
  editable = false,
  showAssignee = true 
}: TaskSubTaskListProps) {
  const [subtasks, setSubtasks] = useState<TaskSubTask[]>([])
  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0, notStarted: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSubTasks()
  }, [taskId])

  const loadSubTasks = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/subtasks?parentTaskId=${taskId}`)
      const data = await response.json()

      if (data.success) {
        setSubtasks(data.data || [])
        setStats(data.stats || { total: 0, completed: 0, inProgress: 0, notStarted: 0 })
      } else {
        setError(data.error || 'Failed to load subtasks')
      }
    } catch (err) {
      console.error('Failed to load subtasks:', err)
      setError('Failed to load subtasks')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleComplete = async (subtask: TaskSubTask) => {
    try {
      const newIsCompleted = !subtask.isCompleted
      const newStatus = newIsCompleted ? 'Completed' : 'Not Started'

      const response = await fetch(`/api/subtasks/${subtask.id}`, {
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
        setError(data.error || 'Failed to update subtask')
      }
    } catch (err) {
      console.error('Failed to toggle subtask:', err)
      setError('Failed to update subtask')
    }
  }

  const handleDelete = async (subtaskId: number) => {
    if (!confirm('Are you sure you want to delete this subtask?')) {
      return
    }

    try {
      // Get current user from localStorage
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
      const deletedBy = currentUser.employeeId || 'unknown'

      const response = await fetch(`/api/subtasks/${subtaskId}?deletedBy=${deletedBy}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        await loadSubTasks()
        onUpdate?.()
      } else {
        setError(data.error || 'Failed to delete subtask')
      }
    } catch (err) {
      console.error('Failed to delete subtask:', err)
      setError('Failed to delete subtask')
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

  if (subtasks.length === 0) {
    return (
      <div className="text-gray-500 text-sm text-center py-8">
        No subtasks yet. {editable && 'Add one below to get started.'}
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

      {/* Subtask List */}
      <div className="space-y-2">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
          >
            {/* Checkbox */}
            <button
              onClick={() => editable && handleToggleComplete(subtask)}
              disabled={!editable}
              className={`mt-0.5 ${editable ? 'cursor-pointer' : 'cursor-default'}`}
            >
              {subtask.isCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className="h-5 w-5 text-gray-400" />
              )}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${subtask.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                {subtask.description}
              </p>
              {showAssignee && (
                <div className="flex items-center space-x-1 mt-1 text-xs text-gray-500">
                  <User className="h-3 w-3" />
                  <span><UserName employeeId={subtask.assignedTo} /></span>
                </div>
              )}
              <div className="flex items-center space-x-3 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  subtask.status === 'Completed' ? 'bg-green-100 text-green-800' :
                  subtask.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {subtask.status}
                </span>
              </div>
            </div>

            {/* Delete Button */}
            {editable && (
              <button
                onClick={() => handleDelete(subtask.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded text-red-600"
                title="Delete subtask"
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

