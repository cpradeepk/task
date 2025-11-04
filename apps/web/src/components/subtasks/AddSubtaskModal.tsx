'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

interface AddSubtaskModalProps {
  parentId: string
  parentType: 'task' | 'bug'
  parentName: string
  onClose: () => void
  onSuccess: () => void
}

export default function AddSubtaskModal({ 
  parentId, 
  parentType, 
  parentName,
  onClose, 
  onSuccess 
}: AddSubtaskModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleQuickCreate = () => {
    // Redirect to create page with parent ID pre-filled
    if (parentType === 'task') {
      router.push(`/tasks/create?parentTaskId=${parentId}`)
    } else {
      router.push(`/bugs/create?parentDevId=${parentId}`)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Add Subtask</h2>
            <p className="text-sm text-gray-500 mt-1">
              Create a subtask under: <span className="font-medium">{parentName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-6">
            You'll be redirected to the {parentType === 'task' ? 'task' : 'bug'} creation page with the parent {parentType} pre-selected.
            Fill in the details to create a subtask.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-medium text-blue-900 mb-2">What is a Subtask?</h4>
            <p className="text-xs text-blue-700">
              A subtask is a full {parentType === 'task' ? 'task' : 'bug'} that belongs to a parent {parentType}. 
              It has all the same fields (name, description, assignees, dates, etc.) and can have its own checklists and subtasks.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleQuickCreate}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

