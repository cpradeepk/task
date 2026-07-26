'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { BugFormData, User, Project, ReleaseChecklistSection, ReleaseState, ReleasePlatformChecklist, Bug as BugItem } from '@/lib/types'
import { createBug } from '@/lib/bugService'
import { getCurrentUser, getAllUsers } from '@/lib/auth'
import { Bug, AlertCircle, Save, X, FileText, Settings, CheckSquare, Paperclip, Clock, Tag } from 'lucide-react'
import LoadingButton from '@/components/ui/LoadingButton'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ProjectSelector from '@/components/ProjectSelector'
import FileUpload from '@/components/bugs/FileUpload'
import { useSettingsIcons } from '@/hooks/useSettingsIcons'

function CreateBugPageContent() {
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
    expectedBehavior: '',
    actualBehavior: '',
    serverLogs: '',
    frontendLogs: '',
    attachments: '',
    tags: '',
    relatedBugs: '',
    projectId: undefined,
    subprojectId: undefined,
    feature: '',
    type: undefined,
    parentDevId: undefined
  })

  const [projects, setProjects] = useState<any[]>([])
  const [subprojects, setSubprojects] = useState<any[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [isLoadingSubprojects, setIsLoadingSubprojects] = useState(false)
  const [projectsLoaded, setProjectsLoaded] = useState(false)
  
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [usersLoaded, setUsersLoaded] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [error, setError] = useState('')
  const [isHydrated, setIsHydrated] = useState(false)
  const [missingFields, setMissingFields] = useState<string[]>([])

  // Release mode state
  const [releasePlatforms, setReleasePlatforms] = useState<('android' | 'ios')[]>([])
  const [releaseBugs, setReleaseBugs] = useState<BugItem[]>([]) // candidate + searched bugs (deduped)
  const [selectedReleaseBugIds, setSelectedReleaseBugIds] = useState<string[]>([])
  const [releaseBugSearch, setReleaseBugSearch] = useState('')
  const [isLoadingReleaseBugs, setIsLoadingReleaseBugs] = useState(false)
  const [isSearchingReleaseBugs, setIsSearchingReleaseBugs] = useState(false)

  // Currently-selected subproject object (carries releaseEnabled + releaseChecklist)
  const selectedSub = (subprojects as Project[]).find(
    (sub) => sub.projectId === formData.subprojectId
  )
  const isReleaseEnabled = selectedSub?.releaseEnabled === true
  const isReleaseMode = formData.type === 'release'

  // Platform availability derived from the sub-project's checklist sections.
  const releaseSections: ReleaseChecklistSection[] = selectedSub?.releaseChecklist?.sections ?? []
  const hasAndroidSpecific = releaseSections.some((s) => s.platform === 'android')
  const hasIosSpecific = releaseSections.some((s) => s.platform === 'ios')
  const hasCommon = releaseSections.some((s) => s.platform === 'common')
  const androidAvailable = hasAndroidSpecific || hasCommon
  const iosAvailable = hasIosSpecific || hasCommon

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
  const searchParams = useSearchParams()

  // Load icons from settings metadata
  const { getIcon, isLoading: isLoadingIcons } = useSettingsIcons()

  // Track if we're converting from a test case
  const [convertFromId, setConvertFromId] = useState<string | null>(null)
  const [convertLoaded, setConvertLoaded] = useState(false)

  // Handle hydration, get current user, and read parent bug ID from URL
  useEffect(() => {
    setIsHydrated(true)
    const user = getCurrentUser()
    setCurrentUser(user)

    // Check for parentDevId in URL query parameters
    const parentDevId = searchParams.get('parentDevId')
    if (parentDevId) {
      setFormData(prev => ({ ...prev, parentDevId }))
    }

    // Check for convertFrom (test case → bug conversion)
    const convertFrom = searchParams.get('convertFrom')
    if (convertFrom && !convertLoaded) {
      setConvertFromId(convertFrom)
      // Fetch the source test case and pre-fill the form
      fetch(`/api/bugs/${convertFrom}`)
        .then(res => res.json())
        .then(result => {
          if (result.success && result.data) {
            const source = result.data
            setFormData(prev => ({
              ...prev,
              type: 'bug',
              title: source.title || prev.title,
              description: source.description || prev.description,
              expectedBehavior: source.expectedBehavior || prev.expectedBehavior,
              actualBehavior: source.actualBehavior || prev.actualBehavior,
              serverLogs: source.serverLogs || prev.serverLogs,
              frontendLogs: source.frontendLogs || prev.frontendLogs,
              severity: source.severity || prev.severity,
              priority: source.priority || prev.priority,
              category: source.category || prev.category,
              platform: source.platform || prev.platform,
              environment: source.environment || prev.environment,
              projectId: source.projectId || prev.projectId,
              subprojectId: source.subprojectId || prev.subprojectId,
              feature: source.feature || prev.feature,
              relatedBugs: convertFrom,
              tags: source.tags || prev.tags,
            }))
            setConvertLoaded(true)
          }
        })
        .catch(err => console.error('Failed to load source test case:', err))
    }
  }, [searchParams, convertLoaded])

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
        setBugTypeOptions(grouped.bug_type && grouped.bug_type.length > 0 ? grouped.bug_type : ['feature', 'bug', 'other'])

        console.log('Settings loaded successfully:', grouped)
      } else {
        console.warn('Settings API returned empty data, using defaults:', data)
        // Use default options if API returns empty
        setSeverityOptions(['Critical', 'Major', 'Minor'])
        setCategoryOptions(['UI', 'API', 'Backend', 'Performance', 'Security', 'Database', 'Integration', 'Other'])
        setPlatformOptions(['Web', 'iOS', 'Android', 'All'])
        setEnvironmentOptions(['Development', 'Staging', 'UAT', 'Production'])
        setBugTypeOptions(['feature', 'bug', 'other'])
      }

      setSettingsLoaded(true)
    } catch (error) {
      console.error('Failed to load settings:', error)
      // Use default options on error
      setSeverityOptions(['Critical', 'Major', 'Minor'])
      setCategoryOptions(['UI', 'API', 'Backend', 'Performance', 'Security', 'Database', 'Integration', 'Other'])
      setPlatformOptions(['Web', 'iOS', 'Android', 'All'])
      setEnvironmentOptions(['Development', 'Staging', 'UAT', 'Production'])
      setBugTypeOptions(['feature', 'bug', 'other'])
      setError('Using default dropdown options. Database settings may be unavailable.')
      setSettingsLoaded(true)
    } finally {
      setIsLoadingSettings(false)
    }
  }, [settingsLoaded])

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

  // If the chosen sub-project is no longer release-enabled, drop the release type.
  useEffect(() => {
    if (formData.type === 'release' && !isReleaseEnabled) {
      setFormData(prev => ({ ...prev, type: undefined }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReleaseEnabled, formData.type])

  // Default-check the available platforms when entering release mode / changing sub-project.
  // Prefer platforms that have platform-specific sections; if only 'common' sections exist, offer both.
  useEffect(() => {
    if (!isReleaseMode || !selectedSub) return

    const defaults: ('android' | 'ios')[] = []
    if (hasAndroidSpecific) defaults.push('android')
    if (hasIosSpecific) defaults.push('ios')
    if (defaults.length === 0 && hasCommon) {
      if (androidAvailable) defaults.push('android')
      if (iosAvailable) defaults.push('ios')
    }
    setReleasePlatforms(defaults)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReleaseMode, formData.subprojectId])

  // Fetch the bugs completed since the last release for this sub-project (pre-checked).
  useEffect(() => {
    if (!isReleaseMode || !formData.subprojectId) {
      setReleaseBugs([])
      setSelectedReleaseBugIds([])
      return
    }

    let cancelled = false
    const fetchCompleted = async () => {
      try {
        setIsLoadingReleaseBugs(true)
        const response = await fetch(
          `/api/bugs/completed-for-release?subprojectId=${encodeURIComponent(formData.subprojectId!)}`
        )
        const result = await response.json()
        if (cancelled) return
        if (result.success && Array.isArray(result.data)) {
          const bugs = result.data as BugItem[]
          setReleaseBugs(bugs)
          setSelectedReleaseBugIds(bugs.map((b) => b.bugId)) // all pre-checked
        } else {
          setReleaseBugs([])
          setSelectedReleaseBugIds([])
        }
      } catch (err) {
        console.error('Failed to load completed bugs for release:', err)
        if (!cancelled) {
          setReleaseBugs([])
          setSelectedReleaseBugIds([])
        }
      } finally {
        if (!cancelled) setIsLoadingReleaseBugs(false)
      }
    }

    fetchCompleted()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReleaseMode, formData.subprojectId])

  // Keep formData.relatedBugs in sync with the selected release bug ids.
  useEffect(() => {
    if (!isReleaseMode) return
    setFormData(prev => ({ ...prev, relatedBugs: selectedReleaseBugIds.join(', ') }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedReleaseBugIds, isReleaseMode])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear the field from missing fields when user starts typing
    if (missingFields.includes(name)) {
      setMissingFields(prev => prev.filter(field => field !== name))
    }
  }

  // Helper function to get field class with error styling
  const getFieldClass = (fieldName: string, baseClass: string = 'input-field') => {
    return missingFields.includes(fieldName)
      ? `${baseClass} border-2 border-red-500 focus:ring-red-500 focus:border-red-500`
      : baseClass
  }

  const togglePlatform = (platform: 'android' | 'ios') => {
    setReleasePlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    )
    if (missingFields.includes('platforms')) {
      setMissingFields((prev) => prev.filter((field) => field !== 'platforms'))
    }
  }

  const toggleReleaseBug = (bugId: string) => {
    setSelectedReleaseBugIds((prev) =>
      prev.includes(bugId) ? prev.filter((id) => id !== bugId) : [...prev, bugId]
    )
  }

  // Search for additional bugs and append any not already listed (selected on add).
  const handleReleaseBugSearch = async () => {
    const query = releaseBugSearch.trim()
    if (!query) return

    try {
      setIsSearchingReleaseBugs(true)
      const response = await fetch(`/api/bugs?search=${encodeURIComponent(query)}`)
      const result = await response.json()
      const found: BugItem[] = Array.isArray(result?.data)
        ? (result.data as BugItem[])
        : Array.isArray(result)
          ? (result as BugItem[])
          : []

      const existingIds = new Set(releaseBugs.map((b) => b.bugId))
      const newBugs = found.filter((b) => b.type !== 'release' && !existingIds.has(b.bugId))

      if (newBugs.length > 0) {
        setReleaseBugs((prev) => [...prev, ...newBugs])
        setSelectedReleaseBugIds((prev) => [...prev, ...newBugs.map((b) => b.bugId)])
      }
    } catch (err) {
      console.error('Failed to search bugs:', err)
    } finally {
      setIsSearchingReleaseBugs(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentUser) return

    // Validate required fields - Track missing fields for visual feedback
    const missing: string[] = []

    // Title is auto-filled for releases, so it is only required for non-release types.
    if (!isReleaseMode && (!formData.title || !formData.title.trim())) missing.push('title')
    if (!formData.description || !formData.description.trim()) missing.push('description')
    if (!formData.projectId) missing.push('projectId')
    // Subproject is only required when the selected project actually has subprojects.
    if (subprojects.length > 0 && !formData.subprojectId) missing.push('subprojectId')
    if (!formData.type) missing.push('type')

    // Release-specific validation: assignee + start date + at least one platform.
    if (isReleaseMode) {
      if (!formData.assignedTo) missing.push('assignedTo')
      if (!formData.startDate) missing.push('startDate')
      if (releasePlatforms.length === 0) missing.push('platforms')
    }

    // If there are missing fields, show error and highlight them
    if (missing.length > 0) {
      setMissingFields(missing)
      setError(
        missing.includes('platforms') && missing.length === 1
          ? 'Please select at least one platform'
          : 'Please fill in all required fields'
      )
      return
    }

    // Clear missing fields if validation passes
    setMissingFields([])

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

      let bugData: BugFormData & { reportedBy: string } = {
        ...formData,
        attachments: attachmentUrls.join(', '),
        reportedBy: currentUser.employeeId
      }

      // Release transform: hardcode fields, auto-fill, and snapshot the checklist.
      if (isReleaseMode && selectedSub) {
        const subName = selectedSub.projectName
        const platform: BugFormData['platform'] =
          releasePlatforms.includes('android') && releasePlatforms.includes('ios')
            ? 'All'
            : releasePlatforms.includes('android')
              ? 'Android'
              : 'iOS'

        const checklists: ReleaseState['checklists'] = {}
        for (const p of releasePlatforms) {
          const template: ReleaseChecklistSection[] = releaseSections.filter(
            (s) => s.platform === 'common' || s.platform === p
          )
          const platformChecklist: ReleasePlatformChecklist = {
            template,
            manual: [],
            completed: {}
          }
          checklists[p] = platformChecklist
        }

        const releaseState: ReleaseState = {
          platforms: releasePlatforms,
          checklists,
          versions: {}
        }

        bugData = {
          ...bugData,
          environment: 'Production',
          severity: 'Critical',
          platform,
          title: bugData.title?.trim() ? bugData.title : `Release — ${subName} — ${formData.startDate}`,
          feature: bugData.feature?.trim() ? bugData.feature : subName,
          startDate: formData.startDate,
          releaseState
        }
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

          {convertFromId ? (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-orange-800">
                  <p className="font-medium mb-1">Converting test case {convertFromId} to a bug</p>
                  <p className="text-orange-700">Fields have been pre-filled from the test case. Edit as needed and submit to create a new bug linked to the original test case.</p>
                </div>
              </div>
            </div>
          ) : (
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
          )}
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
                {/* Project and Subproject (moved above Type) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Project <span className="text-red-500">*</span>
                      {missingFields.includes('projectId') && (
                        <span className="text-red-500 text-xs ml-2">Required</span>
                      )}
                    </label>
                    <select
                      name="projectId"
                      value={formData.projectId || ''}
                      onChange={(e) => {
                        const value = e.target.value
                        setFormData(prev => ({ ...prev, projectId: value || undefined, subprojectId: undefined }))
                        // Clear from missing fields
                        if (missingFields.includes('projectId')) {
                          setMissingFields(prev => prev.filter(field => field !== 'projectId'))
                        }
                      }}
                      className={getFieldClass('projectId', 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white')}
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
                      Subproject {subprojects.length > 0 && <span className="text-red-500">*</span>}
                      {missingFields.includes('subprojectId') && (
                        <span className="text-red-500 text-xs ml-2">Required</span>
                      )}
                    </label>
                    <select
                      name="subprojectId"
                      value={formData.subprojectId || ''}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, subprojectId: e.target.value || undefined }))
                        // Clear from missing fields
                        if (missingFields.includes('subprojectId')) {
                          setMissingFields(prev => prev.filter(field => field !== 'subprojectId'))
                        }
                      }}
                      className={getFieldClass('subprojectId', 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white')}
                      disabled={!formData.projectId || isLoadingSubprojects}
                      required={subprojects.length > 0}
                    >
                      <option value="">{subprojects.length === 0 ? 'No subprojects' : 'Select subproject...'}</option>
                      {subprojects.map(subproject => (
                        <option key={subproject.projectId} value={subproject.projectId}>
                          {subproject.projectName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Type - MANDATORY FIELD */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Type <span className="text-red-500">*</span>
                    {missingFields.includes('type') && (
                      <span className="text-red-500 text-xs ml-2">Required</span>
                    )}
                  </label>
                  <div className="flex gap-3 flex-wrap">
                    {isLoadingSettings ? (
                      <span className="text-gray-500 text-sm">Loading types...</span>
                    ) : (
                      // 'release' is only offered when the selected sub-project enables it.
                      bugTypeOptions
                        .filter(type => type !== 'release' || isReleaseEnabled)
                        .concat(isReleaseEnabled && !bugTypeOptions.includes('release') ? ['release'] : [])
                        .map(type => {
                        const icon = getIcon('bug_types', type)
                        const isSelected = formData.type === type
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, type: type as BugFormData['type'] }))
                              if (missingFields.includes('type')) {
                                setMissingFields(prev => prev.filter(field => field !== 'type'))
                              }
                            }}
                            className={`px-5 py-3 rounded-lg font-medium transition-all duration-200 border-2 text-sm flex items-center space-x-2 ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                : missingFields.includes('type')
                                  ? 'bg-white text-gray-700 border-red-500 hover:border-red-600 hover:bg-red-50'
                                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                            }`}
                          >
                            <span>{icon || (type === 'release' ? '🚀' : '🪲')}</span>
                            <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* Release: platform selection + start date */}
                {isReleaseMode && (
                  <div className="space-y-6 rounded-lg border border-blue-200 bg-blue-50/40 p-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Platforms <span className="text-red-500">*</span>
                        {missingFields.includes('platforms') && (
                          <span className="text-red-500 text-xs ml-2">Select at least one</span>
                        )}
                      </label>
                      <div className="flex gap-3 flex-wrap">
                        {androidAvailable && (
                          <button
                            type="button"
                            onClick={() => togglePlatform('android')}
                            className={`px-5 py-3 rounded-lg font-medium transition-all duration-200 border-2 text-sm flex items-center space-x-2 ${
                              releasePlatforms.includes('android')
                                ? 'bg-green-600 text-white border-green-600 shadow-md'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-green-400 hover:bg-green-50'
                            }`}
                          >
                            <span>🤖</span>
                            <span>Android</span>
                          </button>
                        )}
                        {iosAvailable && (
                          <button
                            type="button"
                            onClick={() => togglePlatform('ios')}
                            className={`px-5 py-3 rounded-lg font-medium transition-all duration-200 border-2 text-sm flex items-center space-x-2 ${
                              releasePlatforms.includes('ios')
                                ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            <span></span>
                            <span>iOS</span>
                          </button>
                        )}
                        {!androidAvailable && !iosAvailable && (
                          <span className="text-gray-500 text-sm">
                            No release checklist configured for this sub-project.
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Start Date <span className="text-red-500">*</span>
                        {missingFields.includes('startDate') && (
                          <span className="text-red-500 text-xs ml-2">Required</span>
                        )}
                      </label>
                      <input
                        type="date"
                        name="startDate"
                        value={formData.startDate || ''}
                        onChange={handleInputChange}
                        className={getFieldClass('startDate', 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white')}
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Feature (renamed from Bug Title) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Feature <span className="text-red-500">*</span>
                    {missingFields.includes('title') && (
                      <span className="text-red-500 text-xs ml-2">Required</span>
                    )}
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className={getFieldClass('title', 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors')}
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
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Criticality <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {isLoadingSettings ? (
                        <span className="text-gray-500 text-sm">Loading...</span>
                      ) : (
                        severityOptions.map(option => {
                          const icon = getIcon('severities', option)
                          const isSelected = formData.severity === option
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, severity: option as any }))
                              }}
                              className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 border-2 text-sm flex items-center space-x-1.5 ${
                                isSelected
                                  ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                                  : 'bg-white text-gray-700 border-gray-300 hover:border-rose-400 hover:bg-rose-50'
                              }`}
                            >
                              {icon && <span>{icon}</span>}
                              <span>{option}</span>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>

                  {formData.type !== 'release' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {isLoadingSettings ? (
                        <span className="text-gray-500 text-sm">Loading...</span>
                      ) : (
                        categoryOptions.map(option => {
                          const icon = getIcon('categories', option)
                          const isSelected = formData.category === option
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, category: option as any }))
                              }}
                              className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 border-2 text-sm flex items-center space-x-1.5 ${
                                isSelected
                                  ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                                  : 'bg-white text-gray-700 border-gray-300 hover:border-amber-400 hover:bg-amber-50'
                              }`}
                            >
                              {icon && <span>{icon}</span>}
                              <span>{option}</span>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Platform <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {isLoadingSettings ? (
                        <span className="text-gray-500 text-sm">Loading...</span>
                      ) : (
                        platformOptions.map(option => {
                          const icon = getIcon('platforms', option)
                          const isSelected = formData.platform === option
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, platform: option as any }))
                              }}
                              className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 border-2 text-sm flex items-center space-x-1.5 ${
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                              }`}
                            >
                              {icon && <span>{icon}</span>}
                              <span>{option}</span>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Technical Details - Environment, Browser, Device (MOVED HERE) */}
                {formData.type !== 'release' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Environment <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {isLoadingSettings ? (
                        <span className="text-gray-500 text-sm">Loading...</span>
                      ) : (
                        environmentOptions.map(option => {
                          const icon = getIcon('environments', option)
                          const isSelected = formData.environment === option
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, environment: option as any }))
                              }}
                              className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 border-2 text-sm flex items-center space-x-1.5 ${
                                isSelected
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                  : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
                              }`}
                            >
                              {icon && <span>{icon}</span>}
                              <span>{option}</span>
                            </button>
                          )
                        })
                      )}
                    </div>
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
                )}

                {/* Related Items (Tasks/Bugs) - hidden in release mode (replaced by bug picker) */}
                {!isReleaseMode && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                    <Bug className="h-4 w-4" />
                    <span>Related Items (Optional)</span>
                  </label>
                  <input
                    type="text"
                    name="relatedBugs"
                    value={formData.relatedBugs || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="e.g., JSR-0001, JSR-0002, BUG-0001 (comma-separated)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter comma-separated task or bug IDs to link related work items</p>
                </div>
                )}

                {/* Bugs solved in this release (release mode only) */}
                {isReleaseMode && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                    <Bug className="h-4 w-4" />
                    <span>Bugs solved in this release</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Completed items since the last release are pre-selected. Deselect any that should not be
                    included, or search to add more.
                  </p>

                  {/* Search + add */}
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={releaseBugSearch}
                      onChange={(e) => setReleaseBugSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleReleaseBugSearch()
                        }
                      }}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Search bugs by title or ID to add..."
                    />
                    <button
                      type="button"
                      onClick={handleReleaseBugSearch}
                      disabled={isSearchingReleaseBugs || !releaseBugSearch.trim()}
                      className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {isSearchingReleaseBugs ? 'Searching...' : 'Add'}
                    </button>
                  </div>

                  {/* Selectable list */}
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-72 overflow-y-auto">
                    {isLoadingReleaseBugs ? (
                      <div className="p-4">
                        <LoadingSpinner size="sm" message="Loading completed bugs..." />
                      </div>
                    ) : releaseBugs.length === 0 ? (
                      <p className="p-4 text-sm text-gray-500">
                        No completed bugs found for this sub-project. Use search to add bugs.
                      </p>
                    ) : (
                      releaseBugs.map((bug) => {
                        const checked = selectedReleaseBugIds.includes(bug.bugId)
                        return (
                          <label
                            key={bug.bugId}
                            className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleReleaseBug(bug.bugId)}
                              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-800">
                              <span className="font-medium text-gray-900">{bug.bugId}</span>
                              {bug.title ? ` — ${bug.title}` : ''}
                              {bug.status ? (
                                <span className="ml-2 text-xs text-gray-500">({bug.status})</span>
                              ) : null}
                            </span>
                          </label>
                        )
                      })
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedReleaseBugIds.length} selected
                  </p>
                </div>
                )}

                {/* Assign To - Sorted by employee_id (required for releases) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Assign To {isReleaseMode ? <span className="text-red-500">*</span> : '(Optional)'}
                    {missingFields.includes('assignedTo') && (
                      <span className="text-red-500 text-xs ml-2">Required</span>
                    )}
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
                      className={getFieldClass('assignedTo', 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white')}
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

            {/* Steps to Reproduce Section */}
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
                    {isReleaseMode ? 'Release Notes' : formData.type === 'feature' ? 'Feature Description' : 'Steps to Reproduce'} <span className="text-red-500">*</span>
                    {missingFields.includes('description') && (
                      <span className="text-red-500 text-xs ml-2">Required</span>
                    )}
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className={getFieldClass('description', 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical')}
                    placeholder={isReleaseMode
                      ? "Summarize what this release contains: key features, fixes, and notable changes..."
                      : formData.type === 'feature'
                      ? "Describe the feature in detail:&#10;- What is the purpose of this feature?&#10;- What functionality should it provide?&#10;- Any specific requirements or constraints?"
                      : "Please provide step-by-step instructions:&#10;1. Go to the login page&#10;2. Enter invalid credentials&#10;3. Click 'Sign In' button&#10;4. Observe the error"}
                    required
                  />
                </div>

                {/* Hide these fields for feature-type and release-type bugs */}
                {formData.type !== 'feature' && formData.type !== 'release' && (
                  <>
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

                    {/* Server Logs and Frontend Logs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Server Logs
                        </label>
                        <textarea
                          name="serverLogs"
                          value={formData.serverLogs}
                          onChange={handleInputChange}
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical font-mono text-sm"
                          placeholder="Paste server-side logs, stack traces, or error messages..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Frontend Logs
                        </label>
                        <textarea
                          name="frontendLogs"
                          value={formData.frontendLogs}
                          onChange={handleInputChange}
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical font-mono text-sm"
                          placeholder="Paste browser console logs, JavaScript errors, or network errors..."
                        />
                      </div>
                    </div>
                  </>
                )}

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

export default function CreateBugPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto p-6">
          <LoadingSpinner />
        </div>
      </div>
    }>
      <CreateBugPageContent />
    </Suspense>
  )
}
