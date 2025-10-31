'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Task } from '@/lib/types'
import { X, Save, Calendar, User, Users, Clock, FileText, AlertTriangle, Tag } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'
import { useSettingsIcons } from '@/hooks/useSettingsIcons'
import { getUserNameByEmployeeId } from '@/lib/auth'

// Helper function to format ISO date to yyyy-MM-dd for HTML5 date inputs
function formatDateForInput(isoDate: string | null | undefined): string {
  if (!isoDate) return ''
  // Extract just the date part (yyyy-MM-dd) from ISO 8601 format
  return isoDate.split('T')[0]
}

// Component to handle async user name fetching
function UserName({ employeeId }: { employeeId: string }) {
  const [name, setName] = useState<string>(employeeId)

  useEffect(() => {
    getUserNameByEmployeeId(employeeId).then(setName)
  }, [employeeId])

  return <span>{name}</span>
}

interface TaskEditModalProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export default function TaskEditModal({ task, isOpen, onClose, onUpdate }: TaskEditModalProps) {
  const [formData, setFormData] = useState<Partial<Task>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [subprojects, setSubprojects] = useState<any[]>([])
  const [selectedMainProject, setSelectedMainProject] = useState<string>('')

  const { settings, isLoading: isLoadingSettings } = useSettings()
  const { getIcon } = useSettingsIcons()

  // Ref for the modal content to detect clicks outside
  const modalContentRef = useRef<HTMLDivElement>(null)

  // Get options from settings (using correct keys from database)
  const taskStatusOptions = settings?.task_statuses || []
  const priorityOptions = settings?.task_priorities || []
  const taskTypeOptions = ['Normal', 'Recursive']
  const recursiveTypeOptions = ['Daily', 'Weekly', 'Monthly', 'Annually']

