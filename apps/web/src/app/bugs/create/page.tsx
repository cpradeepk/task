'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { BugFormData, User } from '@/lib/types'
import { createBug } from '@/lib/bugService'
import { getCurrentUser, getAllUsers } from '@/lib/auth'
import { Bug, AlertCircle, Save, X, FileText, Settings, CheckSquare, Paperclip, Clock, Tag } from 'lucide-react'
import LoadingButton from '@/components/ui/LoadingButton'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ProjectSelector from '@/components/ProjectSelector'
import FileUpload from '@/components/bugs/FileUpload'
import { getIconForSettingValueSync } from '@/lib/iconMappings'

export default function CreateBugPage() {
  const [formData, setFormData] = useState<BugFormData>({
    title: '',
    description: '',
    severity: 'Minor',
    priority: 'Low',
    category: 'Other',
    platform: 'Web',
    environment: 'Production',
    browserInfo: '',
    deviceInfo: '',
    stepsToReproduce: '',
    expectedBehavior: '',
    actualBehavior: '',
    attachments: '',
    tags: '',
    relatedBugs: '',
    projectId: undefined,
    subprojectId: undefined,
    feature: '',
    type: undefined
  })

  const [projects, setProjects] = useState<any[]>([])
  const [subprojects, setSubprojects] = useState<any[]>([])
  const [allBugs, setAllBugs] = useState<any[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [isLoadingSubprojects, setIsLoadingSubprojects] = useState(false)
  const [isLoadingBugs, setIsLoadingBugs] = useState(false)
  const [projectsLoaded, setProjectsLoaded] = useState(false)
  
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [usersLoaded, setUsersLoaded] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [error, setError] = useState('')
  const [isHydrated, setIsHydrated] = useState(false)

  // Settings state
  const [severityOptions, setSeverityOptions] = useState<string[]>([])
  const [categoryOptions, setCategoryOptions] = useState<string[]>([])
  const [platformOptions, setPlatformOptions] = useState<string[]>([])
  const [environmentOptions, setEnvironmentOptions] = useState<string[]>([])
  const [bugTypeOptions, setBugTypeOptions] = useState<string[]>([])
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)

  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined)

  const router = useRouter()

  // Handle hydration and get current user
  useEffect(() => {
    setIsHydrated(true)
    const user = getCurrentUser()
    setCurrentUser(user)
  }, [])

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

  const loadSettings = useCallback(async () => {
    if (settingsLoaded) return

    try {
      setIsLoadingSettings(true)

      // Fetch all settings grouped by type
      const response = await fetch('/api/settings?grouped=true&activeOnly=true')
      const data = await response.json()

      if (data.success && data.data) {
        const grouped = data.data

        // Set options from database, with fallback to defaults if empty
        setSeverityOptions(grouped.severity && grouped.severity.length > 0 ? grouped.severity : ['Critical', 'Major', 'Minor'])
        setCategoryOptions(grouped.category && grouped.category.length > 0 ? grouped.category : ['UI', 'API', 'Backend', 'Performance', 'Security', 'Database', 'Integration', 'Other'])
        setPlatformOptions(grouped.platform && grouped.platform.length > 0 ? grouped.platform : ['Web', 'iOS', 'Android', 'All'])
        setEnvironmentOptions(grouped.environment && grouped.environment.length > 0 ? grouped.environment : ['Development', 'Staging', 'UAT', 'Production'])
        setBugTypeOptions(grouped.bug_type && grouped.bug_type.length > 0 ? grouped.bug_type : ['testcase', 'feature', 'other'])

        console.log('Settings loaded successfully:', grouped)
      } else {
        console.warn('Settings API returned empty data, using defaults:', data)
        // Use default options if API returns empty
        setSeverityOptions(['Critical', 'Major', 'Minor'])
        setCategoryOptions(['UI', 'API', 'Backend', 'Performance', 'Security', 'Database', 'Integration', 'Other'])
        setPlatformOptions(['Web', 'iOS', 'Android', 'All'])
        setEnvironmentOptions(['Development', 'Staging', 'UAT', 'Production'])
        setBugTypeOptions(['testcase', 'feature', 'other'])
      }

      setSettingsLoaded(true)
    } catch (error) {
      console.error('Failed to load settings:', error)
      // Use default options on error
      setSeverityOptions(['Critical', 'Major', 'Minor'])
      setCategoryOptions(['UI', 'API', 'Backend', 'Performance', 'Security', 'Database', 'Integration', 'Other'])
      setPlatformOptions(['Web', 'iOS', 'Android', 'All'])
      setEnvironmentOptions(['Development', 'Staging', 'UAT', 'Production'])
      setBugTypeOptions(['testcase', 'feature', 'other'])
      setError('Using default dropdown options. Database settings may be unavailable.')
      setSettingsLoaded(true)
    } finally {
      setIsLoadingSettings(false)
    }
  }, [settingsLoaded])

  // Load projects
  const loadProjects = useCallback(async () => {
    if (projectsLoaded) return

    try {
      setIsLoadingProjects(true)
      const response = await fetch('/api/projects')
      const data = await response.json()

      // API returns array directly, not wrapped in {success, data}
      if (Array.isArray(data)) {
        // Sort by projectId
        const sorted = data.sort((a: any, b: any) => {
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
      if (data.success) {
        // Sort by projectId
        const sorted = data.data.sort((a: any, b: any) => {
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

  // Load bugs for related bugs dropdown
  const loadBugs = useCallback(async (projectId?: string) => {
    try {
      setIsLoadingBugs(true)
      let url = '/api/bugs?status=New,In Progress,Reopened'
      if (projectId) {
        url += `&projectId=${projectId}`
      }
      const response = await fetch(url)
      const data = await response.json()
      if (data.success) {
        setAllBugs(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load bugs:', error)
    } finally {
      setIsLoadingBugs(false)
    }
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    // If currentUser is still being loaded (undefined), wait
    if (currentUser === undefined) return

    // If currentUser is null after hydration, redirect to login
    if (currentUser === null) {
      router.push('/')
      return
    }

    // Admin users have full access to bug tracking

    loadUsers()
    loadSettings()
    loadProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, router, isHydrated])

  // Load subprojects and bugs when project changes
  useEffect(() => {
    if (formData.projectId) {
      loadSubprojects(formData.projectId)
      loadBugs(formData.projectId)
    } else {
      setSubprojects([])
      setFormData(prev => ({ ...prev, subprojectId: undefined }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.projectId])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentUser) return

    // Validate required fields
    if (!formData.title.trim()) {
      setError('Feature name is required')
      return
    }

    if (!formData.description.trim()) {
      setError('Description is required')
      return
    }

    if (!formData.projectId) {
      setError('Project is required')
      return
    }

    if (!formData.subprojectId) {
      setError('Subproject is required')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      let attachmentUrls: string[] = []

      // Upload files if any using S3 presigned URLs
      if (uploadedFiles.length > 0) {
        setIsUploading(true)

        try {
          // Step 1: Get presigned URLs from backend
          const presignedResponse = await fetch('/api/upload/presigned-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              files: uploadedFiles.map(file => ({
                name: file.name,
                type: file.type,
                size: file.size
              }))
            })
          })

          const presignedResult = await presignedResponse.json()

          if (!presignedResult.success) {
            throw new Error(presignedResult.error || 'Failed to get upload URLs')
          }

          // Step 2: Upload files directly to S3
          const uploadPromises = presignedResult.uploads.map(async (upload: any, index: number) => {
            const file = uploadedFiles[index]

            const s3Response = await fetch(upload.uploadUrl, {
              method: 'PUT',
              body: file,
              headers: {
                'Content-Type': file.type
              }
            })

            if (!s3Response.ok) {
              throw new Error(`Failed to upload ${file.name} to S3`)
            }

            return upload.fileUrl
          })

          attachmentUrls = await Promise.all(uploadPromises)
        } catch (uploadError) {
          setIsUploading(false)
          throw uploadError
        }

        setIsUploading(false)
      }

      const bugData = {
        ...formData,
        attachments: attachmentUrls.join(', '),
        reportedBy: currentUser.employeeId
      }

      const bugId = await createBug(bugData)

      if (bugId) {
        router.push(`/bugs/${bugId}`)
      } else {
        setError('Failed to create bug. Please try again.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsUploading(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Prevent hydration mismatch by not rendering until hydrated
  if (!isHydrated) {
    return (
      <div>
        <Navbar />
        <LoadingSpinner size="lg" message="Loading..." center />
      </div>
    )
  }

  if (!currentUser) return null

  return (
    <div>
      <Navbar />
      <div className="max-w-5xl mx-auto p-6 content-fade-in page-transition">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Bug className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Report New Bug</h1>
              <p className="text-gray-600 mt-1">Help us improve by reporting issues you've encountered</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Before reporting a bug:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>Check if this issue has already been reported</li>
                  <li>Provide as much detail as possible to help us reproduce the issue</li>
                  <li>Include screenshots or videos if they help explain the problem</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Basic Information Section */}
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <Bug className="h-5 w-5 text-blue-600" />
                  <span>Bug Information</span>
                </h2>
                <p className="text-sm text-gray-600 mt-1">Provide basic details about the bug</p>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {/* Project and Subproject - MOVED TO TOP */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Project <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="projectId"
                      value={formData.projectId || ''}
                      onChange={(e) => {
                        const value = e.target.value
                        setFormData(prev => ({ ...prev, projectId: value || undefined, subprojectId: undefined }))
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                      required
                      disabled={isLoadingProjects}
                    >
                      <option value="">Select project...</option>
                      {projects.map(project => (
                        <option key={project.projectId} value={project.projectId}>
                          {project.projectName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Subproject <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="subprojectId"
                      value={formData.subprojectId || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, subprojectId: e.target.value || undefined }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                      disabled={!formData.projectId || isLoadingSubprojects}
                      required
                    >
                      <option value="">Select subproject...</option>
                      {subprojects.map(subproject => (
                        <option key={subproject.projectId} value={subproject.projectId}>
                          {subproject.projectName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Feature (renamed from Bug Title) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Feature <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="e.g., User Login, Payment Gateway, Dashboard"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Specify which feature this bug is related to
                  </p>
                </div>

                {/* Criticality, Category, Platform - 3 columns (removed Priority) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Criticality <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="severity"
                      value={formData.severity}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                      required
                      disabled={isLoadingSettings}
                    >
                      {isLoadingSettings ? (
                        <option>Loading...</option>
                      ) : (
                        severityOptions.map(option => {
                          const icon = getIconForSettingValueSync('severities', option)
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                      required
                      disabled={isLoadingSettings}
                    >
                      {isLoadingSettings ? (
                        <option>Loading...</option>
                      ) : (
                        categoryOptions.map(option => {
                          const icon = getIconForSettingValueSync('categories', option)
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Platform <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="platform"
                      value={formData.platform}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                      required
                      disabled={isLoadingSettings}
                    >
                      {isLoadingSettings ? (
                        <option>Loading...</option>
                      ) : (
                        platformOptions.map(option => {
                          const icon = getIconForSettingValueSync('platforms', option)
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

                {/* Technical Details - Environment, Browser, Device (MOVED HERE) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Environment <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="environment"
                      value={formData.environment}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                      required
                      disabled={isLoadingSettings}
                    >
                      {isLoadingSettings ? (
                        <option>Loading...</option>
                      ) : (
                        environmentOptions.map(option => {
                          const icon = getIconForSettingValueSync('environments', option)
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Browser Information
                    </label>
                    <input
                      type="text"
                      name="browserInfo"
                      value={formData.browserInfo}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="e.g., Chrome 91, Safari 14.1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Device Information
                    </label>
                    <input
                      type="text"
                      name="deviceInfo"
                      value={formData.deviceInfo}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="e.g., iPhone 12, Windows 10"
                    />
                  </div>
                </div>

                {/* Bug Type and Related Bugs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Bug Type (Optional)
                    </label>
                    <select
                      name="type"
                      value={formData.type || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                      disabled={isLoadingSettings}
                    >
                      <option value="">Select type...</option>
                      {bugTypeOptions.map(type => {
                        const icon = getIconForSettingValueSync('bug_types', type)
                        return (
                          <option key={type} value={type}>
                            {icon && `${icon} `}{type.charAt(0).toUpperCase() + type.slice(1)}
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                      <Bug className="h-4 w-4" />
                      <span>Related Bugs (Optional)</span>
                    </label>
                    <select
                      multiple
                      name="relatedBugs"
                      value={formData.relatedBugs ? formData.relatedBugs.split(',').map(b => b.trim()) : []}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions).map(opt => opt.value)
                        setFormData(prev => ({ ...prev, relatedBugs: selected.join(', ') }))
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                      disabled={isLoadingBugs || !formData.projectId}
                      size={4}
                    >
                      {isLoadingBugs ? (
                        <option disabled>Loading bugs...</option>
                      ) : allBugs.length === 0 ? (
                        <option disabled>No open bugs in this project</option>
                      ) : (
                        allBugs.map(bug => (
                          <option key={bug.bugId} value={bug.bugId}>
                            {bug.bugId} - {bug.title}
                          </option>
                        ))
                      )}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple bugs</p>
                  </div>
                </div>

                {/* Assign To - Sorted by employee_id */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Assign To (Optional)
                  </label>
                  {!usersLoaded ? (
                    <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center min-h-[48px]">
                      {isLoadingUsers ? (
                        <LoadingSpinner size="sm" message="Loading users..." />
                      ) : (
                        <div className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <select
                      name="assignedTo"
                      value={formData.assignedTo || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                    >
                      <option value="">👤 Select assignee...</option>
                      {users.map(user => (
                        <option key={user.employeeId} value={user.employeeId}>
                          {user.name} ({user.employeeId})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Description Section */}
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  <span>Bug Description</span>
                </h2>
                <p className="text-sm text-gray-600 mt-1">Provide detailed information about the bug</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical"
                  placeholder="Provide a detailed description of the bug, including what went wrong and any relevant context..."
                  required
                />
              </div>
            </div>



            {/* Reproduction Steps Section */}
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <CheckSquare className="h-5 w-5 text-orange-600" />
                  <span>Reproduction & Behavior</span>
                </h2>
                <p className="text-sm text-gray-600 mt-1">Help us understand and reproduce the issue</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Steps to Reproduce
                  </label>
                  <textarea
                    name="stepsToReproduce"
                    value={formData.stepsToReproduce}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical"
                    placeholder="Please provide step-by-step instructions:&#10;1. Go to the login page&#10;2. Enter invalid credentials&#10;3. Click 'Sign In' button&#10;4. Observe the error"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Expected Behavior
                    </label>
                    <textarea
                      name="expectedBehavior"
                      value={formData.expectedBehavior}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical"
                      placeholder="What should happen? Describe the expected outcome..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Actual Behavior
                    </label>
                    <textarea
                      name="actualBehavior"
                      value={formData.actualBehavior}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical"
                      placeholder="What actually happened? Describe what went wrong..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Information Section */}
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <Paperclip className="h-5 w-5 text-indigo-600" />
                  <span>Additional Information</span>
                </h2>
                <p className="text-sm text-gray-600 mt-1">Optional details to help with resolution</p>
              </div>

              {/* File Upload Section */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                  <Paperclip className="h-4 w-4" />
                  <span>Attachments (Images)</span>
                </label>
                <FileUpload
                  onFilesChange={setUploadedFiles}
                  maxFiles={5}
                  maxSizeMB={10}
                />
                {isUploading && (
                  <div className="mt-2 text-sm text-blue-600 flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>Uploading files...</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                  <Tag className="h-4 w-4" />
                  <span>Tags</span>
                </label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="urgent, login, payment, mobile"
                />
                <p className="text-xs text-gray-500 mt-1">Comma-separated keywords for categorization</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-8 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                <span className="text-red-500">*</span> Required fields
              </div>

              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => router.push('/bugs')}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors flex items-center space-x-2"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </button>

                <LoadingButton
                  type="submit"
                  isLoading={isLoading}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center space-x-2 font-medium"
                >
                  <Save className="h-4 w-4" />
                  <span>Report Bug</span>
                </LoadingButton>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
