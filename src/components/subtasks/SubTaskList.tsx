'use client'

import { useState, useEffect } from 'react'
import { SubTask } from '@/lib/types'
import { getUserNameByEmployeeId } from '@/lib/auth'
import { CheckCircle2, Circle, GripVertical, Trash2, Edit2, User } from 'lucide-react'

interface SubTaskListProps {
  parentTaskId: string
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

export default function SubTaskList({ 
  parentTaskId, 
  onUpdate, 
  editable = false,
  showAssignee = true 
}: SubTaskListProps) {
  const [subtasks, setSubtasks] = useState<SubTask[]>([])
  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0, notStarted: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [draggedItem, setDraggedItem] = useState<number | null>(null)

  useEffect(() => {
    loadSubTasks()
  }, [parentTaskId])

  const loadSubTasks = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/subtasks?parentTaskId=${parentTaskId}`)
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

  const handleToggleComplete = async (subtask: SubTask) => {
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
      const response = await fetch(`/api/subtasks/${subtaskId}`, {
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

  const handleDragStart = (index: number) => {
    setDraggedItem(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedItem === null || draggedItem === index) return

    const newSubtasks = [...subtasks]
    const draggedSubtask = newSubtasks[draggedItem]
    newSubtasks.splice(draggedItem, 1)
    newSubtasks.splice(index, 0, draggedSubtask)

    setSubtasks(newSubtasks)
    setDraggedItem(index)
  }

  const handleDragEnd = async () => {
    if (draggedItem === null) return

    try {
      // Send new order to backend
      const subtaskIds = subtasks.map(st => st.id)
      const response = await fetch('/api/subtasks/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentTaskId,
          subtaskIds
        })
      })

      const data = await response.json()
      if (!data.success) {
        // Reload if reorder failed
        await loadSubTasks()
        setError(data.error || 'Failed to reorder subtasks')
      }
    } catch (err) {
      console.error('Failed to reorder subtasks:', err)
      await loadSubTasks()
      setError('Failed to reorder subtasks')
    } finally {
      setDraggedItem(null)
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-4 bg-gray-200 rounded w-32"></div>
        <div className="h-8 bg-gray-100 rounded"></div>
        <div className="h-8 bg-gray-100 rounded"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
        {error}
      </div>
    )
  }

  if (subtasks.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        No subtasks yet
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Stats Summary */}
      <div className="flex items-center space-x-4 text-sm">
        <span className="text-gray-600">
          <span className="font-semibold text-gray-900">{stats.completed}</span> / {stats.total} completed
        </span>
        {stats.inProgress > 0 && (
          <span className="text-blue-600">
            {stats.inProgress} in progress
          </span>
        )}
      </div>

      {/* Subtask List */}
      <div className="space-y-2">
        {subtasks.map((subtask, index) => (
          <div
            key={subtask.id}
            draggable={editable}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex items-start space-x-3 p-3 rounded-lg border transition-all ${
              subtask.isCompleted
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200 hover:border-gray-300'
            } ${editable ? 'cursor-move' : ''}`}
          >
            {/* Drag Handle */}
            {editable && (
              <GripVertical className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
            )}

            {/* Checkbox */}
            <button
              onClick={() => handleToggleComplete(subtask)}
              className="flex-shrink-0 mt-0.5 focus:outline-none focus:ring-2 focus:ring-primary rounded"
              disabled={!editable}
            >
              {subtask.isCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              )}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${subtask.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                {subtask.description}
              </p>
              {showAssignee && (
                <div className="flex items-center space-x-2 mt-1 text-xs text-gray-600">
                  <User className="h-3 w-3" />
                  <span>
                    <UserName employeeId={subtask.assignedTo} />
                  </span>
                  {subtask.status !== 'Not Started' && (
                    <span className={`px-2 py-0.5 rounded-full ${
                      subtask.status === 'Completed' ? 'bg-green-100 text-green-700' :
                      subtask.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {subtask.status}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            {editable && (
              <div className="flex items-center space-x-1 flex-shrink-0">
                <button
                  onClick={() => handleDelete(subtask.id)}
                  className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                  title="Delete subtask"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