  // Load users
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await fetch('/api/users')
        const data = await response.json()
        if (data.success) {
          setUsers(data.data)
        }
      } catch (error) {
        console.error('Failed to load users:', error)
      }
    }
    loadUsers()
  }, [])

  // Load main projects (projects without parent)
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await fetch('/api/projects?type=main&status=active')
        const data = await response.json()
        setProjects(data)
      } catch (error) {
        console.error('Failed to load projects:', error)
      }
    }
    loadProjects()
  }, [])

  // Load subprojects when main project is selected
  useEffect(() => {
    const loadSubprojects = async () => {
      if (!selectedMainProject) {
        setSubprojects([])
        return
      }

      try {
        const response = await fetch('/api/projects?status=active')
        const data = await response.json()
        // Filter subprojects that belong to the selected main project
        const subs = data.filter((p: any) => p.parentProjectId === selectedMainProject)
        setSubprojects(subs)
      } catch (error) {
        console.error('Failed to load subprojects:', error)
      }
    }
    loadSubprojects()
  }, [selectedMainProject])

  // Initialize form data when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        taskId: task.taskId,
        selectType: task.selectType,
        recursiveType: task.recursiveType,
        description: task.description,
        assignedTo: task.assignedTo,
        assignedBy: task.assignedBy,
        support: task.support || [],
        startDate: task.startDate,
        endDate: task.endDate,
        priority: task.priority,
        estimatedHours: task.estimatedHours,
        actualHours: task.actualHours,
        status: task.status,
        remarks: task.remarks || '',
        difficulties: task.difficulties || '',
        projectId: task.projectId || '',
      })

      // If task has a projectId, determine if it's a main project or subproject
      if (task.projectId && projects.length > 0) {
        const project = projects.find((p: any) => p.projectId === task.projectId)
        if (project) {
          // It's a main project
          setSelectedMainProject(task.projectId)
        } else {
          // It might be a subproject, need to find its parent
          fetch('/api/projects?status=active')
            .then(res => res.json())
            .then(data => {
              const subproject = data.find((p: any) => p.projectId === task.projectId)
              if (subproject && subproject.parentProjectId) {
                setSelectedMainProject(subproject.parentProjectId)
              }
            })
            .catch(err => console.error('Failed to load project info:', err))
        }
      }
    }
  }, [task, projects])

  // Click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalContentRef.current && !modalContentRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      // Add a small delay to prevent immediate closing when opening
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 100)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!task) return

    setIsLoading(true)
    setError('')

    try {
      const updates = {
        ...formData,
        updatedAt: new Date().toISOString()
      }

      const response = await fetch(`/api/tasks/${task.taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Failed to update task')
      }

      onUpdate()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSupportChange = (employeeId: string) => {
    const currentSupport = formData.support || []
    const newSupport = currentSupport.includes(employeeId)
      ? currentSupport.filter(id => id !== employeeId)
      : [...currentSupport, employeeId]
    setFormData({ ...formData, support: newSupport })
  }

  if (!isOpen || !task) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
      <div ref={modalContentRef} className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Edit Task</h2>
            <p className="text-sm text-gray-500 mt-1">{task.taskId}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Task Type */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <Tag className="h-4 w-4 inline mr-2" />
              Task Type
            </label>
            <div className="flex space-x-4">
              {taskTypeOptions.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, selectType: type as Task['selectType'] })}
                  className={`px-4 py-2 rounded-lg border-2 transition-all ${
                    formData.selectType === type
                      ? 'border-primary bg-primary text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-primary'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Recursive Type (only if Recursive) */}
          {formData.selectType === 'Recursive' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Recursive Type
              </label>
              <select
                value={formData.recursiveType || ''}
                onChange={(e) => setFormData({ ...formData, recursiveType: e.target.value as Task['recursiveType'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select frequency...</option>
                {recursiveTypeOptions.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <FileText className="h-4 w-4 inline mr-2" />
              Description *
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter task description..."
            />
          </div>

          {/* Assigned To */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <User className="h-4 w-4 inline mr-2" />
              Assigned To *
            </label>
            <select
              value={formData.assignedTo || ''}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Select assignee...</option>
              {users.map((user) => (
                <option key={user.employeeId} value={user.employeeId}>
                  {user.name} ({user.employeeId})
                </option>
              ))}
            </select>
          </div>

          {/* Support Team */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <Users className="h-4 w-4 inline mr-2" />
              Support Team
            </label>
            <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
              {users.map((user) => (
                <label key={user.employeeId} className="flex items-center space-x-2 py-1 hover:bg-gray-50 px-2 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(formData.support || []).includes(user.employeeId)}
                    onChange={() => handleSupportChange(user.employeeId)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm">{user.name} ({user.employeeId})</span>
                </label>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <Calendar className="h-4 w-4 inline mr-2" />
                Start Date *
              </label>
              <input
                type="date"
                value={formatDateForInput(formData.startDate)}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <Calendar className="h-4 w-4 inline mr-2" />
                End Date *
              </label>
              <input
                type="date"
                value={formatDateForInput(formData.endDate)}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Priority and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Priority *
              </label>
              <select
                value={formData.priority || ''}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                required
                disabled={isLoadingSettings}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select priority...</option>
                {isLoadingSettings ? (
                  <option>Loading...</option>
                ) : (
                  priorityOptions.map((priority) => {
                    const icon = getIcon('task_priorities', priority)
                    return (
                      <option key={priority} value={priority}>
                        {icon && `${icon} `}{priority}
                      </option>
                    )
                  })
                )}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Status *
              </label>
              <select
                value={formData.status || ''}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Task['status'] })}
                required
                disabled={isLoadingSettings}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {isLoadingSettings ? (
                  <option>Loading...</option>
                ) : (
                  taskStatusOptions.map((status) => {
                    const icon = getIcon('task_statuses', status)
                    return (
                      <option key={status} value={status}>
                        {icon && `${icon} `}{status}
                      </option>
                    )
                  })
                )}
              </select>
            </div>
          </div>

          {/* Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <Clock className="h-4 w-4 inline mr-2" />
                Estimated Hours *
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={formData.estimatedHours || ''}
                onChange={(e) => setFormData({ ...formData, estimatedHours: parseFloat(e.target.value) })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="e.g., 8"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <Clock className="h-4 w-4 inline mr-2" />
                Actual Hours
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.actualHours || ''}
                onChange={(e) => setFormData({ ...formData, actualHours: parseFloat(e.target.value) || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="e.g., 6.5"
              />
            </div>
          </div>

          {/* Comments (merged Remarks and Difficulties) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Comments
            </label>
            <textarea
              value={formData.remarks || ''}
              onChange={(e) => {
                // Store in remarks field for backward compatibility
                // Both remarks and difficulties will be stored in the same field
                setFormData({ ...formData, remarks: e.target.value, difficulties: e.target.value })
              }}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Additional notes, comments, or challenges faced during task execution..."
            />
          </div>

          {/* Related Tasks/Bugs */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Related Tasks/Bugs
            </label>
            <input
              type="text"
              value={formData.relatedTasks || ''}
              onChange={(e) => setFormData({ ...formData, relatedTasks: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="e.g., JSR-0001, JSR-0002, BUG-0001 (comma-separated)"
            />
            <p className="text-xs text-gray-500">
              Enter comma-separated task or bug IDs to link related work items
            </p>
          </div>

          {/* Project and Subproject - Cascading Dropdowns */}
          <div className="grid grid-cols-2 gap-4">
            {/* Main Project */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Project *
              </label>
              <select
                value={selectedMainProject}
                onChange={(e) => {
                  const mainProjectId = e.target.value
                  setSelectedMainProject(mainProjectId)
                  // If main project selected and no subprojects, set projectId to main project
                  // Otherwise, clear projectId until subproject is selected
                  setFormData({ ...formData, projectId: mainProjectId })
                }}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select project...</option>
                {projects.map((project) => (
                  <option key={project.projectId} value={project.projectId}>
                    {project.projectName}
                  </option>
                ))}
              </select>
            </div>

            {/* Subproject (only shown if main project has subprojects) */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Subproject {subprojects.length > 0 ? '*' : '(Optional)'}
              </label>
              <select
                value={formData.projectId || ''}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                disabled={!selectedMainProject || subprojects.length === 0}
                required={subprojects.length > 0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value={selectedMainProject}>
                  {subprojects.length === 0 ? 'No subprojects' : 'Select subproject...'}
                </option>
                {subprojects.map((subproject) => (
                  <option key={subproject.projectId} value={subproject.projectId}>
                    {subproject.projectName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 -mx-6 -mb-6 px-6 py-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

