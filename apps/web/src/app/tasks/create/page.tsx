'use client'

import { useState, useEffect } from 'react'
import React from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getAllUsers } from '@/lib/auth'
import { generateTaskId } from '@/lib/data'

import { optimizedDataService } from '@/lib/optimizedDataService'
import SupportTaskService from '@/lib/supportTaskService'
import { usePageLoading } from '@/hooks/usePageLoading'
import { User } from '@/lib/types'
import { Save, X, Calendar, Clock, AlertCircle } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import LoadingButton from '@/components/ui/LoadingButton'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useLoading } from '@/contexts/LoadingContext'
import ProjectSelector from '@/components/ProjectSelector'

export default function CreateTask() {
  const [formData, setFormData] = useState({
    selectType: 'Normal',
    recursiveType: '',
    description: '',
    support: [] as string[], // Array of employee IDs for support
    startDate: '',
    endDate: '',
    priority: '',
    estimatedHours: '',
    hoursWorked: '',
    projectId: null as string | null,
    assignToSomeoneElse: false,
    assignedTo: '',
    multiUserAssignment: false, // Enable multi-user assignment
    assignees: [] as string[] // Array of employee IDs for multi-user assignment
  })
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [usersLoaded, setUsersLoaded] = useState(false)
  const [error, setError] = useState('')
  const [isHydrated, setIsHydrated] = useState(false)

  // Settings state
  const [taskPriorityOptions, setTaskPriorityOptions] = useState<Array<{value: string, label: string}>>([])
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)

  const router = useRouter()
  const currentUser = getCurrentUser()
  const { showGlobalLoading, hideGlobalLoading } = useLoading()

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Authentication check
  useEffect(() => {
    if (!currentUser) {
      router.push('/')
    }
  }, [currentUser, router])

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!isHydrated) return

      try {
        setIsLoadingSettings(true)
        const response = await fetch('/api/settings?grouped=true&activeOnly=true')
        const data = await response.json()

        if (data.success) {
          const grouped = data.data
          const priorities = (grouped.task_priority || []).map((value: string) => ({
            value,
            label: value
          }))
          setTaskPriorityOptions(priorities)
        } else {
          console.error('Failed to load settings:', data.error)
          setError('Failed to load dropdown options. Please refresh the page.')
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
        setError('Failed to load dropdown options. Please refresh the page.')
      } finally {
        setIsLoadingSettings(false)
      }
    }

    loadSettings()
  }, [isHydrated])

  // Initialize form data and users
  useEffect(() => {
    const loadData = async () => {
      if (currentUser && isHydrated && !usersLoaded) {
        try {
          setIsLoadingUsers(true)
          // Load users for assignment
          const allUsers = await getAllUsers()
          setUsers(allUsers.filter(user => user.status === 'active'))
          setUsersLoaded(true)
        } catch (error) {
          console.error('Failed to load users:', error)
          setError('Failed to load users. Please refresh the page.')
        } finally {
          setIsLoadingUsers(false)
        }

        // Set default dates only after hydration
        const today = new Date().toISOString().split('T')[0]
        setFormData(prev => ({
          ...prev,
          startDate: today,
          endDate: today
        }))
      }
    }

    loadData()
  }, [currentUser, isHydrated, usersLoaded]) // Run when user and hydration are ready

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: value
      }
      // Auto-sync endDate when startDate is changed
      if (name === 'startDate' && value) {
        updated.endDate = value
      }
      return updated
    })
  }

  const handleSupportChange = (employeeId: string) => {
    setFormData(prev => ({
      ...prev,
      support: prev.support.includes(employeeId)
        ? prev.support.filter(id => id !== employeeId)
        : [...prev.support, employeeId]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    showGlobalLoading('Creating task...')

    try {
      if (!currentUser) {
        throw new Error('User not authenticated')
      }

      // Validation
      if (!formData.selectType || !formData.description ||
          !formData.startDate || !formData.endDate || !formData.priority || !formData.estimatedHours) {
        throw new Error('Please fill in all required fields')
      }

      if (formData.selectType === 'Recursive' && !formData.recursiveType) {
        throw new Error('Please select recursive type')
      }

      if (formData.multiUserAssignment && formData.assignees.length === 0) {
        throw new Error('Please select at least one user for multi-user assignment')
      }

      const estimatedHours = parseFloat(formData.estimatedHours)
      if (isNaN(estimatedHours) || estimatedHours <= 0) {
        throw new Error('Please enter a valid estimated hours value')
      }


      const hoursWorked = formData.hoursWorked ? parseFloat(formData.hoursWorked) : 0
      if (formData.hoursWorked && (isNaN(hoursWorked) || hoursWorked < 0)) {
        throw new Error('Please enter a valid hours worked value')
      }


      // Create task(s)
      let mainTaskData: any = null // Store main task data for support task creation

      // Check if multi-user assignment is enabled
      if (formData.multiUserAssignment && formData.assignees.length > 0) {
        // Multi-user assignment: Create separate task for each assignee
        const createdTaskIds: string[] = []

        for (const assigneeId of formData.assignees) {
          const taskId = generateTaskId()
          const taskData = {
            taskId,
            selectType: formData.selectType as 'Normal' | 'Recursive',
            recursiveType: formData.recursiveType as 'Daily' | 'Weekly' | 'Monthly' | 'Annually' | undefined,
            description: formData.description,
            assignedTo: assigneeId,
            assignedBy: currentUser.employeeId,
            support: formData.support,
            startDate: formData.startDate,
            endDate: formData.endDate,
            priority: formData.priority as 'U&I' | 'NU&I' | 'U&NI' | 'NU&NI',
            estimatedHours: estimatedHours,
            projectId: formData.projectId,
            hoursWorked: hoursWorked,
            status: 'Yet to Start' as const,
            relatedTasks: createdTaskIds.length > 0 ? createdTaskIds.join(',') : undefined
          }

          // Store first task as main task for support task creation
          if (!mainTaskData) {
            mainTaskData = taskData
          }

          const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(taskData)
          })

          if (!response.ok) {
            throw new Error(`Failed to create task for ${assigneeId}`)
          }

          createdTaskIds.push(taskId)
        }

        // Update all created tasks with complete related_tasks list
        if (createdTaskIds.length > 1) {
          const relatedTasksStr = createdTaskIds.join(',')
          for (const taskId of createdTaskIds) {
            await fetch(`/api/tasks/${taskId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ relatedTasks: relatedTasksStr })
            })
          }
        }
      } else {
        // Single user assignment (original behavior)
        const assignedToUser = formData.assignToSomeoneElse && formData.assignedTo
          ? formData.assignedTo
          : currentUser.employeeId

        const taskData = {
          taskId: generateTaskId(),
          selectType: formData.selectType as 'Normal' | 'Recursive',
          recursiveType: formData.recursiveType as 'Daily' | 'Weekly' | 'Monthly' | 'Annually' | undefined,
          description: formData.description,
          assignedTo: assignedToUser,
          assignedBy: currentUser.employeeId,
          support: formData.support, // Array of support employee IDs
          startDate: formData.startDate,
          endDate: formData.endDate,
          priority: formData.priority as 'U&I' | 'NU&I' | 'U&NI' | 'NU&NI',
          estimatedHours: estimatedHours,
          projectId: formData.projectId,
          hoursWorked: hoursWorked,
          status: 'Yet to Start' as const
        }

        mainTaskData = taskData

        // Create the main task via API
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(taskData)
        })

        if (!response.ok) {
          throw new Error('Failed to create task')
        }
      }

      // Create support tasks for each support team member (only for single assignment mode)
      if (formData.support.length > 0 && mainTaskData && !formData.multiUserAssignment) {
        try {
          const supportTaskIds = await SupportTaskService.createSupportTasks(
            mainTaskData,
            formData.support,
            users
          )
          console.log(`Created ${supportTaskIds.length} support tasks for main task ${mainTaskData.taskId}`)
        } catch (supportError) {
          console.error('Failed to create support tasks:', supportError)
          // Don't fail the main task creation if support tasks fail
        }
      }

      // Clear task cache to ensure fresh data is loaded
      optimizedDataService.clearTaskCache()

      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
      hideGlobalLoading()
    }
  }

  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0]
    setFormData({
      selectType: 'Normal',
      recursiveType: '',
      description: '',
      support: [],
      startDate: today,
      endDate: today,
      priority: '',
      estimatedHours: '',
      hoursWorked: '',
      projectId: null,
      assignToSomeoneElse: false,
      assignedTo: '',
      multiUserAssignment: false,
      assignees: []
    })
    setError('')
  }

  // Prevent hydration mismatch
  if (!isHydrated) {
    return (
      <div>
        <Navbar />
        <div className="max-w-4xl mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-96 mb-6"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!currentUser) return null

  return (
    <div>
      <Navbar />
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black">Create New Task</h1>
          <p className="text-gray-600 mt-1">Fill out the form to create a new task assignment</p>
        </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          {/* Task Type - Button Selection */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-3">
              Task Type *
            </label>
            <div className="flex gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, selectType: 'Normal', recursiveType: '' }))
                }}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 border-2 ${
                  formData.selectType === 'Normal'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                📋 Normal Task
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, selectType: 'Recursive' }))
                }}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 border-2 ${
                  formData.selectType === 'Recursive'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                🔄 Recurring Task
              </button>
            </div>
          </div>

          {/* Recursive Type - Button Selection */}
          {formData.selectType === 'Recursive' && (
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-3">
                Frequency *
              </label>
              <div className="flex gap-3 flex-wrap">
                {['Daily', 'Weekly', 'Monthly', 'Annually'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, recursiveType: type }))
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 border-2 text-sm ${
                      formData.recursiveType === type
                        ? 'bg-green-600 text-white border-green-600 shadow-lg'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-green-400 hover:bg-green-50'
                    }`}
                  >
                    {type === 'Daily' && '📅 '}
                    {type === 'Weekly' && '📆 '}
                    {type === 'Monthly' && '📊 '}
                    {type === 'Annually' && '📈 '}
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Task Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows={3}
              className="input-field"
              placeholder="Describe the task objectives and requirements..."
            />
          </div>

          {/* Project Selection */}
          <ProjectSelector
            value={formData.projectId}
            onChange={(projectId) => setFormData({ ...formData, projectId })}
            disabled={isLoading}
            required={false}
            includeNone={true}
            label="Project (Optional)"
          />

          {/* Task Assignment */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-secondary-700">
                Task Assignment
              </label>
              {(currentUser.role === 'admin' || currentUser.role === 'top_management') && (
                <>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.assignToSomeoneElse}
                      onChange={(e) => setFormData({
                        ...formData,
                        assignToSomeoneElse: e.target.checked,
                        assignedTo: e.target.checked ? formData.assignedTo : '',
                        multiUserAssignment: false,
                        assignees: []
                      })}
                      disabled={formData.multiUserAssignment}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <span className="text-sm text-gray-700">Assign to someone else</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.multiUserAssignment}
                      onChange={(e) => setFormData({
                        ...formData,
                        multiUserAssignment: e.target.checked,
                        assignees: e.target.checked ? formData.assignees : [],
                        assignToSomeoneElse: false,
                        assignedTo: ''
                      })}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">Assign to multiple users</span>
                  </label>
                </>
              )}
            </div>

            {formData.multiUserAssignment ? (
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Assign To Multiple Users *
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  Select users who will each receive their own copy of this task. All tasks will be linked together.
                </p>
                {isLoadingUsers ? (
                  <div className="border border-gray-200 rounded-lg p-6 min-h-[120px] flex items-center justify-center">
                    <LoadingSpinner size="sm" message="Loading users..." center />
                  </div>
                ) : !usersLoaded ? (
                  <div className="border border-gray-200 rounded-lg p-6 min-h-[120px] flex items-center justify-center">
                    <p className="text-gray-500">No users available</p>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                    {users.map(user => (
                      <label key={user.employeeId} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.assignees.includes(user.employeeId)}
                          onChange={(e) => {
                            const newAssignees = e.target.checked
                              ? [...formData.assignees, user.employeeId]
                              : formData.assignees.filter(id => id !== user.employeeId)
                            setFormData({ ...formData, assignees: newAssignees })
                          }}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-700">
                          {user.name} ({user.employeeId}) - {user.role}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {formData.assignees.length > 0 && (
                  <p className="text-sm text-purple-600 mt-2">
                    {formData.assignees.length} user(s) selected - {formData.assignees.length} task(s) will be created
                  </p>
                )}
              </div>
            ) : formData.assignToSomeoneElse ? (
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Assign To *
                </label>
                <select
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  required
                  className="input-field"
                  disabled={isLoading || isLoadingUsers}
                >
                  <option value="">Select user...</option>
                  {users.map(user => (
                    <option key={user.employeeId} value={user.employeeId}>
                      {user.name} ({user.employeeId}) - {user.role}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-blue-800">Auto-Assignment</span>
                </div>
                <p className="text-sm text-blue-700">
                  This task will be automatically assigned to you ({currentUser.name} - {currentUser.employeeId})
                </p>
              </div>
            )}
          </div>

          {/* Support Team */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Support Team (Optional)
            </label>
            <p className="text-sm text-gray-600 mb-3">
              Select team members who will receive separate support tasks. Each selected member will get their own task to track their contribution.
            </p>
            {!usersLoaded ? (
              <div className="border border-gray-200 rounded-lg p-6 min-h-[120px] flex items-center justify-center">
                {isLoadingUsers ? (
                  <LoadingSpinner size="sm" message="Loading team members..." center />
                ) : (
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {users
                  .filter(user => user.employeeId !== currentUser.employeeId) // Exclude current user
                  .map(user => (
                <label key={user.employeeId} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.support.includes(user.employeeId)}
                    onChange={() => handleSupportChange(user.employeeId)}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-500">{user.employeeId} - {user.department}</div>
                  </div>
                </label>
              ))}
              </div>
            )}
            {formData.support.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-gray-600 mb-2">Selected support team:</p>
                <div className="flex flex-wrap gap-2">
                  {formData.support.map(employeeId => {
                    const user = users.find(u => u.employeeId === employeeId)
                    return user ? (
                      <span key={employeeId} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                        {user.name}
                      </span>
                    ) : null
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Dates and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Start Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400" />
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                  className="input-field pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                End Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400" />
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  required
                  className="input-field pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Priority *
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                required
                disabled={isLoadingSettings}
                className="input-field"
              >
                <option value="">Choose priority...</option>
                {taskPriorityOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Estimated Hours, Hours Worked, and SubTask */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Estimated Hours *
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400" />
                <input
                  type="number"
                  name="estimatedHours"
                  value={formData.estimatedHours}
                  onChange={handleInputChange}
                  required
                  step="0.5"
                  min="0.5"
                  className="input-field pl-10"
                  placeholder="e.g., 2.5"
                />
              </div>
              <p className="text-xs text-secondary-500 mt-1">
                Enter in hours (0.5 = 30 minutes, 1.0 = 1 hour)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Hours Worked (Optional)
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400" />
                <input
                  type="number"
                  name="hoursWorked"
                  value={formData.hoursWorked}
                  onChange={handleInputChange}
                  step="0.5"
                  min="0"
                  className="input-field pl-10"
                  placeholder="e.g., 1.5"
                />
              </div>
              <p className="text-xs text-secondary-500 mt-1">
                Hours already worked on this task
              </p>
            </div>

          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-secondary-200">
            <button
              type="button"
              onClick={resetForm}
              className="btn-secondary flex items-center space-x-2"
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </button>
            <LoadingButton
              type="submit"
              isLoading={isLoading}
              loadingText="Creating..."
              variant="primary"
              className="flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Create Task</span>
            </LoadingButton>
          </div>
        </form>
      </div>
      </div>
    </div>
  )
}
