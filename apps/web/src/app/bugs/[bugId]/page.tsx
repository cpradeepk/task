/**
 * Bug Detail Page - Enhanced UI with modern button styling
 * Last updated: 2025-10-23
 * Features: Role-based access, responsive design, improved UX
 * Updated: GraphQL migration with REST fallback
 * Author: prathameassyserve
 */
'use client'

import React, { useState, useEffect, use, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { getCurrentUser, getAllUsers } from '@/lib/auth'
import { Bug, User } from '@/lib/types'
import { getBugById, updateBug, canEditBug, canCommentOnBug } from '@/lib/bugService'
import UnifiedTimeline from '@/components/UnifiedTimeline'
import BugEditModal from '@/components/bugs/BugEditModal'
import BugSubTaskManager from '@/components/bugs/BugSubTaskManager'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import LoadingButton from '@/components/ui/LoadingButton'
import ImageLightbox from '@/components/bugs/ImageLightbox'
import TimerButton from '@/components/TimerButton'
import { QUERIES } from '@/lib/graphql-queries'
import {
  Bug as BugIcon,
  MessageSquare,
  Send,
  Calendar,
  User as UserIcon,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowLeft,
  UserCheck,
  X,
  Paperclip,
  ExternalLink,
  Timer,
  Settings,
  CheckSquare,
  Image as ImageIcon,
  Pencil
} from 'lucide-react'

// Helper function to execute GraphQL queries
async function executeGraphQLQuery(query: string, variables: any) {
  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  })

  const result = await response.json()
  if (result.errors) throw new Error(result.errors[0]?.message || 'GraphQL query failed')
  return result.data
}

// Component to handle async user name fetching
function UserName({ employeeId }: { employeeId: string }) {
  const [name, setName] = useState<string>(employeeId)

  useEffect(() => {
    const fetchName = async () => {
      try {
        const response = await fetch(`/api/users/${employeeId}`)
        if (response.ok) {
          const result = await response.json()
          setName(result.data?.name || employeeId)
        }
      } catch (error) {
        console.error('Failed to fetch user name:', error)
      }
    }
    fetchName()
  }, [employeeId])

  return <span>{name}</span>
}

