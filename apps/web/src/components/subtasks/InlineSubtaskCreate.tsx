'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, Maximize2 } from 'lucide-react'

interface InlineSubtaskCreateProps {
  parentId: string
  parentType: 'task' | 'bug'
  parentData: {
    projectId?: string | null
    subprojectId?: string | null
    department?: string | null
    assignedBy: string
  }
  onCancel: () => void
  onSuccess: () => void
}

export default function InlineSubtaskCreate({
  parentId,
  parentType,
  parentData,
  onCancel,
  onSuccess
}: InlineSubtaskCreateProps) {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    assignedTo: '',
    endDate: ''
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      if (data.success) {
        setUsers(data.data.filter((u: any) => u.status === 'Active'))
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.assignedTo || !formData.endDate) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const subtaskData = parentType === 'task' ? {
        name: formData.name.trim(),
        description: formData.name.trim(),
        assignedTo: [formData.assignedTo], // Array for multiple assignees support
        assignedBy: parentData.assignedBy,
        support: [],
        startDate: today,
        endDate: formData.endDate,
        priority: 'NU&I', // Default priority
        estimatedHours: 0,
        selectType: 'Normal',
        status: 'Yet to Start',
        projectId: parentData.projectId,
        department: parentData.department,
        parentTaskId: parentId
      } : {
        title: formData.name.trim(),
        description: formData.name.trim(),
        assignedTo: formData.assignedTo,
        assignedBy: parentData.assignedBy,
        reportedBy: parentData.assignedBy,
        reportedDate: today,
        severity: 'Minor', // Default severity
        priority: 'Low', // Default priority
        category: 'Bug', // Default category
        status: 'New',
        projectId: parentData.projectId,
        subprojectId: parentData.subprojectId,
        parentDevId: parentId
      }

      const endpoint = parentType === 'task' ? '/api/tasks' : '/api/bugs'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subtaskData)
      })

      const data = await response.json()

      if (data.success) {
        onSuccess()
      } else {
        alert(`Failed to create subtask: ${data.error}`)
      }
    } catch (error) {
      console.error('Failed to create subtask:', error)
      alert('Failed to create subtask')
    } finally {
      setLoading(false)
    }
  }

  const handleExpandToFullForm = () => {
    const url = parentType === 'task' 
      ? `/tasks/create?parentTaskId=${parentId}`
      : `/bugs/create?parentDevId=${parentId}`
    router.push(url)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-3">
          {/* Name field */}
          <input
            type="text"
            placeholder={`Enter ${parentType === 'task' ? 'task' : 'bug'} name...`}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
            disabled={loading}
          />

          <div className="grid grid-cols-2 gap-3">
            {/* Assignee field */}
            <select
              value={formData.assignedTo}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
              required
            >
              <option value="">Select Assignee *</option>
              {users.map((user) => (
                <option key={user.employeeId} value={user.employeeId}>
                  {user.name} ({user.employeeId})
                </option>
              ))}
            </select>

            {/* Due date field */}
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
              required
            />
          </div>

          {/* Auto-populated info */}
          <div className="text-xs text-gray-600 bg-white rounded px-3 py-2 border border-gray-200">
            <span className="font-medium">Auto-populated:</span> Project, Subproject, Department, Status (Yet to Start)
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          <button
            type="submit"
            disabled={loading || !formData.name.trim() || !formData.assignedTo || !formData.endDate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? 'Creating...' : 'Save'}
          </button>

          <button
            type="button"
            onClick={handleExpandToFullForm}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-1"
            title="Open full creation form"
          >
            <Maximize2 className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 border border-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </form>
  )
}

