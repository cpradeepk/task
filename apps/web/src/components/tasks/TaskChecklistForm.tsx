'use client'

import { useState, useEffect } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { getAllUsers } from '@/lib/auth'

interface TaskChecklistFormProps {
  taskId: string
  onSuccess?: () => void
  compact?: boolean
}

export default function TaskChecklistForm({ taskId, onSuccess, compact = false }: TaskChecklistFormProps) {
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const allUsers = await getAllUsers()
      const activeUsers = allUsers.filter(user => user.status === 'active')
      setUsers(activeUsers)
      
      // Set current user as default assignee
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
      if (currentUser.employeeId) {
        setAssignedTo(currentUser.employeeId)
      } else if (activeUsers.length > 0) {
        setAssignedTo(activeUsers[0].employeeId)
      }
    } catch (err) {
      console.error('Failed to load users:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!description.trim()) {
      setError('Description is required')
      return
    }

    if (!assignedTo) {
      setError('Please select an assignee')
      return
    }

    try {
      setIsSubmitting(true)
      setError('')

      // Get current user for createdBy
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
      const createdBy = currentUser.employeeId || 'unknown'

      const response = await fetch('/api/task-checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentTaskId: taskId,
          description: description.trim(),
          assignedTo,
          status: 'Not Started',
          isCompleted: false,
          createdBy
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setDescription('')
        onSuccess?.()
      } else {
        setError(data.error || 'Failed to create checklist item')
      }
    } catch (err) {
      console.error('Failed to create checklist item:', err)
      setError('Failed to create checklist item')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="space-y-2">
        {error && (
          <div className="text-red-600 text-sm p-2 bg-red-50 rounded">
            {error}
          </div>
        )}
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a checklist item..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            disabled={isSubmitting}
          />
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            disabled={isSubmitting}
          >
            {users.map(user => (
              <option key={user.employeeId} value={user.employeeId}>
                {user.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isSubmitting || !description.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-sm"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span>Add</span>
          </button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-sm font-medium text-gray-900">Add New Checklist Item</h3>
      
      {error && (
        <div className="text-red-600 text-sm p-3 bg-red-50 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description *
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter checklist item description..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Assign To *
        </label>
        <select
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isSubmitting}
        >
          <option value="">Select assignee...</option>
          {users.map(user => (
            <option key={user.employeeId} value={user.employeeId}>
              {user.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !description.trim() || !assignedTo}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Adding...</span>
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" />
            <span>Add Checklist Item</span>
          </>
        )}
      </button>
    </form>
  )
}