// Helper function to format hours to hh:mm:ss
function formatHoursToTime(hours: number): string {
  // Handle null, undefined, NaN, or invalid values
  if (!hours || isNaN(hours) || hours < 0) {
    return '00:00:00'
  }

  const totalSeconds = Math.floor(hours * 3600)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// Helper function to format milliseconds to hh:mm:ss
function formatMillisecondsToTime(ms: number): string {
  // Handle null, undefined, NaN, or invalid values
  if (!ms || isNaN(ms) || ms < 0) {
    return '00:00:00'
  }

  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// Helper function to convert hh:mm:ss to decimal hours
function timeToHours(timeStr: string): number {
  const parts = timeStr.split(':')
  if (parts.length !== 3) return 0

  const hours = parseInt(parts[0]) || 0
  const minutes = parseInt(parts[1]) || 0
  const seconds = parseInt(parts[2]) || 0

  return hours + (minutes / 60) + (seconds / 3600)
}

// Helper function to validate hh:mm:ss format
function isValidTimeFormat(timeStr: string): boolean {
  const timeRegex = /^(\d{1,3}):([0-5]\d):([0-5]\d)$/
  return timeRegex.test(timeStr)
}

export default function BugDetailPage({ params }: { params: Promise<{ bugId: string }> }) {
  const [bug, setBug] = useState<Bug | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  // Inline editing states
  const [isEditingAssignee, setIsEditingAssignee] = useState(false)
  const [isEditingEstimatedHours, setIsEditingEstimatedHours] = useState(false)
  const [tempEstimatedHours, setTempEstimatedHours] = useState('')
  const [isEditingCategory, setIsEditingCategory] = useState(false)
  const [isEditingPlatform, setIsEditingPlatform] = useState(false)
  const [isEditingEnvironment, setIsEditingEnvironment] = useState(false)

  // Log hours modal (keeping this one as it has multiple fields)
  const [showHoursModal, setShowHoursModal] = useState(false)
  const [hoursWorked, setHoursWorked] = useState('')
  const [workDescription, setWorkDescription] = useState('')
  const [useTimerHours, setUseTimerHours] = useState(true) // Default to using timer hours

  // Settings state
  const [bugStatusOptions, setBugStatusOptions] = useState<string[]>([])
  const [categoryOptions, setCategoryOptions] = useState<string[]>([])
  const [platformOptions, setPlatformOptions] = useState<string[]>([])
  const [environmentOptions, setEnvironmentOptions] = useState<string[]>([])
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)

  // Project/Subproject names
  const [projectName, setProjectName] = useState<string>('')
  const [subprojectName, setSubprojectName] = useState<string>('')

  // Activity log filter state - default to showing both activities and comments
  const [showActivity, setShowActivity] = useState(true)
  const [showComments, setShowComments] = useState(true)

  // Related bugs state
  const [relatedBugsData, setRelatedBugsData] = useState<Bug[]>([])
  const [isLoadingRelatedBugs, setIsLoadingRelatedBugs] = useState(false)

  // Lightbox state
  const [showLightbox, setShowLightbox] = useState(false)
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // Edit modal state
  const [bugEditModalOpen, setBugEditModalOpen] = useState(false)

  const hasLoadedData = useRef(false)
  const router = useRouter()
  const currentUser = getCurrentUser()

  // Unwrap the params Promise
  const { bugId } = use(params)

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true)
  }, [])

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
          setBugStatusOptions(grouped.bug_status || [])
          setCategoryOptions(grouped.category || ['UI', 'API', 'Backend', 'Performance', 'Security', 'Database', 'Integration', 'Other'])
          setPlatformOptions(grouped.platform || ['Web', 'iOS', 'Android', 'All'])
          setEnvironmentOptions(grouped.environment || ['Development', 'Staging', 'UAT', 'Production'])
        } else {
          console.error('Failed to load settings:', data.error)
          // Use defaults
          setCategoryOptions(['UI', 'API', 'Backend', 'Performance', 'Security', 'Database', 'Integration', 'Other'])
          setPlatformOptions(['Web', 'iOS', 'Android', 'All'])
          setEnvironmentOptions(['Development', 'Staging', 'UAT', 'Production'])
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
        // Use defaults
        setCategoryOptions(['UI', 'API', 'Backend', 'Performance', 'Security', 'Database', 'Integration', 'Other'])
        setPlatformOptions(['Web', 'iOS', 'Android', 'All'])
        setEnvironmentOptions(['Development', 'Staging', 'UAT', 'Production'])
      } finally {
        setIsLoadingSettings(false)
      }
    }

    loadSettings()
  }, [isHydrated])

  const loadBugData = useCallback(async () => {
    try {
      let bugData: Bug | null = null

      // Try GraphQL first
      try {
        console.log('🔵 [Bug Detail] Attempting GraphQL query for bug:', bugId)
        const data = await executeGraphQLQuery(QUERIES.GET_BUG, { bugId })
        bugData = data.bug || null
        console.log('✅ [Bug Detail] GraphQL query successful')
      } catch (graphqlError) {
        console.warn('⚠️ [Bug Detail] GraphQL failed, falling back to REST:', graphqlError)

        // Fallback to REST API
        bugData = await getBugById(bugId)
        console.log('✅ [Bug Detail] REST API successful')
      }

      if (!bugData) {
        router.push('/bugs')
        return
      }

      // Set bug data directly without any field swapping
      setBug(bugData)
      setIsLoading(false) // Set loading false immediately after bug data loads
    } catch (error) {
      console.error('Failed to load bug data:', error)
      setIsLoading(false)
    }
  }, [bugId, router])

  const loadUsers = useCallback(async () => {
    try {
      const allUsers = await getAllUsers()
      setUsers(allUsers.filter(user => user.status === 'active'))
    } catch (error) {
      console.error('Failed to load users:', error)
    }
  }, [])

  // Close dropdown on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showHoursModal) {
        setShowHoursModal(false)
        setHoursWorked('')
        setWorkDescription('')
        setUseTimerHours(true)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showHoursModal])

  // Load project and subproject names
  const loadProjectNames = useCallback(async () => {
    if (!bug) return

    try {
      if (bug.projectId) {
        const response = await fetch(`/api/projects/${bug.projectId}`)
        const data = await response.json()
        // API returns project data directly, not wrapped in { success, data }
        if (data && data.projectName) {
          setProjectName(data.projectName)
        }
      }

      if (bug.subprojectId) {
        const response = await fetch(`/api/projects/${bug.subprojectId}`)
        const data = await response.json()
        // API returns project data directly, not wrapped in { success, data }
        if (data && data.projectName) {
          setSubprojectName(data.projectName)
        }
      }
    } catch (error) {
      console.error('Failed to load project names:', error)
    }
  }, [bug])

  // Load related bugs
  const loadRelatedBugs = useCallback(async () => {
    if (!bug || !bug.relatedBugs) {
      setRelatedBugsData([])
      return
    }

    try {
      setIsLoadingRelatedBugs(true)
      const bugIds = bug.relatedBugs.split(',').map(id => id.trim()).filter(id => id)

      if (bugIds.length === 0) {
        setRelatedBugsData([])
        return
      }

      // Fetch each related bug
      const bugPromises = bugIds.map(async (bugId) => {
        try {
          const response = await fetch(`/api/bugs/${bugId}`)
          const data = await response.json()
          if (data.success && data.data) {
            return data.data
          }
          return null
        } catch (error) {
          console.error(`Failed to load bug ${bugId}:`, error)
          return null
        }
      })

      const bugs = await Promise.all(bugPromises)
      setRelatedBugsData(bugs.filter(b => b !== null) as Bug[])
    } catch (error) {
      console.error('Failed to load related bugs:', error)
    } finally {
      setIsLoadingRelatedBugs(false)
    }
  }, [bug])

  // Memoize user lookup for performance
  const userMap = useMemo(() => {
    const map = new Map()
    users.forEach(user => map.set(user.employeeId, user))
    return map
  }, [users])

  useEffect(() => {
    if (!isHydrated) return

    if (!currentUser) {
      router.push('/')
      return
    }

    // Admin users have full access to bug tracking

    if (hasLoadedData.current) return // Prevent multiple executions

    // Load bug data and users in parallel for better performance
    hasLoadedData.current = true
    Promise.all([loadBugData(), loadUsers()]).catch(error => {
      console.error('Failed to load initial data:', error)
      hasLoadedData.current = false // Reset on error to allow retry
    })
  }, [currentUser, router, isHydrated, bugId])

  // Load project names when bug data is available
  useEffect(() => {
    if (bug && (bug.projectId || bug.subprojectId)) {
      loadProjectNames()
    }
  }, [bug, loadProjectNames])

  // Load related bugs when bug data is available
  useEffect(() => {
    if (bug) {
      loadRelatedBugs()
    }
  }, [bug, loadRelatedBugs])

  const handleAssigneeChange = async (newAssignee: string) => {
    if (!bug || !newAssignee || !currentUser) return

    setIsUpdating(true)
    try {
      const updates: Partial<Bug> = {
        assignedTo: newAssignee,
        assignedBy: currentUser.employeeId,
        status: bug.status === 'New' ? 'In Progress' : bug.status,
        updatedAt: new Date().toISOString()
      }

      // Update UI immediately
      setBug({ ...bug, ...updates })
      setIsEditingAssignee(false)

      // Update backend
      try {
        await updateBug(bug.bugId, updates)
        console.log('Bug assignment updated successfully')
      } catch (error) {
        console.warn('Backend update failed, but UI updated:', error)
      }
    } catch (error) {
      console.error('Failed to assign bug:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleStatusChange = async (newStatus: Bug['status']) => {
    if (!bug || !currentUser) return

    setIsUpdating(true)
    try {
      const updates: Partial<Bug> = {
        status: newStatus,
        updatedAt: new Date().toISOString()
      }

      // If marking as resolved, set resolved date
      if (newStatus === 'Resolved' && bug.status !== 'Resolved') {
        updates.resolvedDate = new Date().toISOString()
      }

      // If marking as closed, set closed date
      if (newStatus === 'Closed' && bug.status !== 'Closed') {
        updates.closedDate = new Date().toISOString()
      }

      // Update UI immediately
      setBug({ ...bug, ...updates })

      // Update backend - activity log will automatically track the status change
      try {
        await updateBug(bug.bugId, updates)
        console.log('Bug status updated successfully')
      } catch (error) {
        console.warn('Backend update failed, but UI updated:', error)
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAddHours = async () => {
    if (!bug || !currentUser) return

    console.log('🔵 handleAddHours called:', { useTimerHours, hoursWorked })

    setIsUpdating(true)
    try {
      let hoursToAdd = 0

      if (useTimerHours) {
        // Use timer hours
        const timerTotalMs = bug.timerTotalTime || 0
        if (timerTotalMs === 0) {
          alert('No timer hours to log. Please start the timer first or enter hours manually.')
          setIsUpdating(false)
          return
        }
        hoursToAdd = timerTotalMs / (1000 * 60 * 60) // Convert milliseconds to hours
        console.log('⏱️ Using timer hours:', { timerTotalMs, hoursToAdd })
      } else {
        // Use manual hours (hh:mm:ss format)
        if (!hoursWorked.trim()) {
          alert('Please enter hours worked')
          setIsUpdating(false)
          return
        }

        // Validate hh:mm:ss format
        const isValid = isValidTimeFormat(hoursWorked)
        console.log('🔍 Time format validation:', { input: hoursWorked, isValid })

        if (!isValid) {
          alert('Please enter time in hh:mm:ss format (e.g., 02:30:00)')
          setIsUpdating(false)
          return
        }

        // Convert hh:mm:ss to decimal hours
        const hours = timeToHours(hoursWorked)
        console.log('🔄 Converted to hours:', { input: hoursWorked, hours })

        if (hours <= 0) {
          alert('Please enter a valid time greater than 00:00:00')
          setIsUpdating(false)
          return
        }
        hoursToAdd = hours
      }

      // Convert currentHours to number (it might be a string from the database)
      const currentHours = parseFloat(bug.actualHours as any) || 0
      const newTotalHours = currentHours + hoursToAdd

      console.log('💾 Preparing update:', {
        bugActualHours: bug.actualHours,
        bugActualHoursType: typeof bug.actualHours,
        currentHours,
        currentHoursType: typeof currentHours,
        hoursToAdd,
        hoursToAddType: typeof hoursToAdd,
        newTotalHours,
        newTotalHoursType: typeof newTotalHours
      })

      const updates: Partial<Bug> = {
        actualHours: newTotalHours,
        updatedAt: new Date().toISOString()
      }

      // If using timer hours, reset timer state
      if (useTimerHours) {
        updates.timerState = 'stopped'
        updates.timerTotalTime = 0
        updates.timerStartTime = null
        updates.timerPausedTime = 0
        updates.timerSessions = null
      }

      const success = await updateBug(bug.bugId, updates)
      if (success) {
        setBug({ ...bug, ...updates })

        // Log the hours addition with mode information
        const mode = useTimerHours ? 'timer' : 'manual'
        const hoursAddedFormatted = formatHoursToTime(hoursToAdd)
        const description = `Logged ${hoursAddedFormatted} (${mode} entry)`

        // Create activity log entry
        try {
          await fetch('/api/activity-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entityType: 'bug',
              entityId: bug.bugId,
              actionType: 'time_logged',
              description,
              isComment: false
            })
          })
        } catch (error) {
          console.error('Failed to log activity:', error)
        }

        setShowHoursModal(false)
        setHoursWorked('')
        setWorkDescription('')
        setUseTimerHours(true)
      }
    } catch (error) {
      console.error('Failed to add hours:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleEstimatedHoursChange = async () => {
    console.log('🔵 handleEstimatedHoursChange called with:', tempEstimatedHours)

    if (!bug || !currentUser || !tempEstimatedHours.trim()) {
      console.log('❌ Validation failed:', { bug: !!bug, currentUser: !!currentUser, tempEstimatedHours })
      setIsEditingEstimatedHours(false)
      setTempEstimatedHours('')
      return
    }

    setIsUpdating(true)
    try {
      // Validate hh:mm:ss format
      const isValid = isValidTimeFormat(tempEstimatedHours)
      console.log('🔍 Time format validation:', { input: tempEstimatedHours, isValid })

      if (!isValid) {
        alert('Please enter time in hh:mm:ss format (e.g., 02:30:00)')
        setIsUpdating(false)
        return
      }

      // Convert hh:mm:ss to decimal hours
      const hours = timeToHours(tempEstimatedHours)
      console.log('🔄 Converted to hours:', { input: tempEstimatedHours, hours })

      if (hours <= 0) {
        alert('Please enter a valid time greater than 00:00:00')
        setIsUpdating(false)
        return
      }

      const updates: Partial<Bug> = {
        estimatedHours: hours,
        updatedAt: new Date().toISOString()
      }

      // Update UI immediately
      setBug({ ...bug, ...updates })
      setIsEditingEstimatedHours(false)
      setTempEstimatedHours('')

      // Update backend - activity log will automatically track the estimated hours change
      try {
        await updateBug(bug.bugId, updates)
        console.log('✅ Estimated hours updated successfully')
      } catch (error) {
        console.warn('⚠️ Backend update failed, but UI updated:', error)
      }
    } catch (error) {
      console.error('❌ Failed to update estimated hours:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCategoryChange = async (newCategory: string) => {
    if (!bug || !newCategory || !currentUser) return

    setIsUpdating(true)
    try {
      const updates: Partial<Bug> = {
        category: newCategory as Bug['category'],
        updatedAt: new Date().toISOString()
      }

      // Update UI immediately
      setBug({ ...bug, ...updates })
      setIsEditingCategory(false)

      // Update backend
      try {
        await updateBug(bug.bugId, updates)
      } catch (error) {
        console.warn('Backend update failed, but UI updated:', error)
      }
    } catch (error) {
      console.error('Failed to update category:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePlatformChange = async (newPlatform: string) => {
    if (!bug || !newPlatform || !currentUser) return

    setIsUpdating(true)
    try {
      const updates: Partial<Bug> = {
        platform: newPlatform as Bug['platform'],
        updatedAt: new Date().toISOString()
      }

      // Update UI immediately
      setBug({ ...bug, ...updates })
      setIsEditingPlatform(false)

      // Update backend
      try {
        await updateBug(bug.bugId, updates)
      } catch (error) {
        console.warn('Backend update failed, but UI updated:', error)
      }
    } catch (error) {
      console.error('Failed to update platform:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleEnvironmentChange = async (newEnvironment: string) => {
    if (!bug || !newEnvironment || !currentUser) return

    setIsUpdating(true)
    try {
      const updates: Partial<Bug> = {
        environment: newEnvironment as Bug['environment'],
        updatedAt: new Date().toISOString()
      }

      // Update UI immediately
      setBug({ ...bug, ...updates })
      setIsEditingEnvironment(false)

      // Update backend
      try {
        await updateBug(bug.bugId, updates)
      } catch (error) {
        console.warn('Backend update failed, but UI updated:', error)
      }
    } catch (error) {
      console.error('Failed to update environment:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'text-red-600 bg-red-100'
      case 'Major': return 'text-orange-600 bg-orange-100'
      case 'Minor': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'text-blue-600 bg-blue-100'
      case 'In Progress': return 'text-yellow-600 bg-yellow-100'
      case 'Resolved': return 'text-green-600 bg-green-100'
      case 'Closed': return 'text-gray-600 bg-gray-100'
      case 'Reopened': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'New': return <Clock className="h-4 w-4" />
      case 'In Progress': return <Clock className="h-4 w-4" />
      case 'Resolved': return <CheckCircle className="h-4 w-4" />
      case 'Closed': return <CheckCircle className="h-4 w-4" />
      case 'Reopened': return <AlertTriangle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  // Show loading state to prevent flickering
  if (!isHydrated || !currentUser || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-6xl mx-auto p-6">
          <LoadingSpinner size="lg" message="Loading bug details..." center />
        </div>
      </div>
    )
  }

  if (!bug) {
    return (
      <div>
        <Navbar />
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Bug not found</h1>
            <p className="text-gray-600 mt-2">The bug you're looking for doesn't exist.</p>
            <button
              onClick={() => router.push('/bugs')}
              className="btn-primary mt-4"
            >
              Back to Bugs
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Calculate permissions after we know bug exists
  const isAdminOrTopManagement = currentUser.role === 'admin' || currentUser.role === 'top_management'
  const canEdit = canEditBug(bug, currentUser.employeeId, isAdminOrTopManagement)
  const canComment = canCommentOnBug(bug, currentUser.employeeId, isAdminOrTopManagement)
  const canAssign = isAdminOrTopManagement || bug.reportedBy === currentUser.employeeId || bug.assignedTo === currentUser.employeeId

  return (
    <div>
      <Navbar />
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/bugs')}
              className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 font-medium rounded-lg border border-gray-300 shadow-sm hover:shadow-md transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 whitespace-nowrap"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span>Back</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-black flex items-center space-x-2">
                <BugIcon className="h-6 w-6" />
                <span>{bug.bugId}</span>
                <div className="flex items-center space-x-2 mb-2">
                  {projectName && (
                    <>
                      <span className="text-gray-400">-</span>
                      <span className="text-sm text-gray-700">{projectName}</span>
                      {subprojectName && (
                        <>
                          <span className="text-gray-400">&gt;</span>
                          <span className="text-sm text-gray-700">{subprojectName}</span>
                        </>
                      )}
                    </>
                  )}
                </div>
              </h1>
              
               
              </div>
            </div>

          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            {bug.status === 'Resolved' && canEdit && (
              <button
                onClick={() => handleStatusChange('Closed')}
                className="inline-flex items-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium rounded-lg shadow-sm hover:shadow-lg transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                <span>Mark as Closed</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bug Details */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-3 mb-4">
                {/* Criticality (Severity) */}
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(bug.severity)}`}>
                  {bug.severity}
                </span>

                {/* Status - Inline Dropdown (single-click edit) */}
                {canEdit ? (
                  <div className="relative inline-block">
                    <select
                      value={bug.status}
                      onChange={(e) => handleStatusChange(e.target.value as Bug['status'])}
                      disabled={isUpdating}
                      className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(bug.status)} hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer`}
                    >
                      {bugStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(bug.status)}`}>
                    {getStatusIcon(bug.status)}
                    <span>{bug.status}</span>
                  </span>
                )}

                {/* Category */}
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                  {bug.category}
                </span>

                {/* Platform */}
                <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                  {bug.platform}
                </span>

                {/* Environment */}
                <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded text-xs font-medium">
                  {bug.environment}
                </span>
              </div>

              {/* Bug Title with Project/Subproject */}
              <div className="mb-4">

                <button
                  onClick={() => setBugEditModalOpen(true)}
                  className="text-xl font-semibold text-black hover:text-primary transition-colors cursor-pointer text-left w-full flex items-center space-x-2 group"
                >
                  <span>{bug.title}</span>
                  <Pencil className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Steps to Reproduce</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{bug.description}</p>
                </div>

                {bug.expectedBehavior && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Expected Behavior</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{bug.expectedBehavior}</p>
                  </div>
                )}

                {bug.actualBehavior && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Actual Behavior</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{bug.actualBehavior}</p>
                  </div>
                )}
                {/* Browser and Device Information */}
            {(bug.browserInfo || bug.deviceInfo) && (
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="grid grid-cols-2 gap-4">
                  {bug.browserInfo && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Browser:</span>
                      <span className="ml-2 text-sm text-gray-900">{bug.browserInfo}</span>
                    </div>
                  )}
                  {bug.deviceInfo && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Device:</span>
                      <span className="ml-2 text-sm text-gray-900">{bug.deviceInfo}</span>
                    </div>
                  )}
                </div>
                  </div>
                )}

                {/* Attachments */}
                {bug.attachments && bug.attachments.trim() && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                      <ImageIcon className="h-5 w-5" />
                      <span>Attachments</span>
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {bug.attachments.split(',').map((url, index) => {
                        const trimmedUrl = url.trim()
                        if (!trimmedUrl) return null

                        return (
                          <button
                            key={index}
                            onClick={() => {
                              const allImages = bug.attachments!.split(',').map(u => u.trim()).filter(u => u)
                              setLightboxImages(allImages)
                              setLightboxIndex(index)
                              setShowLightbox(true)
                            }}
                            className="group relative aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-blue-500 transition-all hover:shadow-lg"
                          >
                            <img
                              src={trimmedUrl}
                              alt={`Attachment ${index + 1}`}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                              <ExternalLink className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>



            {/* Activity Timeline (includes comments and system activities) */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-2 mb-4">
                <MessageSquare className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Activity & Comments</h3>
              </div>

              <UnifiedTimeline
                entityType="bug"
                entityId={bugId}
                showCommentInput={canComment}
                sortOrder="desc"
                autoRefresh={false}
                showActivity={showActivity}
                showComments={showComments}
                onToggleActivity={() => setShowActivity(!showActivity)}
                onToggleComments={() => setShowComments(!showComments)}
                filterFn={(activity) => {
                  // If both toggles are ON or both are OFF, show all
                  if ((showActivity && showComments) || (!showActivity && !showComments)) {
                    return true
                  }
                  // If only Activity is ON, show only non-comments
                  if (showActivity && !showComments) {
                    return !activity.isComment
                  }
                  // If only Comments is ON, show only comments
                  if (!showActivity && showComments) {
                    return activity.isComment
                  }
                  return true
                }}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Time Tracking - Moved above subtasks */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <Timer className="h-5 w-5" />
                  <span>Time Tracking</span>
                </h3>

                {/* Log Hours Button */}
                {canEdit && (
                  <div className="relative">
                    <button
                      onClick={() => {
                        // If there are no timer hours, default to manual entry mode
                        if (!bug?.timerTotalTime || bug.timerTotalTime === 0) {
                          setUseTimerHours(false)
                        } else {
                          setUseTimerHours(true)
                        }
                        setShowHoursModal(!showHoursModal)
                      }}
                      className="inline-flex items-center px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white font-medium rounded shadow-sm hover:shadow transition-all focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <Timer className="h-3 w-3 mr-1" />
                      <span>Log Hours</span>
                    </button>

                    {/* Log Hours Dropdown */}
                    {showHoursModal && (
                      <>
                        {/* Backdrop to close dropdown when clicking outside */}
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowHoursModal(false)}
                        />

                        {/* Dropdown Content */}
                        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-4">
                          <div className="space-y-3">
                            {/* Timer Info */}
                            {bug.timerTotalTime && bug.timerTotalTime > 0 && (
                              <div className="bg-purple-50 border border-purple-200 rounded-lg p-2">
                                <div className="flex items-center space-x-2 mb-1">
                                  <Timer className="h-3 w-3 text-purple-600" />
                                  <span className="text-xs font-medium text-purple-900">Timer Data Available</span>
                                </div>
                                <p className="text-xs text-purple-700">
                                  <strong>Timer Hours:</strong> {formatMillisecondsToTime(bug.timerTotalTime)}
                                </p>
                              </div>
                            )}

                            {/* Source Selection - Always show if timer hours exist */}
                            {bug.timerTotalTime && bug.timerTotalTime > 0 && (
                              <div className="space-y-1">
                                <label className="block text-xs font-medium text-gray-700">
                                  Hours Source:
                                </label>
                                <div className="flex space-x-3">
                                  <label className="flex items-center space-x-1 cursor-pointer">
                                    <input
                                      type="radio"
                                      checked={useTimerHours}
                                      onChange={() => setUseTimerHours(true)}
                                      className="text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className="text-xs text-gray-700">Use Timer</span>
                                  </label>
                                  <label className="flex items-center space-x-1 cursor-pointer">
                                    <input
                                      type="radio"
                                      checked={!useTimerHours}
                                      onChange={() => setUseTimerHours(false)}
                                      className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-xs text-gray-700">Manual</span>
                                  </label>
                                </div>
                              </div>
                            )}

                            {/* Manual Hours Input (hh:mm:ss format) - Show when no timer OR manual mode selected */}
                            {(!bug.timerTotalTime || bug.timerTotalTime === 0 || !useTimerHours) && (
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Hours Worked (hh:mm:ss):
                                </label>
                                <input
                                  type="text"
                                  value={hoursWorked}
                                  onChange={(e) => setHoursWorked(e.target.value)}
                                  placeholder="e.g., 02:30:00"
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                                />
                                <p className="mt-0.5 text-xs text-gray-500">Format: hh:mm:ss</p>
                              </div>
                            )}

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Work Description (Optional):
                              </label>
                              <textarea
                                value={workDescription}
                                onChange={(e) => setWorkDescription(e.target.value)}
                                placeholder="Describe what you worked on..."
                                rows={2}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>

                            {/* Summary */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                              <div className="text-xs text-blue-700 space-y-0.5">
                                <p><strong>Current:</strong> {formatHoursToTime(bug.actualHours || 0)}</p>
                                {bug.estimatedHours && (
                                  <p><strong>Estimated:</strong> {formatHoursToTime(bug.estimatedHours)}</p>
                                )}
                                {useTimerHours && bug.timerTotalTime && bug.timerTotalTime > 0 ? (
                                  <p><strong>New Total:</strong> {formatHoursToTime((bug.actualHours || 0) + (bug.timerTotalTime / (1000 * 60 * 60)))}</p>
                                ) : (
                                  hoursWorked && isValidTimeFormat(hoursWorked) && (
                                    <p><strong>New Total:</strong> {formatHoursToTime((bug.actualHours || 0) + timeToHours(hoursWorked))}</p>
                                  )
                                )}
                              </div>
                            </div>

                            {/* Warning if using timer hours */}
                            {useTimerHours && bug.timerTotalTime && bug.timerTotalTime > 0 && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                                <p className="text-xs text-yellow-800">
                                  ⚠️ Logging timer hours will reset the timer.
                                </p>
                              </div>
                            )}

                            <div className="flex space-x-2">
                              <LoadingButton
                                onClick={handleAddHours}
                                isLoading={isUpdating}
                                disabled={!useTimerHours && (!hoursWorked || !isValidTimeFormat(hoursWorked) || timeToHours(hoursWorked) <= 0)}
                                className="btn-primary flex-1 text-xs py-1.5"
                              >
                                <Timer className="h-3 w-3 mr-1" />
                                Log Hours
                              </LoadingButton>
                              <button
                                onClick={() => {
                                  setShowHoursModal(false)
                                  setHoursWorked('')
                                  setWorkDescription('')
                                  setUseTimerHours(true)
                                }}
                                className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {/* Estimated Hours - Inline Input (hh:mm:ss format) */}
                <div>
                  <span className="text-sm font-medium text-gray-600">Estimated:</span>
                  {canEdit ? (
                    isEditingEstimatedHours ? (
                      <div className="inline-flex items-center ml-2">
                        <input
                          type="text"
                          value={tempEstimatedHours}
                          onChange={(e) => setTempEstimatedHours(e.target.value)}
                          onBlur={handleEstimatedHoursChange}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleEstimatedHoursChange()
                            } else if (e.key === 'Escape') {
                              setIsEditingEstimatedHours(false)
                              setTempEstimatedHours('')
                            }
                          }}
                          autoFocus
                          disabled={isUpdating}
                          placeholder="hh:mm:ss"
                          className="w-28 text-sm border border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setTempEstimatedHours(bug.estimatedHours ? formatHoursToTime(bug.estimatedHours) : '00:00:00')
                          setIsEditingEstimatedHours(true)
                        }}
                        className="ml-2 text-sm text-gray-900 hover:text-blue-600 hover:underline font-mono"
                      >
                        {bug.estimatedHours ? formatHoursToTime(bug.estimatedHours) : 'Set hours'}
                      </button>
                    )
                  ) : (
                    <span className="ml-2 text-sm text-gray-900 font-mono">
                      {bug.estimatedHours ? formatHoursToTime(bug.estimatedHours) : 'Not set'}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-600">Actual:</span>
                    <span className="text-sm text-gray-900 font-mono">
                      {bug.actualHours ? formatHoursToTime(bug.actualHours) : '00:00:00'}
                    </span>
                  </div>

                  {/* Timer Play/Pause Button */}
                  {canEdit && (
                    <TimerButton
                      entityType="bug"
                      entityId={bug.bugId}
                      entityTitle={bug.title}
                      status={bug.status}
                      size="md"
                      showLabel={false}
                    />
                  )}
                </div>

                {bug.estimatedHours && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Progress:</span>
                    <div className="ml-2 mt-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            (bug.actualHours || 0) > bug.estimatedHours
                              ? 'bg-red-500'
                              : 'bg-blue-500'
                          }`}
                          style={{
                            width: `${Math.min(((bug.actualHours || 0) / bug.estimatedHours) * 100, 100)}%`
                          }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500 mt-1">
                        {bug.estimatedHours ? Math.round(((bug.actualHours || 0) / bug.estimatedHours) * 100) : 0}% complete
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bug Subtasks - Moved from bottom */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <BugSubTaskManager
                parentBugId={bug.bugId}
                createdBy={currentUser.employeeId}
                editable={canEdit}
                showAssignee={true}
                defaultExpanded={true}
                compact={false}
              />
            </div>

            {/* People */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">People</h3>

              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Reported by:</span>
                  <span className="ml-2 text-sm text-gray-900">
                    <UserName employeeId={bug.reportedBy} />
                  </span>
                </div>

                {/* Assigned To - Inline Dropdown */}
                <div>
                  <span className="text-sm font-medium text-gray-600">Assigned to:</span>
                  {canAssign ? (
                    isEditingAssignee ? (
                      <select
                        value={bug.assignedTo || ''}
                        onChange={(e) => handleAssigneeChange(e.target.value)}
                        onBlur={() => setIsEditingAssignee(false)}
                        autoFocus
                        disabled={isUpdating}
                        className="ml-2 text-sm border border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Unassigned</option>
                        {users.map((user) => (
                          <option key={user.employeeId} value={user.employeeId}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <button
                        onClick={() => setIsEditingAssignee(true)}
                        className="ml-2 text-sm text-gray-900 hover:text-blue-600 hover:underline"
                      >
                        {bug.assignedTo ? <UserName employeeId={bug.assignedTo} /> : 'Unassigned'}
                      </button>
                    )
                  ) : (
                    <span className="ml-2 text-sm text-gray-900">
                      {bug.assignedTo ? <UserName employeeId={bug.assignedTo} /> : 'Unassigned'}
                    </span>
                  )}
                </div>

                {bug.assignedBy && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Assigned by:</span>
                    <span className="ml-2 text-sm text-gray-900">
                      <UserName employeeId={bug.assignedBy} />
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Timeline</h3>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <span className="text-sm font-medium text-gray-600">Created:</span>
                    <span className="ml-2 text-sm text-gray-900">
                      {new Date(bug.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <span className="text-sm font-medium text-gray-600">Updated:</span>
                    <span className="ml-2 text-sm text-gray-900">
                      {new Date(bug.updatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {bug.resolvedDate && (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <div>
                      <span className="text-sm font-medium text-gray-600">Resolved:</span>
                      <span className="ml-2 text-sm text-gray-900">
                        {new Date(bug.resolvedDate).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {bug.closedDate && (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-gray-400" />
                    <div>
                      <span className="text-sm font-medium text-gray-600">Closed:</span>
                      <span className="ml-2 text-sm text-gray-900">
                        {new Date(bug.closedDate).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bug Workflow */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Bug Tracking Flow</h3>

              <div className="space-y-6">
                <div className="relative">
                  <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                  <div className="relative flex items-start space-x-3">
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full ${bug.status === 'New' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                      1
                    </div>
                    <div className="flex-1">
                      <h4 className={`text-sm font-medium ${bug.status === 'New' ? 'text-blue-600' : 'text-gray-700'}`}>New</h4>
                      <p className="text-xs text-gray-500">Bug is reported and awaiting triage</p>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                  <div className="relative flex items-start space-x-3">
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full ${bug.status === 'In Progress' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                      2
                    </div>
                    <div className="flex-1">
                      <h4 className={`text-sm font-medium ${bug.status === 'In Progress' ? 'text-yellow-600' : 'text-gray-700'}`}>In Progress</h4>
                      <p className="text-xs text-gray-500">Bug is assigned and being worked on</p>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                  <div className="relative flex items-start space-x-3">
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full ${bug.status === 'Resolved' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                      3
                    </div>
                    <div className="flex-1">
                      <h4 className={`text-sm font-medium ${bug.status === 'Resolved' ? 'text-green-600' : 'text-gray-700'}`}>Resolved</h4>
                      <p className="text-xs text-gray-500">Bug has been fixed and awaiting verification</p>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="relative flex items-start space-x-3">
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full ${bug.status === 'Closed' ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-500'}`}>
                      4
                    </div>
                    <div className="flex-1">
                      <h4 className={`text-sm font-medium ${bug.status === 'Closed' ? 'text-gray-700' : 'text-gray-700'}`}>Closed</h4>
                      <p className="text-xs text-gray-500">Bug is verified as fixed and closed</p>
                    </div>
                  </div>
                </div>

                {bug.status === 'Reopened' && (
                  <div className="relative mt-4 pt-4 border-t border-red-200">
                    <div className="relative flex items-start space-x-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white">
                        !
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-red-600">Reopened</h4>
                        <p className="text-xs text-gray-500">Bug was reopened and needs attention</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Related Bugs */}
            {(bug.relatedBugs || relatedBugsData.length > 0) && (
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                  <ExternalLink className="h-5 w-5" />
                  <span>Related Bugs</span>
                </h3>

                {isLoadingRelatedBugs ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Loading related bugs...</span>
                  </div>
                ) : relatedBugsData.length > 0 ? (
                  <div className="space-y-2">
                    {relatedBugsData.map((relatedBug) => (
                      <a
                        key={relatedBug.bugId}
                        href={`/bugs/${relatedBug.bugId}`}
                        className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-blue-600">{relatedBug.bugId}</span>
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                relatedBug.status === 'New' ? 'bg-blue-100 text-blue-700' :
                                relatedBug.status === 'In Progress' ? 'bg-yellow-100 text-yellow-700' :
                                relatedBug.status === 'Resolved' ? 'bg-green-100 text-green-700' :
                                relatedBug.status === 'Closed' ? 'bg-gray-100 text-gray-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {relatedBug.status}
                              </span>
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                relatedBug.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                                relatedBug.severity === 'Major' ? 'bg-orange-100 text-orange-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {relatedBug.severity}
                              </span>
                            </div>
                            <p className="text-sm text-gray-900 mt-1">{relatedBug.title}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {relatedBug.category} • {relatedBug.platform}
                            </p>
                          </div>
                          <ExternalLink className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No related bugs found</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Image Lightbox */}
        {showLightbox && (
          <ImageLightbox
            images={lightboxImages}
            currentIndex={lightboxIndex}
            onClose={() => setShowLightbox(false)}
            onNavigate={setLightboxIndex}
          />
        )}

        {/* Bug Edit Modal */}
        <BugEditModal
          bug={bug}
          isOpen={bugEditModalOpen}
          onClose={() => setBugEditModalOpen(false)}
          onUpdate={() => {
            setBugEditModalOpen(false)
            // Reload bug data
            loadBugData()
          }}
        />
      </div>
    </div>
  )
}
