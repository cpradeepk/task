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

export default function CreateTask() {
  const [formData, setFormData] = useState({
    selectType: '',
    recursiveType: '',
    description: '',
    support: [] as string[], // Array of employee IDs for support
    startDate: '',
    endDate: '',
    priority: '',
    estimatedHours: '',
    hoursWorked: '',
    subTask: ''
  })
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [usersLoaded, setUsersLoaded] = useState(false)
  const [error, setError] = useState('')
  const [isHydrated, setIsHydrated] = useState(false)
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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
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

      const estimatedHours = parseFloat(formData.estimatedHours)
      if (isNaN(estimatedHours) || estimatedHours <= 0) {
        throw new Error('Please enter a valid estimated hours value')
      }


      const hoursWorked = formData.hoursWorked ? parseFloat(formData.hoursWorked) : 0
      if (formData.hoursWorked && (isNaN(hoursWorked) || hoursWorked < 0)) {
        throw new Error('Please enter a valid hours worked value')
      }


      // Create task
      const taskData = {
        taskId: generateTaskId(),
        selectType: formData.selectType as 'Normal' | 'Recursive',
        recursiveType: formData.recursiveType as 'Daily' | 'Weekly' | 'Monthly' | 'Annually' | undefined,
        description: formData.description,
        assignedTo: currentUser.employeeId, // Automatically assign to logged-in user
        assignedBy: currentUser.employeeId,
        support: formData.support, // Array of support employee IDs
        startDate: formData.startDate,
        endDate: formData.endDate,
        priority: formData.priority as 'U&I' | 'NU&I' | 'U&NI' | 'NU&NI',
        estimatedHours: estimatedHours,
        hoursWorked: hoursWorked,
        status: 'Yet to Start' as const,
        subTask: formData.subTask || undefined
      }

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

      // Create support tasks for each support team member
      if (formData.support.length > 0) {
        try {
          const supportTaskIds = await SupportTaskService.createSupportTasks(
            taskData,
            formData.support,
            users
          )
          console.log(`Created ${supportTaskIds.length} support tasks for main task ${taskData.taskId}`)
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
      selectType: '',
      recursiveType: '',
      description: '',
      support: [],
      startDate: today,
      endDate: today,
      priority: '',
      estimatedHours: '',
      hoursWorked: '',
      subTask: ''
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

          {/* Task Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Task Type *
              </label>
              <select
                name="selectType"
                value={formData.selectType}
                onChange={handleInputChange}
                required
                className="input-field"
              >
                <option value="">Choose task type...</option>
                <option value="Normal">Normal</option>
                <option value="Recursive">Recursive</option>
              </select>
            </div>

            {formData.selectType === 'Recursive' && (
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Recursive Type *
                </label>
                <select
                  name="recursiveType"
                  value={formData.recursiveType}
                  onChange={handleInputChange}
                  required={formData.selectType === 'Recursive'}
                  className="input-field"
                >
                  <option value="">Choose frequency...</option>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Annually">Annually</option>
                </select>
              </div>
            )}
          </div>

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

          {/* Task Assignment Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-blue-800">Task Assignment</span>
            </div>
            <p className="text-sm text-blue-700">
              This task will be automatically assigned to you ({currentUser.name} - {currentUser.employeeId})
            </p>
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
                className="input-field"
              >
                <option value="">Choose priority...</option>
                <option value="U&I">Urgent & Important</option>
                <option value="NU&I">Not Urgent but Important</option>
                <option value="U&NI">Urgent but Not Important</option>
                <option value="NU&NI">Not Urgent & Not Important</option>
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

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Sub Task (Optional)
              </label>
              <input
                type="text"
                name="subTask"
                value={formData.subTask}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Sub task details..."
              />
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
