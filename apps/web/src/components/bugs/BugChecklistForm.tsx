'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'

interface BugSubTaskFormProps {
  parentBugId: string
  createdBy: string
  onSuccess?: () => void
  compact?: boolean
}

interface User {
  employeeId: string
  name: string
}

export default function BugSubTaskForm({
  parentBugId,
  createdBy,
  onSuccess,
  compact = false
}: BugSubTaskFormProps) {
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState(createdBy)
  const [users, setUsers] = useState<User[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      if (data.success) {
        setUsers(data.data || [])
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

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/development-checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentBugId,
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
        setAssignedTo(createdBy)
        onSuccess?.()
      } else {
        setError(data.error || 'Failed to create checklist item')
      }
    } catch (err) {
      console.error('Failed to create subtask:', err)
      setError('Failed to create checklist item')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a checklist item..."
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isSubmitting}
        />
        <select
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isSubmitting}
        >
          {users.map((user) => (
            <option key={user.employeeId} value={user.employeeId}>
              {user.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isSubmitting || !description.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-start space-x-2">
        <Plus className="h-5 w-5 text-gray-400 mt-2.5" />
        <div className="flex-1 space-y-3">
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Checklist Item Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter checklist item description..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700 mb-1">
              Assign To
            </label>
            <select
              id="assignedTo"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting}
            >
              {users.map((user) => (
                <option key={user.employeeId} value={user.employeeId}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !description.trim()}
            className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding...' : 'Add Checklist Item'}
          </button>
        </div>
      </div>
    </form>
  )
}

