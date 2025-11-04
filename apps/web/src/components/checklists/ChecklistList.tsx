'use client'

import { useState, useEffect } from 'react'
import { Checklist } from '@/lib/types'
import { getUserNameByEmployeeId } from '@/lib/auth'
import { CheckCircle2, Circle, GripVertical, Trash2, Edit2, User } from 'lucide-react'

interface ChecklistListProps {
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

export default function ChecklistList({ 
  parentTaskId, 
  onUpdate, 
  editable = false,
  showAssignee = true 
}: ChecklistListProps) {
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0, notStarted: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [draggedItem, setDraggedItem] = useState<number | null>(null)

  useEffect(() => {
    loadChecklists()
  }, [parentTaskId])

  const loadChecklists = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/task-checklists?parentTaskId=${parentTaskId}`)
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

  const handleToggleComplete = async (checklist: Checklist) => {
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
      const response = await fetch(`/api/task-checklists/${checklistId}`, {
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

  const handleDragStart = (index: number) => {
    setDraggedItem(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedItem === null || draggedItem === index) return

    const newChecklists = [...checklists]
    const draggedChecklist = newChecklists[draggedItem]
    newChecklists.splice(draggedItem, 1)
    newChecklists.splice(index, 0, draggedChecklist)

    setChecklists(newChecklists)
    setDraggedItem(index)
  }

  const handleDragEnd = async () => {
    if (draggedItem === null) return

    try {
      // Send new order to backend
      const checklistIds = checklists.map(st => st.id)
      const response = await fetch('/api/task-checklists/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentTaskId,
          checklistIds
        })
      })

      const data = await response.json()
      if (!data.success) {
        // Reload if reorder failed
        await loadChecklists()
        setError(data.error || 'Failed to reorder checklists')
      }
    } catch (err) {
      console.error('Failed to reorder checklists:', err)
      await loadChecklists()
      setError('Failed to reorder checklists')
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

  if (checklists.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        No checklist items yet
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

      {/* Checklist Items */}
      <div className="space-y-2">
        {checklists.map((checklist, index) => (
          <div
            key={checklist.id}
            draggable={editable}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex items-start space-x-3 p-3 rounded-lg border transition-all ${
              checklist.isCompleted
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
              onClick={() => handleToggleComplete(checklist)}
              className="flex-shrink-0 mt-0.5 focus:outline-none focus:ring-2 focus:ring-primary rounded"
              disabled={!editable}
            >
              {checklist.isCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              )}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${checklist.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                {checklist.description}
              </p>
              {showAssignee && (
                <div className="flex items-center space-x-2 mt-1 text-xs text-gray-600">
                  <User className="h-3 w-3" />
                  <span>
                    <UserName employeeId={checklist.assignedTo} />
                  </span>
                  {checklist.status !== 'Not Started' && (
                    <span className={`px-2 py-0.5 rounded-full ${
                      checklist.status === 'Completed' ? 'bg-green-100 text-green-700' :
                      checklist.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {checklist.status}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            {editable && (
              <div className="flex items-center space-x-1 flex-shrink-0">
                <button
                  onClick={() => handleDelete(checklist.id)}
                  className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                  title="Delete checklist item"
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

