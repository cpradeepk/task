'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getCurrentUser, getAllUsers } from '@/lib/auth'
// Removed: import { generateTaskId } from '@/lib/data'
// Task IDs are now generated server-side in the API route for consistency

import { optimizedDataService } from '@/lib/optimizedDataService'
import SupportTaskService from '@/lib/supportTaskService'
import { usePageLoading } from '@/hooks/usePageLoading'
import { User } from '@/lib/types'
import { Save, X, Calendar, Clock, AlertCircle, CheckSquare, Paperclip, FileText, Tag } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import LoadingButton from '@/components/ui/LoadingButton'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useLoading } from '@/contexts/LoadingContext'
import ProjectSelector from '@/components/ProjectSelector'
import FileUpload from '@/components/bugs/FileUpload'
import { useSettingsIcons } from '@/hooks/useSettingsIcons'

function CreateTaskContent() {
  const [formData, setFormData] = useState({
    selectType: 'Normal',
    recursiveType: '',
    name: '', // Task name/title (short, for list display)
    description: '', // Task description/details (full details)
    support: [] as string[], // Array of employee IDs for support
    startDate: '',
    endDate: '',
    priority: '',
    status: 'Open', // Default status
    estimatedHours: '', // Format: hh:mm:ss
    projectId: undefined as string | undefined,
    subprojectId: undefined as string | undefined,
    department: '', // Department field (mandatory)
    assignedTo: '',
    multiUserAssignment: false, // Enable multi-user assignment
    assignees: [] as string[], // Array of employee IDs for multi-user assignment
    attachments: '', // File attachments
    parentTaskId: undefined as string | undefined // Parent task ID for subtasks
  })
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [usersLoaded, setUsersLoaded] = useState(false)
  const [error, setError] = useState('')
  const [isHydrated, setIsHydrated] = useState(false)

  // Settings state
  const [taskStatusOptions, setTaskStatusOptions] = useState<string[]>([])
  const [taskPriorityOptions, setTaskPriorityOptions] = useState<string[]>([])
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([])
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)

  // Project state
  const [projects, setProjects] = useState<any[]>([])
  const [subprojects, setSubprojects] = useState<any[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [isLoadingSubprojects, setIsLoadingSubprojects] = useState(false)
  const [projectsLoaded, setProjectsLoaded] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const currentUser = getCurrentUser()
  const { showGlobalLoading, hideGlobalLoading } = useLoading()

  // Load icons from settings metadata
  const { getIcon, isLoading: isLoadingIcons } = useSettingsIcons()

  // Handle hydration and read query parameters from URL
  useEffect(() => {
    setIsHydrated(true)

    // Read all query parameters for prefilling form
    const parentTaskId = searchParams.get('parentTaskId')
    const projectId = searchParams.get('projectId')
    const subprojectId = searchParams.get('subprojectId')
    const department = searchParams.get('department')
    const status = searchParams.get('status')

    // Update form data with query parameters
    setFormData(prev => ({
      ...prev,
      ...(parentTaskId && { parentTaskId }),
      ...(projectId && { projectId }),
      ...(subprojectId && { subprojectId }),
      ...(department && { department }),
      ...(status && { status })
    }))
  }, [searchParams])

  // Authentication check
  useEffect(() => {
    if (!currentUser) {
      router.push('/')
    }
  }, [currentUser, router])

  // Load settings from database
  const loadSettings = useCallback(async () => {
    if (settingsLoaded) return

    try {
      setIsLoadingSettings(true)

      // Fetch all settings
      const response = await fetch('/api/settings')
      const data = await response.json()

      if (data.success && data.data) {
        const settings = data.data

        // Process task statuses
        const statusesSetting = settings.find((s: any) => s.key === 'task_statuses')
        const statuses = statusesSetting?.value || ['Open', 'In Progress', 'Delayed', 'On Hold', 'ReOpened', 'Cancelled', 'Completed']
        setTaskStatusOptions(statuses)

        // Process task priorities
        const prioritiesSetting = settings.find((s: any) => s.key === 'task_priorities')
        const priorities = prioritiesSetting?.value || ['IU&I (Important & Urgent)', 'IU&NI (Important & Not Urgent)', 'NU&I (Not Urgent & Important)', 'NU&NI (Not Urgent & Not Important)']
        setTaskPriorityOptions(priorities)

        // Process departments
        const departmentsSetting = settings.find((s: any) => s.key === 'departments')
        const departments = departmentsSetting?.value || []
        setDepartmentOptions(departments)

        console.log('Task settings loaded successfully:', { statuses, priorities, departments })
      } else {
        console.warn('Settings API returned empty data, using defaults:', data)
        // Use default options if API returns empty
        setTaskStatusOptions(['Open', 'In Progress', 'Delayed', 'On Hold', 'ReOpened', 'Cancelled', 'Completed'])
        setTaskPriorityOptions(['IU&I (Important & Urgent)', 'IU&NI (Important & Not Urgent)', 'NU&I (Not Urgent & Important)', 'NU&NI (Not Urgent & Not Important)'])
        setDepartmentOptions([])
      }

      setSettingsLoaded(true)
    } catch (error) {
      console.error('Failed to load settings:', error)
      // Use default options on error
      setTaskStatusOptions(['Open', 'In Progress', 'Delayed', 'On Hold', 'ReOpened', 'Cancelled', 'Completed'])
      setTaskPriorityOptions(['IU&I (Important & Urgent)', 'IU&NI (Important & Not Urgent)', 'NU&I (Not Urgent & Important)', 'NU&NI (Not Urgent & Not Important)'])
      setDepartmentOptions([])
      setError('Using default dropdown options. Database settings may be unavailable.')
      setSettingsLoaded(true)
    } finally {
      setIsLoadingSettings(false)
    }
  }, [settingsLoaded])

  // Load users
  const loadUsers = useCallback(async () => {
    if (usersLoaded) return

    try {
      setIsLoadingUsers(true)
      const allUsers = await getAllUsers()
      // Sort by employeeId
      const activeUsers = allUsers
        .filter(user => user.status === 'active')
        .sort((a, b) => {
          const idA = a.employeeId || ''
          const idB = b.employeeId || ''
          return idA.localeCompare(idB)
        })
      setUsers(activeUsers)
      setUsersLoaded(true)
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setIsLoadingUsers(false)
    }
  }, [usersLoaded])

  // Load projects (main projects only, no subprojects)
  const loadProjects = useCallback(async () => {
    if (projectsLoaded) return

    try {
      setIsLoadingProjects(true)
      const response = await fetch('/api/projects?type=main')
      const data = await response.json()

      // API returns array directly, not wrapped in {success, data}
      if (Array.isArray(data)) {
        // Filter to only main projects (no parent) and sort by projectId
        const mainProjects = data.filter((p: any) => !p.parentProjectId)
        const sorted = mainProjects.sort((a: any, b: any) => {
          const idA = a.projectId || ''
          const idB = b.projectId || ''
          return idA.localeCompare(idB)
        })
        setProjects(sorted)
        setProjectsLoaded(true)
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setIsLoadingProjects(false)
    }
  }, [projectsLoaded])

  // Load subprojects when project changes
  const loadSubprojects = useCallback(async (projectId: string) => {
    if (!projectId) {
      setSubprojects([])
      return
    }

    try {
      setIsLoadingSubprojects(true)
      const response = await fetch(`/api/projects?parentId=${projectId}`)
      const data = await response.json()

      // API returns array directly, not wrapped in {success, data}
      if (Array.isArray(data)) {
        // Filter to only subprojects of the selected project and sort by projectId
        const projectSubprojects = data.filter((p: any) => p.parentProjectId === projectId)
        const sorted = projectSubprojects.sort((a: any, b: any) => {
          const idA = a.projectId || ''
          const idB = b.projectId || ''
          return idA.localeCompare(idB)
        })
        setSubprojects(sorted)
      }
    } catch (error) {
      console.error('Failed to load subprojects:', error)
    } finally {
      setIsLoadingSubprojects(false)
    }
  }, [])

  // Initialize data loading
  useEffect(() => {
    if (!isHydrated) return

    // If currentUser is still being loaded (undefined), wait
    if (currentUser === undefined) return

    // If currentUser is null after hydration, redirect to login
    if (currentUser === null) {
      router.push('/')
      return
    }

    // Set default dates only once on mount
    const today = new Date().toISOString().split('T')[0]
    setFormData(prev => {
      // Only set if not already set to prevent infinite loop
      if (!prev.startDate && !prev.endDate) {
        return {
          ...prev,
          startDate: today,
          endDate: today
        }
      }
      return prev
    })

    loadUsers()
    loadSettings()
    loadProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated])

  // Load subprojects when project changes
  useEffect(() => {
    if (formData.projectId) {
      loadSubprojects(formData.projectId)
    } else {
      setSubprojects([])
      setFormData(prev => ({ ...prev, subprojectId: undefined }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.projectId])

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
      if (!formData.selectType || !formData.name || !formData.description ||
          !formData.startDate || !formData.endDate || !formData.priority || !formData.estimatedHours) {
        throw new Error('Please fill in all required fields')
      }

      // Validate name length
      if (formData.name.trim().length < 3) {
        throw new Error('Task name must be at least 3 characters long')
      }
      if (formData.name.length > 150) {
        throw new Error('Task name must not exceed 150 characters')
      }

      // Validate mandatory project field
      if (!formData.projectId) {
        throw new Error('Please select a Project')
      }

      // Sub Project is now optional - no validation needed

      // Validate mandatory department field
      if (!formData.department) {
        throw new Error('Please select a Department')
      }

      if (formData.selectType === 'Recursive' && !formData.recursiveType) {
        throw new Error('Please select recursive type')
      }

      if (formData.multiUserAssignment && formData.assignees.length === 0) {
        throw new Error('Please select at least one user for multi-user assignment')
      }

      // Convert hh:mm:ss to decimal hours
      const timeRegex = /^(\d{1,2}):(\d{2}):(\d{2})$/
      const timeMatch = formData.estimatedHours.match(timeRegex)

      if (!timeMatch) {
        throw new Error('Please enter estimated hours in hh:mm:ss format (e.g., 02:30:00)')
      }

      const hours = parseInt(timeMatch[1], 10)
      const minutes = parseInt(timeMatch[2], 10)
      const seconds = parseInt(timeMatch[3], 10)

      if (minutes >= 60 || seconds >= 60) {
        throw new Error('Invalid time format: minutes and seconds must be less than 60')
      }

      const estimatedHours = hours + (minutes / 60) + (seconds / 3600)

      if (estimatedHours <= 0) {
        throw new Error('Estimated hours must be greater than 0')
      }

      let attachmentUrls: string[] = []

      // Upload files if any using S3 presigned URLs
      if (uploadedFiles.length > 0) {
        setIsUploading(true)
        try {
          // Prepare files array for API
          const filesData = uploadedFiles.map(file => ({
            name: file.name,
            type: file.type,
            size: file.size
          }))

          // Get presigned URLs for all files
          const presignResponse = await fetch('/api/upload/presigned-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files: filesData })
          })

          if (!presignResponse.ok) {
            const errorData = await presignResponse.json()
            throw new Error(errorData.error || 'Failed to get upload URLs')
          }

          const { success, uploads, errors } = await presignResponse.json()

          if (!success || !uploads || uploads.length === 0) {
            throw new Error(errors?.join(', ') || 'Failed to generate upload URLs')
          }

          // Upload each file to S3 using presigned URLs
          for (let i = 0; i < uploads.length; i++) {
            const upload = uploads[i]
            const file = uploadedFiles[i]

            const uploadResponse = await fetch(upload.uploadUrl, {
              method: 'PUT',
              body: file,
              headers: {
                'Content-Type': file.type
              }
            })

            if (!uploadResponse.ok) {
              throw new Error(`Failed to upload ${file.name}`)
            }

            attachmentUrls.push(upload.fileUrl)
          }

          // Show warning if some files failed
          if (errors && errors.length > 0) {
            console.warn('Some files failed to upload:', errors)
          }
        } catch (uploadError) {
          console.error('File upload error:', uploadError)
          throw new Error(uploadError instanceof Error ? uploadError.message : 'Failed to upload attachments. Please try again.')
        } finally {
          setIsUploading(false)
        }
      }

      // Create task
      let mainTaskData: any = null // Store main task data for support task creation

      // Determine assignees based on multi-user assignment or single assignment
      let assignedToUsers: string[] = []

      if (formData.multiUserAssignment && formData.assignees.length > 0) {
        // Multi-user assignment: Use all selected assignees in a single task
        assignedToUsers = formData.assignees
      } else {
        // Single user assignment - must select a user
        if (!formData.assignedTo) {
          setError('Please select a user to assign the task to')
          setIsLoading(false)
          hideGlobalLoading()
          return
        }
        assignedToUsers = [formData.assignedTo]
      }

      // Task ID will be generated server-side in the API route
      const taskData = {
        selectType: formData.selectType as 'Normal' | 'Recursive',
        recursiveType: formData.recursiveType as 'Daily' | 'Weekly' | 'Monthly' | 'Annually' | undefined,
        name: formData.name,
        description: formData.description,
        assignedTo: assignedToUsers, // Now an array of employee IDs
        assignedBy: currentUser.employeeId,
        support: formData.support, // Array of support employee IDs
        startDate: formData.startDate,
        endDate: formData.endDate,
        priority: formData.priority,
        estimatedHours: estimatedHours,
        projectId: formData.projectId,
        subprojectId: formData.subprojectId,
        department: formData.department,
        status: formData.status || 'Open',
        attachments: attachmentUrls.length > 0 ? attachmentUrls.join(',') : undefined
      }

      mainTaskData = taskData

      // Create the task via API
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

      // Support tasks are no longer needed - removed as per user requirement
      // (Multiple assignees are now supported in a single task)
      if (false) {
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

      // Redirect to the newly created task's detail page
      // Use the first created task ID (mainTaskData.taskId) for navigation
      const createdTaskId = mainTaskData?.taskId
      if (createdTaskId) {
        router.push(`/tasks/${createdTaskId}`)
      } else {
        // Fallback to dashboard if no task ID available
        router.push('/dashboard')
      }
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
      name: '',
      description: '',
      support: [],
      startDate: today,
      endDate: today,
      priority: '',
      status: 'Open',
      estimatedHours: '',
      projectId: undefined,
      subprojectId: undefined,
      department: '', // Department field (mandatory)
      assignedTo: '',
      multiUserAssignment: false,
      assignees: [],
      attachments: '',
      parentTaskId: undefined
    })
    setUploadedFiles([])
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

          {/* Task Name */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Task Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              maxLength={150}
              className="input-field"
              placeholder="Enter a short, descriptive task name (max 150 characters)"
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.name.length}/150 characters
            </p>
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
              placeholder="Describe the task objectives and requirements in detail..."
            />
          </div>

          {/* Project and Subproject Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Project *
              </label>
              <select
                value={formData.projectId || ''}
                onChange={(e) => {
                  const projectId = e.target.value || undefined
                  setFormData(prev => ({ ...prev, projectId, subprojectId: undefined }))
                }}
                className="input-field"
                disabled={isLoadingProjects}
                required
              >
                <option value="">Select Project...</option>
                {!projectsLoaded ? (
                  <option disabled>Loading projects...</option>
                ) : (
                  projects.map((project) => (
                    <option key={project.projectId} value={project.projectId}>
                      {project.projectId} - {project.projectName}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Sub Project <span className="text-gray-400 text-xs">(Optional)</span>
              </label>
              <select
                value={formData.subprojectId || ''}
                onChange={(e) => {
                  const subprojectId = e.target.value || undefined
                  setFormData(prev => ({ ...prev, subprojectId }))
                }}
                className="input-field"
                disabled={!formData.projectId || isLoadingSubprojects}
              >
                <option value="">Select Sub Project...</option>
                {isLoadingSubprojects ? (
                  <option disabled>Loading subprojects...</option>
                ) : (
                  subprojects.map((subproject) => (
                    <option key={subproject.projectId} value={subproject.projectId}>
                      {subproject.projectId} - {subproject.projectName}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Department Field */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Department *
            </label>
            <select
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              required
              disabled={isLoadingSettings}
              className="input-field"
            >
              <option value="">Select Department...</option>
              {isLoadingSettings ? (
                <option>Loading...</option>
              ) : (
                departmentOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Status *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                required
                disabled={isLoadingSettings}
                className="input-field"
              >
                {isLoadingSettings ? (
                  <option>Loading...</option>
                ) : (
                  taskStatusOptions.map(option => {
                    const icon = getIcon('task_statuses', option)
                    return (
                      <option key={option} value={option}>
                        {icon && `${icon} `}{option}
                      </option>
                    )
                  })
                )}
              </select>
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
                {isLoadingSettings ? (
                  <option>Loading...</option>
                ) : (
                  taskPriorityOptions.map(option => {
                    const icon = getIcon('task_priorities', option)
                    return (
                      <option key={option} value={option}>
                        {icon && `${icon} `}{option}
                      </option>
                    )
                  })
                )}
              </select>
            </div>
          </div>

          {/* Task Assignment */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-secondary-700">
                Task Assignment
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.multiUserAssignment}
                  onChange={(e) => setFormData({
                    ...formData,
                    multiUserAssignment: e.target.checked,
                    assignees: e.target.checked ? formData.assignees : [],
                    assignedTo: ''
                  })}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">Assign to multiple users</span>
              </label>
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
                    {formData.assignees.length} user(s) selected - 1 task will be created with multiple assignees
                  </p>
                )}
              </div>
            ) : (
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
                {users.map(user => (
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

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          </div>

          {/* Estimated Hours */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Estimated Hours *
            </label>
            <div className="relative max-w-md">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400" />
              <input
                type="text"
                name="estimatedHours"
                value={formData.estimatedHours}
                onChange={handleInputChange}
                required
                className="input-field pl-10"
                placeholder="hh:mm:ss (e.g., 02:30:00)"
                pattern="^\d{1,2}:\d{2}:\d{2}$"
                title="Enter time in hh:mm:ss format (e.g., 02:30:00)"
              />
            </div>
            <p className="text-xs text-secondary-500 mt-1">
              Enter estimated time in hh:mm:ss format (e.g., 02:30:00 for 2.5 hours)
            </p>
          </div>

          {/* File Attachments */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2 flex items-center space-x-2">
              <Paperclip className="h-4 w-4" />
              <span>Attachments (Optional)</span>
            </label>
            <FileUpload
              onFilesChange={setUploadedFiles}
              maxFiles={5}
              maxSizeMB={10}
            />
            <p className="text-xs text-gray-500 mt-2">
              Upload screenshots, documents, or other relevant files (max 5 files, 10MB each)
            </p>
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

export default function CreateTask() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto p-6">
          <LoadingSpinner />
        </div>
      </div>
    }>
      <CreateTaskContent />
    </Suspense>
  )
}
