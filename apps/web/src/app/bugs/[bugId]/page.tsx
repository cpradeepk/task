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
import { Bug, User, ReleaseState } from '@/lib/types'
import { getBugById, updateBug, canEditBug, canCommentOnBug } from '@/lib/bugService'
import { getCurrentDateTime, formatDateTimeIST } from '@/lib/datetime-utils'
import UnifiedTimeline from '@/components/UnifiedTimeline'
import BugEditModal from '@/components/bugs/BugEditModal'
import BugChecklistManager from '@/components/bugs/BugChecklistManager'
import ReleaseChecklistView from '@/components/bugs/ReleaseChecklistView'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import LoadingButton from '@/components/ui/LoadingButton'
import ImageLightbox from '@/components/bugs/ImageLightbox'
import AttachmentDisplay from '@/components/bugs/AttachmentDisplay'
import TimerButton from '@/components/TimerButton'
import RelatedItemsManager from '@/components/relationships/RelatedItemsManager'
import SubtasksList from '@/components/subtasks/SubtasksList'
import SubtaskBreadcrumb from '@/components/subtasks/SubtaskBreadcrumb'
import CollapsibleText from '@/components/CollapsibleText'
import { QUERIES } from '@/lib/graphql-queries'
import { getBugDisplayId } from '@/lib/data'
import {
  Bug as BugIcon,
  MessageSquare,
  Send,
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
  Pencil,
  ChevronDown,
  ChevronUp,
  Calendar,
  Copy
} from 'lucide-react'

// Helper function to safely format dates in dd-mm-yyyy format
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Not set'

  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Invalid Date'

    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()

    return `${day}-${month}-${year}`
  } catch (error) {
    return 'Invalid Date'
  }
}

