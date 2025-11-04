'use client'

import { useState, useEffect } from 'react'
import { User } from '@/lib/types'
import { Plus, X } from 'lucide-react'
import LoadingButton from '@/components/ui/LoadingButton'

interface SubTaskFormProps {
  parentTaskId: string
  createdBy: string
  onSuccess?: () => void
  compact?: boolean
}

export default function SubTaskForm({ 
  parentTaskId, 
  createdBy, 
  onSuccess,
  compact = false 
}: SubTaskFormProps) {
  const [formData, setFormData] = useState({
    description: '',
    assignedTo: ''
  })
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(!compact)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setIsLoadingUsers(true)
      const response = await fetch('/api/users')
      const data = await response.json()

      if (data.success) {
        setUsers(data.data.filter((user: User) => user.status === 'active'))
      } else {
        setError('Failed to load users')
      }
    } catch (err) {
      console.error('Failed to load users:', err)
      setError('Failed to load users')
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      if (!formData.description.trim()) {
        throw new Error('Please enter a checklist item description')
      }

      if (!formData.assignedTo) {
        throw new Error('Please select an assignee')
      }

      const response = await fetch('/api/task-checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentTaskId,
          description: formData.description.trim(),
          assignedTo: formData.assignedTo,
          createdBy
        })
      })

      const data = await response.json()

      if (data.success) {
        // Reset form
        setFormData({
          description: '',
          assignedTo: ''
        })
        
        // Hide form if compact mode
        if (compact) {
          setShowForm(false)
        }

        // Notify parent
        onSuccess?.()
      } else {
        setError(data.error || 'Failed to create checklist item')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create checklist item')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      description: '',
      assignedTo: ''
    })
    setError('')
    if (compact) {
      setShowForm(false)
    }
  }

  if (compact && !showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="flex items-center space-x-2 text-sm text-primary hover:text-primary-dark transition-colors"
      >
        <Plus className="h-4 w-4" />
        <span>Add Checklist Item</span>
      </button>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Checklist Item Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            placeholder="Describe what needs to be done..."
            disabled={isLoading}
            required
          />
        </div>

        {/* Assignee */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assign To *
          </label>
          {isLoadingUsers ? (
            <div className="animate-pulse">
              <div className="h-10 bg-gray-200 rounded-lg"></div>
            </div>
          ) : (
            <select
              value={formData.assignedTo}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={isLoading}
              required
            >
              <option value="">Select assignee...</option>
              {users.map(user => (
                <option key={user.employeeId} value={user.employeeId}>
                  {user.name} ({user.employeeId}) - {user.department}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <LoadingButton
            type="submit"
            isLoading={isLoading}
            loadingText="Adding..."
            variant="primary"
            className="flex items-center space-x-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Checklist Item</span>
          </LoadingButton>
        </div>
      </form>
    </div>
  )
}