// Helper function to convert date to yyyy-MM-dd format for input
function formatDateForInput(dateString: string | null | undefined): string {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ''
    return date.toISOString().split('T')[0]
  } catch (error) {
    return ''
  }
}

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
  const [isEditingStartDate, setIsEditingStartDate] = useState(false)
  const [isEditingEndDate, setIsEditingEndDate] = useState(false)
  const [tempStartDate, setTempStartDate] = useState('')
  const [tempEndDate, setTempEndDate] = useState('')

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

  // Activity log filter state - default to showing only comments
  const [showActivity, setShowActivity] = useState(false)
  const [showComments, setShowComments] = useState(true)
  const [showPrompts, setShowPrompts] = useState(false)

  // Related items state (tasks and bugs)
  const [relatedItemsData, setRelatedItemsData] = useState<Array<Bug | any>>([])
  const [isLoadingRelatedItems, setIsLoadingRelatedItems] = useState(false)

  // Lightbox state
  const [showLightbox, setShowLightbox] = useState(false)
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // Edit modal state
  const [bugEditModalOpen, setBugEditModalOpen] = useState(false)

  // Subtask state
  const [subtasksKey, setSubtasksKey] = useState(0) // For refreshing subtasks list

  // Project/Subproject names
  const [projectName, setProjectName] = useState<string>('')
  const [subprojectName, setSubprojectName] = useState<string>('')

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



  // Load related items (tasks and bugs)
  const loadRelatedItems = useCallback(async () => {
    if (!bug || !bug.relatedBugs || typeof bug.relatedBugs !== 'string') {
      setRelatedItemsData([])
      return
    }

    try {
      setIsLoadingRelatedItems(true)
      const itemIds = bug.relatedBugs.split(',').map(id => id.trim()).filter(id => id)

      if (itemIds.length === 0) {
        setRelatedItemsData([])
        return
      }

      // Fetch each related item (task or bug)
      const itemPromises = itemIds.map(async (itemId) => {
        try {
          // Determine if it's a task (JSR-*) or bug (BUG-*)
          const isTask = itemId.startsWith('JSR-')
          const isBug = itemId.startsWith('BUG-')

          if (isTask) {
            const response = await fetch(`/api/tasks/${itemId}`)
            const data = await response.json()
            if (data.success && data.data) {
              return { ...data.data, itemType: 'task' }
            }
          } else if (isBug) {
            const response = await fetch(`/api/bugs/${itemId}`)
            const data = await response.json()
            if (data.success && data.data) {
              return { ...data.data, itemType: 'bug' }
            }
          }
          return null
        } catch (error) {
          console.error(`Failed to load item ${itemId}:`, error)
          return null
        }
      })

      const items = await Promise.all(itemPromises)
      setRelatedItemsData(items.filter(item => item !== null))
    } catch (error) {
      console.error('Failed to load related items:', error)
    } finally {
      setIsLoadingRelatedItems(false)
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



  // Load related items when bug data is available
  useEffect(() => {
    if (bug) {
      loadRelatedItems()
    }
  }, [bug, loadRelatedItems])

  // Load project and subproject names
  useEffect(() => {
    const loadProjectNames = async () => {
      if (!bug) return

      try {
        if (bug.projectId) {
          const response = await fetch(`/api/projects/${bug.projectId}`)
          const data = await response.json()
          if (data && data.projectName) {
            setProjectName(data.projectName)
          }
        }

        if (bug.subprojectId) {
          const response = await fetch(`/api/projects/${bug.subprojectId}`)
          const data = await response.json()
          if (data && data.projectName) {
            setSubprojectName(data.projectName)
          }
        }
      } catch (error) {
        console.error('Failed to load project names:', error)
      }
    }

    loadProjectNames()
  }, [bug])

  const handleAssigneeChange = async (newAssignee: string) => {
    if (!bug || !newAssignee || !currentUser) return

    setIsUpdating(true)
    try {
      const updates: Partial<Bug> = {
        assignedTo: newAssignee,
        assignedBy: currentUser.employeeId,
        status: bug.status === 'New' ? 'In Progress' : bug.status,
        updatedAt: getCurrentDateTime()
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
        updates.resolvedDate = getCurrentDateTime()
      }

      // If marking as closed, set closed date
      if (newStatus === 'Closed' && bug.status !== 'Closed') {
        updates.closedDate = getCurrentDateTime()
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

  const handleReleaseStateChange = async (releaseState: ReleaseState) => {
    if (!bug) return

    const updates: Partial<Bug> = {
      releaseState,
      updatedAt: new Date().toISOString()
    }

    // Optimistic UI update
    setBug({ ...bug, ...updates })

    try {
      await updateBug(bug.bugId, updates)
    } catch (error) {
      console.error('Failed to update release state:', error)
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
        updatedAt: getCurrentDateTime()
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
        updatedAt: getCurrentDateTime()
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
        updatedAt: getCurrentDateTime()
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
        updatedAt: getCurrentDateTime()
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
        updatedAt: getCurrentDateTime()
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

  const handleStartDateChange = async (newStartDate: string) => {
    if (!bug || !currentUser) return

    setIsUpdating(true)
    try {
      const updates: Partial<Bug> = {
        startDate: newStartDate ? new Date(newStartDate).toISOString() : undefined,
        updatedAt: getCurrentDateTime()
      }

      // Update UI immediately
      setBug({ ...bug, ...updates })
      setIsEditingStartDate(false)

      // Update backend
      try {
        await updateBug(bug.bugId, updates)
      } catch (error) {
        console.warn('Backend update failed, but UI updated:', error)
      }
    } catch (error) {
      console.error('Failed to update start date:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleEndDateChange = async (newEndDate: string) => {
    if (!bug || !currentUser) return

    setIsUpdating(true)
    try {
      const updates: Partial<Bug> = {
        endDate: newEndDate ? new Date(newEndDate).toISOString() : undefined,
        updatedAt: getCurrentDateTime()
      }

      // Update UI immediately
      setBug({ ...bug, ...updates })
      setIsEditingEndDate(false)

      // Update backend
      try {
        await updateBug(bug.bugId, updates)
      } catch (error) {
        console.warn('Backend update failed, but UI updated:', error)
      }
    } catch (error) {
      console.error('Failed to update end date:', error)
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
  const isCanCommentAssign = currentUser.role === 'admin' || currentUser.role === 'management' || currentUser.role === 'top_management' || currentUser.role === 'amtarikshian'
  const canEdit = canEditBug(bug, currentUser.employeeId, isCanCommentAssign)
  const canComment = canCommentOnBug(bug, currentUser.employeeId, isCanCommentAssign)
  const canAssign = isCanCommentAssign || bug.reportedBy === currentUser.employeeId || bug.assignedTo === currentUser.employeeId

  return (
    <div>
      <Navbar />
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Breadcrumb Navigation */}
        {bug.parentDevId && (
          <SubtaskBreadcrumb
            currentId={bug.bugId}
            currentType="bug"
            currentName={bug.title}
          />
        )}

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
                <span>{getBugDisplayId(bug.bugId, bug.type)}</span>
                {projectName && (
                  <>
                    <span className="text-gray-400">-</span>
                    <span className="text-lg text-gray-700">Project: {projectName}</span>
                    {subprojectName && (
                      <>
                        <span className="text-gray-400">&gt;</span>
                        <span className="text-lg text-gray-700">Sub Project: {subprojectName}</span>
                      </>
                    )}
                  </>
                )}
              </h1>

              {/* Assignee Dropdown */}
              <div className="mt-2 flex items-center space-x-2">
                <span className="text-sm text-gray-600">Assigned to:</span>
                {canEdit ? (
                  <select
                    value={bug.assignedTo || ''}
                    onChange={async (e) => {
                      const newAssignee = e.target.value
                      const oldAssignee = bug.assignedTo

                      // Optimistic update
                      setBug({ ...bug, assignedTo: newAssignee })

                      try {
                        const response = await fetch(`/api/bugs/${bug.bugId}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ assignedTo: newAssignee })
                        })

                        if (!response.ok) {
                          // Revert on error
                          setBug({ ...bug, assignedTo: oldAssignee })
                          throw new Error('Failed to update assignee')
                        }

                        // Reload bug data to get updated activity log
                        loadBugData()
                      } catch (error) {
                        console.error('Error updating assignee:', error)
                        // Revert on error
                        setBug({ ...bug, assignedTo: oldAssignee })
                      }
                    }}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {users
                      .filter(u => u.status === 'active')
                      .sort((a, b) => a.employeeId.localeCompare(b.employeeId))
                      .map(user => (
                        <option key={user.employeeId} value={user.employeeId}>
                          {user.employeeId} - {user.name}
                        </option>
                      ))}
                  </select>
                ) : (
                  <span className="text-sm font-medium text-gray-900">
                    {bug.assignedTo ? `${bug.assignedTo} - ${users.find(u => u.employeeId === bug.assignedTo)?.name || 'Unknown'}` : 'Unassigned'}
                  </span>
                )}
              </div>
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
            {/* Release Checklist View - replaces Bug Details + Reproduction + Activity for release bugs */}
            {bug.type === 'release' && (
              <ReleaseChecklistView
                bug={bug}
                canEdit={canEdit}
                onChange={handleReleaseStateChange}
              />
            )}

            {/* Bug Details */}
            {bug.type !== 'release' && (
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
                  <Pencil className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors" />
                </button>
              </div>

              <div className="space-y-4">
                <CollapsibleText
                  title={bug.type === 'feature' ? 'Feature Description' : 'Steps to Reproduce'}
                  content={bug.description}
                  maxCharacters={300}
                  maxLines={5}
                  textClassName="text-gray-700"
                  buttonPosition="right"
                  showGradient={true}
                  gradientColor="white"
                  persistState={false}
                />

                {/* Dates Section - Inline Editable */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div>
                    <span className="text-sm font-medium text-gray-600">Start Date:</span>
                    {isEditingStartDate ? (
                      <div className="flex items-center space-x-2 mt-1">
                        <input
                          type="date"
                          value={tempStartDate}
                          onChange={(e) => setTempStartDate(e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          autoFocus
                        />
                        <button
                          onClick={() => handleStartDateChange(tempStartDate)}
                          disabled={isUpdating}
                          className="px-2 py-1 bg-primary text-white rounded text-xs hover:bg-primary-dark disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingStartDate(false)
                            setTempStartDate(formatDateForInput(bug.startDate))
                          }}
                          className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setTempStartDate(formatDateForInput(bug.startDate))
                          setIsEditingStartDate(true)
                        }}
                        className="ml-2 text-sm text-gray-900 hover:text-primary transition-colors group inline-flex items-center space-x-1"
                      >
                        <span>{formatDate(bug.startDate)}</span>
                        <Pencil className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}
                  </div>

                  {/* End Date */}
                  <div>
                    <span className="text-sm font-medium text-gray-600">End Date:</span>
                    {isEditingEndDate ? (
                      <div className="flex items-center space-x-2 mt-1">
                        <input
                          type="date"
                          value={tempEndDate}
                          onChange={(e) => setTempEndDate(e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          autoFocus
                        />
                        <button
                          onClick={() => handleEndDateChange(tempEndDate)}
                          disabled={isUpdating}
                          className="px-2 py-1 bg-primary text-white rounded text-xs hover:bg-primary-dark disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingEndDate(false)
                            setTempEndDate(formatDateForInput(bug.endDate))
                          }}
                          className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setTempEndDate(formatDateForInput(bug.endDate))
                          setIsEditingEndDate(true)
                        }}
                        className="ml-2 text-sm text-gray-900 hover:text-primary transition-colors group inline-flex items-center space-x-1"
                      >
                        <span>{formatDate(bug.endDate)}</span>
                        <Pencil className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}
                  </div>
                </div>

                {bug.expectedBehavior && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Expected Behavior</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{bug.expectedBehavior}</p>
                  </div>
                )}

                {/* Hide these fields for feature-type bugs */}
                {bug.type !== 'feature' && bug.actualBehavior && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Actual Behavior</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{bug.actualBehavior}</p>
                  </div>
                )}

                {bug.type !== 'feature' && bug.serverLogs && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Server Logs</h3>
                    <pre className="text-gray-700 whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-lg overflow-x-auto">{bug.serverLogs}</pre>
                  </div>
                )}

                {bug.type !== 'feature' && bug.frontendLogs && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Frontend Logs</h3>
                    <pre className="text-gray-700 whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-lg overflow-x-auto">{bug.frontendLogs}</pre>
                  </div>
                )}

                {bug.developmentPrompt && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Development Prompt</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{bug.developmentPrompt}</p>
                  </div>
                )}


                {/* Browser and Device Information */}
                {(bug.browserInfo || bug.deviceInfo) && (
                  <div className="bg-gray-50 rounded-lg p-4">
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
                {(() => {
                  // Handle both string (from REST API) and array (from GraphQL) formats
                  const attachmentUrls = Array.isArray(bug.attachments)
                    ? bug.attachments
                    : (bug.attachments && typeof bug.attachments === 'string' && bug.attachments.trim())
                      ? bug.attachments.split(',').map(u => u.trim()).filter(u => u)
                      : []

                  // Separate image attachments for lightbox
                  const imageUrls = attachmentUrls.filter(url => {
                    const ext = url.match(/\.([^.?]+)(\?|$)/)?.[1]?.toLowerCase()
                    return ext && ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)
                  })

                  return attachmentUrls.length > 0 && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                        <Paperclip className="h-5 w-5" />
                        <span>Attachments ({attachmentUrls.length})</span>
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {attachmentUrls.map((url, index) => {
                          const trimmedUrl = typeof url === 'string' ? url.trim() : url
                          if (!trimmedUrl) return null

                          // Check if this is an image for lightbox
                          const ext = trimmedUrl.match(/\.([^.?]+)(\?|$)/)?.[1]?.toLowerCase()
                          const isImage = ext && ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)

                          return (
                            <AttachmentDisplay
                              key={index}
                              url={trimmedUrl}
                              index={index}
                              onImageClick={isImage ? () => {
                                setLightboxImages(imageUrls)
                                setLightboxIndex(imageUrls.indexOf(trimmedUrl))
                                setShowLightbox(true)
                              } : undefined}
                            />
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Metadata */}
              <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-500">
                <div>
                  <span className="font-medium block mb-1">Created</span>
                  <span>{formatDateTimeIST(bug.createdAt)}</span>
                </div>
                <div>
                  <span className="font-medium block mb-1">Updated</span>
                  <span>{formatDateTimeIST(bug.updatedAt)}</span>
                </div>
                <div>
                  <span className="font-medium block mb-1">Reporter</span>
                  <div className="flex items-center gap-1">
                    <UserName employeeId={bug.reportedBy} />
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Subtasks */}
            <SubtasksList
              key={subtasksKey}
              parentId={bug.bugId}
              parentType="bug"
              parentData={{
                projectId: bug.projectId,
                subprojectId: bug.subprojectId,
                department: null,
                assignedBy: bug.assignedBy || bug.reportedBy,
                priority: bug.priority
              }}
            />

            {/* Activity Timeline (includes comments and system activities) - hidden for release bugs */}
            {bug.type !== 'release' && (
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
                showPrompts={showPrompts}
                onToggleActivity={(exclusive = false) => {
                  if (exclusive) {
                    // Single-click: Show only Activity
                    setShowActivity(true)
                    setShowComments(false)
                    setShowPrompts(false)
                  } else {
                    // Double-click: Toggle Activity
                    setShowActivity(!showActivity)
                  }
                }}
                onToggleComments={(exclusive = false) => {
                  if (exclusive) {
                    // Single-click: Show only Comments
                    setShowActivity(false)
                    setShowComments(true)
                    setShowPrompts(false)
                  } else {
                    // Double-click: Toggle Comments
                    setShowComments(!showComments)
                  }
                }}
                onTogglePrompts={(exclusive = false) => {
                  if (exclusive) {
                    // Single-click: Show only Prompts
                    setShowActivity(false)
                    setShowComments(false)
                    setShowPrompts(true)
                  } else {
                    // Double-click: Toggle Prompts
                    setShowPrompts(!showPrompts)
                  }
                }}
                filterFn={(activity) => {
                  // Count how many filters are active
                  const activeFilters = [showActivity, showComments, showPrompts].filter(Boolean).length

                  // If all are OFF or all are ON, show everything
                  if (activeFilters === 0 || activeFilters === 3) {
                    return true
                  }

                  // If only one filter is active, show only that type
                  if (activeFilters === 1) {
                    if (showActivity) return !activity.isComment && activity.actionType !== 'prompt'
                    if (showComments) return activity.isComment
                    if (showPrompts) return activity.actionType === 'prompt'
                  }

                  // If two filters are active, show both types
                  if (activeFilters === 2) {
                    if (showActivity && showComments) {
                      return activity.isComment || (!activity.isComment && activity.actionType !== 'prompt')
                    }
                    if (showActivity && showPrompts) {
                      return activity.actionType === 'prompt' || (!activity.isComment && activity.actionType !== 'prompt')
                    }
                    if (showComments && showPrompts) {
                      return activity.isComment || activity.actionType === 'prompt'
                    }
                  }

                  return true
                }}
              />
            </div>
            )}
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

                {/* Log Hours Button - Disabled for Closed/Resolved bugs */}
                {canEdit && bug.status !== 'Closed' && bug.status !== 'Resolved' && (
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

                  {/* Timer Play/Pause Button - 20% larger and disabled for Closed/Resolved */}
                  {canEdit && bug.status !== 'Closed' && bug.status !== 'Resolved' && (
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
                          className={`h-2 rounded-full ${(bug.actualHours || 0) > bug.estimatedHours
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

            {/* Bug Checklists - Moved from bottom */}
            {bug.type === 'release' ? (
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                  <CheckSquare className="h-5 w-5" />
                  <span>Release Checklist</span>
                </h3>
                <div className="max-h-96 overflow-y-auto space-y-4 pr-1">
                  {(bug.releaseState?.platforms ?? []).map((platform) => {
                    const checklist = bug.releaseState?.checklists?.[platform]
                    if (!checklist) return null
                    const templateItems = checklist.template.flatMap((s) => s.items)
                    const allItems = [...templateItems, ...checklist.manual]
                    return (
                      <div key={platform}>
                        <h4 className="text-sm font-semibold text-gray-800 mb-2 capitalize">
                          {platform === 'ios' ? 'iOS' : 'Android'}
                        </h4>
                        <div className="space-y-1">
                          {allItems.length === 0 && (
                            <p className="text-xs text-gray-400">No items.</p>
                          )}
                          {allItems.map((item) => {
                            const done = !!checklist.completed[item.id]
                            return (
                              <div key={item.id} className="flex items-start space-x-2 text-sm">
                                {done ? (
                                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <span className="h-4 w-4 rounded-full border border-gray-300 flex-shrink-0 mt-0.5" />
                                )}
                                <span className={done ? 'text-gray-500 line-through' : 'text-gray-700'}>
                                  {item.text}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <BugChecklistManager
                  parentBugId={bug.bugId}
                  createdBy={currentUser.employeeId}
                  editable={canEdit}
                  defaultExpanded={true}
                  compact={false}
                />
              </div>
            )}

            {/* Related Items */}
            <RelatedItemsManager
              itemId={bug.bugId}
              itemType="development"
              canEdit={canEdit}
            />

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

            {/* Related Items (Tasks/Bugs) */}
            {(bug.relatedBugs || relatedItemsData.length > 0) && (
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                  <ExternalLink className="h-5 w-5" />
                  <span>Related Items</span>
                </h3>

                {isLoadingRelatedItems ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Loading related items...</span>
                  </div>
                ) : relatedItemsData.length > 0 ? (
                  <div className="space-y-2">
                    {relatedItemsData.map((item: any) => {
                      const isBug = item.itemType === 'bug'
                      const itemId = isBug ? item.bugId : item.taskId
                      const itemUrl = isBug ? `/bugs/${itemId}` : `/tasks/${itemId}`

                      return (
                        <a
                          key={itemId}
                          href={itemUrl}
                          className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className={`text-sm font-medium ${isBug ? 'text-red-600' : 'text-blue-600'}`}>
                                  {itemId}
                                </span>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${item.status === 'New' || item.status === 'To Do' ? 'bg-blue-100 text-blue-700' :
                                  item.status === 'In Progress' ? 'bg-yellow-100 text-yellow-700' :
                                    item.status === 'Resolved' || item.status === 'Done' ? 'bg-green-100 text-green-700' :
                                      item.status === 'Closed' ? 'bg-gray-100 text-gray-700' :
                                        'bg-red-100 text-red-700'
                                  }`}>
                                  {item.status}
                                </span>
                                {isBug && item.severity && (
                                  <span className={`px-2 py-0.5 text-xs rounded-full ${item.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                                    item.severity === 'Major' ? 'bg-orange-100 text-orange-700' :
                                      'bg-yellow-100 text-yellow-700'
                                    }`}>
                                    {item.severity}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-900 mt-1">{isBug ? item.title : item.name}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {isBug ? `${item.category} • ${item.platform}` : `${item.department || 'General'}`}
                              </p>
                            </div>
                            <ExternalLink className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                          </div>
                        </a>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No related items found</p>
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
