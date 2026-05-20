/**
 * Bug Listing Page - Role-based bug visibility and filtering
 * Updated: 2025-10-23 - Fixed statistics and visibility issues
 * Updated: GraphQL migration with REST fallback
 */
'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { Bug } from '@/lib/types'
import { getAllBugs, getBugStatistics } from '@/lib/bugService'
import { getCurrentUser, getUserNameByEmployeeId, getAllUsers } from '@/lib/auth'
import { hasTabAccess } from '@/lib/permissions'
import { useLoading } from '@/contexts/LoadingContext'
import { QUERIES } from '@/lib/graphql-queries'
import HierarchicalBugRow from '@/components/bugs/HierarchicalBugRow'
import BugGridView from '@/components/bugs/BugGridView'
import MultiSelect from '@/components/ui/MultiSelect'
import {
  Bug as BugIcon,
  Plus,
  Filter,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Edit,
  Trash2,
  BarChart3,
  RefreshCw,
  Sparkles,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

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
    getUserNameByEmployeeId(employeeId).then(setName)
  }, [employeeId])

  return <span>{name}</span>
}

// Component to display project name (now from GraphQL data)
function ProjectDisplay({ project }: { project?: { projectId: string; projectName: string; description?: string } | null }) {
  if (!project || !project.projectName) return null

  return (
    <div className="flex items-center space-x-2 text-sm text-gray-600">
      <span className="text-gray-400">-</span>
      <span>{project.projectName}</span>
    </div>
  )
}

export default function BugsPage() {
  const [bugs, setBugs] = useState<Bug[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [severityFilter, setSeverityFilter] = useState<string[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState<string[]>([]) // New: Bug type filter
  const [projectFilter, setProjectFilter] = useState('all') // NEW: Project filter
  const [subprojectFilter, setSubprojectFilter] = useState('all') // NEW: Subproject filter
  const [viewMode, setViewMode] = useState<'cards' | 'grid'>('cards')

  // Type for bug statistics
  type BugStatistics = {
    total: number
    byStatus: Record<string, number>
    bySeverity: Record<string, number>
    byCategory: Record<string, number>
    byPlatform: Record<string, number>
    byType: {
      bug: number
      feature: number
    }
  } | null

  const [statistics, setStatistics] = useState<BugStatistics>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [retryCount, setRetryCount] = useState(0)
  const [isOnline, setIsOnline] = useState(true)
  const hasLoadedData = useRef(false)
  const [projects, setProjects] = useState<any[]>([]) // NEW: Projects list
  const [subprojects, setSubprojects] = useState<any[]>([]) // NEW: Subprojects list

  // Infinite scroll state
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null)
  const ITEMS_PER_PAGE = 10

  // Settings data from database
  const [settingsData, setSettingsData] = useState<{
    bugStatuses: Array<{ value: string; icon: string }>;
    severities: Array<{ value: string; icon: string }>;
    categories: Array<{ value: string; icon: string }>;
    bugTypes: Array<{ value: string; icon: string }>;
  }>({
    bugStatuses: [
      { value: 'New', icon: '🆕' },
      { value: 'In Progress', icon: '🔄' },
      { value: 'Resolved', icon: '✅' },
      { value: 'Closed', icon: '🔒' },
      { value: 'Reopened', icon: '↩️' }
    ],
    severities: [
      { value: 'Critical', icon: '🔴' },
      { value: 'High', icon: '🟠' },
      { value: 'Medium', icon: '🟡' },
      { value: 'Low', icon: '🟢' }
    ],
    categories: [
      { value: 'UI', icon: '🎨' },
      { value: 'Functionality', icon: '⚙️' },
      { value: 'Performance', icon: '🚀' },
      { value: 'Security', icon: '🔒' },
      { value: 'Other', icon: '📦' }
    ],
    bugTypes: [
      { value: 'Bug', icon: '🐛' },
      { value: 'Feature', icon: '✨' },
      { value: 'Testcase', icon: '📋' },
      { value: 'Other', icon: '📦' }
    ]
  })

  const router = useRouter()
  const currentUser = getCurrentUser()
  const { showGlobalLoading, hideGlobalLoading } = useLoading()

  // Handle hydration and load persisted filters
  useEffect(() => {
    setIsHydrated(true)

    // Permission gate: redirect if user can't access this tab
    const user = getCurrentUser()
    if (!user) { router.push('/'); return }
    if (!hasTabAccess(user, 'bugs')) { router.push('/dashboard'); return }

    // Load persisted filters from localStorage
    try {
      const savedFilters = localStorage.getItem('bugFilters')
      if (savedFilters) {
        const filters = JSON.parse(savedFilters)
        setSearchTerm(filters.searchTerm || '')
        setStatusFilter(Array.isArray(filters.statusFilter) ? filters.statusFilter : [])
        setSeverityFilter(Array.isArray(filters.severityFilter) ? filters.severityFilter : [])
        setCategoryFilter(Array.isArray(filters.categoryFilter) ? filters.categoryFilter : [])
        setAssigneeFilter(Array.isArray(filters.assigneeFilter) ? filters.assigneeFilter : (filters.assigneeFilter === 'me' ? ['me'] : []))
        setTypeFilter(Array.isArray(filters.typeFilter) ? filters.typeFilter : [])
        setProjectFilter(filters.projectFilter || 'all')
        setSubprojectFilter(filters.subprojectFilter || 'all')
        if (filters.viewMode === 'grid' || filters.viewMode === 'cards') {
          setViewMode(filters.viewMode)
        }
      } else {
        // Set default assignee filter to "me" (My Bugs) if no saved filters
        setAssigneeFilter(['me'])
      }
    } catch (error) {
      console.error('Failed to load saved filters:', error)
      // Set default assignee filter to "me" on error
      setAssigneeFilter(['me'])
    }

    // Monitor network status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Load settings data from GraphQL
  useEffect(() => {
    async function loadSettings() {
      try {
        console.log('🔵 [Bugs] Loading settings via GraphQL...')
        const data = await executeGraphQLQuery(QUERIES.GET_SETTINGS, { activeOnly: true })

        if (data && data.settings) {
          const settings = data.settings

          // Process bug statuses (use bug_statuses key from settings table)
          const bugStatusesSetting = settings.find((s: any) => s.key === 'bug_statuses')
          let bugStatuses: Array<{ value: string; icon: string }> = []
          if (bugStatusesSetting) {
            try {
              const values = JSON.parse(bugStatusesSetting.value)
              bugStatuses = values.map((val: string) => ({
                value: val,
                icon: '' // Icons are not stored in settings yet
              }))
            } catch (e) {
              console.error('Failed to parse bug_statuses:', e)
            }
          }

          // Process severities
          const severitiesSetting = settings.find((s: any) => s.key === 'bug_severities') || settings.find((s: any) => s.key === 'severities')
          let severities: Array<{ value: string; icon: string }> = []
          if (severitiesSetting) {
            try {
              const values = JSON.parse(severitiesSetting.value)
              severities = values.map((val: string) => ({
                value: val,
                icon: '' // Icons are not stored in settings yet
              }))
            } catch (e) {
              console.error('Failed to parse bug_severities:', e)
            }
          }

          // Process categories
          const categoriesSetting = settings.find((s: any) => s.key === 'bug_categories') || settings.find((s: any) => s.key === 'categories')
          let categories: Array<{ value: string; icon: string }> = []
          if (categoriesSetting) {
            try {
              const values = JSON.parse(categoriesSetting.value)
              categories = values.map((val: string) => ({
                value: val,
                icon: '' // Icons are not stored in settings yet
              }))
            } catch (e) {
              console.error('Failed to parse bug_categories:', e)
            }
          }

          // Process bug types
          const typesSetting = settings.find((s: any) => s.key === 'bug_types')
          let bugTypes: Array<{ value: string; icon: string }> = []
          if (typesSetting) {
            try {
              const values = JSON.parse(typesSetting.value)
              bugTypes = values.map((val: string) => ({
                value: val,
                icon: '' // Icons are not stored in settings yet
              }))
            } catch (e) {
              console.error('Failed to parse bug_types:', e)
            }
          }

          setSettingsData({
            bugStatuses: bugStatuses.length > 0 ? bugStatuses : [
              { value: 'New', icon: '🆕' },
              { value: 'In Progress', icon: '🔄' },
              { value: 'Resolved', icon: '✅' },
              { value: 'Closed', icon: '🔒' },
              { value: 'Reopened', icon: '↩️' }
            ],
            severities: severities.length > 0 ? severities : [
              { value: 'Critical', icon: '🔴' },
              { value: 'High', icon: '🟠' },
              { value: 'Medium', icon: '🟡' },
              { value: 'Low', icon: '🟢' }
            ],
            categories: categories.length > 0 ? categories : [
              { value: 'UI', icon: '🎨' },
              { value: 'Functionality', icon: '⚙️' },
              { value: 'Performance', icon: '🚀' },
              { value: 'Security', icon: '🔒' },
              { value: 'Other', icon: '📦' }
            ],
            bugTypes: bugTypes.length > 0 ? bugTypes : [
              { value: 'Bug', icon: '🐛' },
              { value: 'Feature', icon: '✨' },
              { value: 'Testcase', icon: '📋' },
              { value: 'Other', icon: '📦' }
            ]
          })
          console.log('✅ [Bugs] Settings loaded successfully via GraphQL')
        }
      } catch (error) {
        console.error('❌ [Bugs] Failed to load settings via GraphQL:', error)
      }
    }

    loadSettings()
  }, [])

  const loadBugs = useCallback(async (isRetry = false, loadMore = false) => {
    try {
      if (loadMore) {
        setIsLoadingMore(true)
      } else {
        setIsLoading(true)
        setOffset(0)
        setHasMore(true)
      }
      setError(null)

      const currentOffset = loadMore ? offset : 0
      let bugsData: Bug[] = []

      // Build filter variables for GraphQL
      const variables: any = {
        limit: ITEMS_PER_PAGE,
        offset: currentOffset
      }

      // Add filters if they're not empty
      if (assigneeFilter.length > 0) {
        // Handle "me" logic
        let filters = [...assigneeFilter]
        if (filters.includes('me') && currentUser?.employeeId) {
          filters = filters.filter(id => id !== 'me')
          filters.push(currentUser.employeeId)
        }
        if (filters.length > 0) variables.assignedTo = filters
      }
      if (statusFilter.length > 0) variables.status = statusFilter
      if (severityFilter.length > 0) variables.severity = severityFilter
      if (categoryFilter.length > 0) variables.category = categoryFilter
      if (typeFilter.length > 0) variables.type = typeFilter

      if (projectFilter && projectFilter !== 'all') {
        variables.projectId = projectFilter
      }
      if (subprojectFilter && subprojectFilter !== 'all') {
        variables.subprojectId = subprojectFilter
      }

      // Try GraphQL first with pagination and filters
      try {
        console.log('🔵 [Bugs] Attempting GraphQL query with pagination and filters...', variables)
        const data = await executeGraphQLQuery(QUERIES.GET_BUGS, variables)
        bugsData = data.bugs || []
        console.log('✅ [Bugs] GraphQL query successful:', bugsData.length, 'bugs')
      } catch (graphqlError) {
        console.warn('⚠️ [Bugs] GraphQL failed, falling back to REST:', graphqlError)

        // Fallback to REST API with pagination and filters
        const params = new URLSearchParams({
          limit: ITEMS_PER_PAGE.toString(),
          offset: currentOffset.toString()
        })

        if (assigneeFilter.length > 0) {
          let filters = [...assigneeFilter]
          if (filters.includes('me') && currentUser?.employeeId) {
            filters = filters.filter(id => id !== 'me')
            filters.push(currentUser.employeeId)
          }
          if (filters.length > 0) params.append('assignedTo', filters.join(','))
        }
        if (statusFilter.length > 0) params.append('status', statusFilter.join(','))
        if (severityFilter.length > 0) params.append('severity', severityFilter.join(','))
        if (categoryFilter.length > 0) params.append('category', categoryFilter.join(','))
        if (typeFilter.length > 0) params.append('type', typeFilter.join(','))
        if (projectFilter && projectFilter !== 'all') params.append('projectId', projectFilter)
        if (subprojectFilter && subprojectFilter !== 'all') params.append('subprojectId', subprojectFilter)

        const response = await fetch(`/api/bugs?${params.toString()}`)
        if (!response.ok) {
          throw new Error('Failed to fetch bugs')
        }

        const result = await response.json()
        bugsData = result.data || []
        console.log('✅ [Bugs] REST API successful:', bugsData.length, 'bugs')
      }

      // Check if there are more items to load
      if (bugsData.length < ITEMS_PER_PAGE) {
        setHasMore(false)
      }

      // Note: Role-based filtering is NOT applied here anymore
      // All users can see all bugs in the system
      // The assignee filter dropdown allows users to filter by specific assignees
      // This ensures consistent bug visibility across all users and matches task behavior

      if (loadMore) {
        // Append new bugs to existing ones with deduplication
        setBugs(prev => {
          const combined = [...prev, ...bugsData]
          // Deduplicate by bugId using a Map
          const uniqueBugs = Array.from(new Map(combined.map(bug => [bug.bugId, bug])).values())
          return uniqueBugs
        })
        setOffset(prev => prev + ITEMS_PER_PAGE)
      } else {
        // Replace bugs (initial load or filter change)
        setBugs(bugsData)
        setOffset(ITEMS_PER_PAGE)
      }

      // Calculate statistics from all loaded bugs
      setStatistics(prev => {
        const allBugs = loadMore ? [...bugs, ...bugsData] : bugsData
        return calculateStatistics(allBugs)
      })

      setError(null) // Clear any previous errors
      setRetryCount(0) // Reset retry count on success
    } catch (error) {
      console.error('Failed to load bugs:', error)

      let errorMessage = 'Failed to load bugs. '
      if (error instanceof Error) {
        errorMessage += error.message
      } else {
        errorMessage += 'This might be due to network issues or service quota limits. Please try again in a few minutes.'
      }

      setError(errorMessage)
      setBugs([]) // Set empty array on error

      if (isRetry) {
        setRetryCount(prev => prev + 1)
      }
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [offset, assigneeFilter, statusFilter, severityFilter, projectFilter, subprojectFilter, bugs, ITEMS_PER_PAGE, currentUser])

  // Reload bugs when filters change (reset pagination)
  useEffect(() => {
    if (!initialized) return // Don't reload during initial mount

    console.log('🔵 [Bugs] Filters changed, reloading bugs from beginning...')
    loadBugs(false, false) // Reset to first page
  }, [statusFilter, severityFilter, categoryFilter, assigneeFilter, typeFilter, projectFilter, subprojectFilter, initialized])

  // Intersection Observer for infinite scroll (trigger at 80% scroll)
  useEffect(() => {
    if (!loadMoreTriggerRef.current || !hasMore || isLoadingMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && hasMore && !isLoadingMore) {
          console.log('🔵 [Bugs] Load more trigger reached, loading next batch...')
          loadBugs(false, true) // loadMore = true
        }
      },
      {
        root: null, // viewport
        rootMargin: '0px 0px 200px 0px', // Trigger 200px before reaching the element (approximately 80% scroll)
        threshold: 0.1
      }
    )

    observer.observe(loadMoreTriggerRef.current)

    return () => {
      observer.disconnect()
    }
  }, [hasMore, isLoadingMore, loadBugs])

  // Save filters to localStorage whenever they change
  useEffect(() => {
    if (!isHydrated) return // Don't save during initial hydration

    try {
      const filters = {
        searchTerm,
        statusFilter,
        severityFilter,
        categoryFilter,
        assigneeFilter,
        typeFilter,
        projectFilter,
        subprojectFilter,
        viewMode
      }
      localStorage.setItem('bugFilters', JSON.stringify(filters))
    } catch (error) {
      console.error('Failed to save filters:', error)
    }
  }, [searchTerm, statusFilter, severityFilter, categoryFilter, assigneeFilter, typeFilter, projectFilter, subprojectFilter, viewMode, isHydrated])

  // Calculate statistics from filtered bugs (user's visible bugs)
  const calculateStatistics = useCallback((bugsData: Bug[]) => {
    const stats = {
      total: bugsData.length,
      byStatus: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      byPlatform: {} as Record<string, number>,
      byType: {
        bug: 0,
        feature: 0
      }
    }

    bugsData.forEach(bug => {
      // Count by status
      stats.byStatus[bug.status] = (stats.byStatus[bug.status] || 0) + 1

      // Count by severity
      stats.bySeverity[bug.severity] = (stats.bySeverity[bug.severity] || 0) + 1

      // Count by category
      stats.byCategory[bug.category] = (stats.byCategory[bug.category] || 0) + 1

      // Count by platform
      stats.byPlatform[bug.platform] = (stats.byPlatform[bug.platform] || 0) + 1

      // Count by type
      const bugType = (bug as any).type
      if (bugType === 'feature') {
        stats.byType.feature++
      } else {
        // All non-feature types are counted as bugs (null, 'testcase', 'other', etc.)
        stats.byType.bug++
      }
    })

    return stats
  }, [])

  const loadUsers = useCallback(async () => {
    try {
      const allUsers = await getAllUsers()
      setUsers(allUsers.filter(user => user.status === 'active'))
    } catch (error) {
      console.error('Failed to load users:', error)
    }
  }, [])

  // NEW: Load projects
  const loadProjects = useCallback(async () => {
    try {
      const response = await fetch('/api/projects')
      const data = await response.json()
      if (Array.isArray(data)) {
        // Filter to only main projects (no parent)
        const mainProjects = data.filter((p: any) => !p.parentProjectId)
        setProjects(mainProjects)
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
    }
  }, [])

  // NEW: Load subprojects when project changes
  useEffect(() => {
    if (projectFilter && projectFilter !== 'all') {
      fetch(`/api/projects?parentId=${projectFilter}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setSubprojects(data.filter((p: any) => p.parentProjectId === projectFilter))
          }
        })
        .catch(error => console.error('Failed to load subprojects:', error))
    } else {
      setSubprojects([])
      setSubprojectFilter('all')
    }
  }, [projectFilter])

  useEffect(() => {
    if (!isHydrated) return

    if (!currentUser) {
      router.push('/')
      return
    }

    // Admin users have full access to bug tracking

    if (hasLoadedData.current) return // Prevent multiple executions using ref

    const loadInitialData = async () => {
      try {
        hasLoadedData.current = true // Mark as loading to prevent multiple calls
        // Inline the loading logic to avoid dependency issues
        await Promise.all([
          loadBugs(), // This now also calculates statistics from filtered bugs
          loadUsers(),
          loadProjects() // NEW: Load projects
        ])
      } catch (error) {
        console.error('Failed to load initial data:', error)
        hasLoadedData.current = false // Reset on error to allow retry
      } finally {
        setInitialized(true)
      }
    }

    loadInitialData()
  }, [currentUser, router, isHydrated]) // Stable dependencies only

  // Memoized filtered bugs for better performance and to prevent infinite loops
  // Note: Status, severity, and assignee filters are now handled server-side for pagination
  // Only client-side search filter, category filter, type filter, and subtask filtering remain
  const filteredBugs = useMemo(() => {
    let filtered = bugs

    // Filter out subtasks - only show root bugs (bugs without parent_dev_id)
    filtered = filtered.filter(bug => !bug.parentDevId)

    // Search filter (client-side only)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(bug =>
        (bug.title && bug.title.toLowerCase().includes(searchLower)) ||
        (bug.description && bug.description.toLowerCase().includes(searchLower)) ||
        (bug.bugId && bug.bugId.toLowerCase().includes(searchLower))
      )
    }

    // Category and Type filters are now handled server-side!
    // No additional client-side filtering needed for them.

    // Note: Server already returns bugs sorted by updated_at DESC
    // We don't need additional sorting here

    return filtered
  }, [bugs, searchTerm, categoryFilter, typeFilter, currentUser])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'text-red-600 bg-red-100'
      case 'High': return 'text-orange-600 bg-orange-100'
      case 'Medium': return 'text-yellow-600 bg-yellow-100'
      case 'Low': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
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

  // Show loading state for both hydration and data loading to prevent flickering
  if (!isHydrated || !currentUser || !initialized) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto p-6">
          <div className="skeleton-pulse space-y-6">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div>
                  <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-64"></div>
                </div>
              </div>
              <div className="flex space-x-3">
                <div className="h-10 bg-gray-200 rounded w-24"></div>
                <div className="h-10 bg-gray-200 rounded w-32"></div>
              </div>
            </div>

            {/* Statistics Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                  <div className="h-4 bg-gray-200 rounded w-20 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
              ))}
            </div>

            {/* Filters Skeleton */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="h-5 bg-gray-200 rounded w-16 mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-12 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
            </div>

            {/* Bug List Skeleton */}
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="h-6 bg-gray-200 rounded w-32"></div>
                        <div className="h-6 bg-gray-200 rounded w-20"></div>
                        <div className="h-6 bg-gray-200 rounded w-24"></div>
                      </div>
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
                      <div className="flex space-x-4">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                        <div className="h-4 bg-gray-200 rounded w-28"></div>
                      </div>
                    </div>
                    <div className="h-10 bg-gray-200 rounded w-32"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="layout-stable bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto p-6 space-y-6 content-fade-in page-transition">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-4">
            {/* This was requested by Chandralekha because she wants to solve bugs with flying colours */}
            <div className="p-3 bg-purple-100 rounded-lg">
              <Sparkles className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Development</h1>
              <p className="text-gray-600 mt-1">Track, manage, and resolve development issues</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 mt-6 sm:mt-0">
            {/* View mode toggle */}
            <div
              role="group"
              aria-label="View mode"
              className="inline-flex rounded-lg border border-gray-300 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                aria-pressed={viewMode === 'cards'}
                className={`px-3 py-2 text-sm flex items-center gap-1.5 transition ${
                  viewMode === 'cards'
                    ? 'bg-primary text-black'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title="Card view"
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-pressed={viewMode === 'grid'}
                className={`px-3 py-2 text-sm flex items-center gap-1.5 border-l border-gray-300 transition ${
                  viewMode === 'grid'
                    ? 'bg-primary text-black'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title="Grid view (editable)"
              >
                <TableIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Grid</span>
              </button>
            </div>
            <button
              onClick={() => router.push('/bugs/analytics')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 transition-colors flex items-center space-x-2"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </button>
            <button
              onClick={() => router.push('/bugs/create')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center space-x-2 font-medium"
            >
              <Plus className="h-4 w-4" />
              <span>Feature / Bug</span>
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {/* Bugs Card - Clickable */}
            <div
              className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setTypeFilter(['bug'])}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Bugs</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{statistics.byType.bug}</p>
                  <p className="text-xs text-gray-500 mt-1">Bug reports</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-lg">
                  <BugIcon className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </div>

            {/* Features Card - Clickable */}
            <div
              className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setTypeFilter(['feature'])}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Features</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{statistics.byType.feature}</p>
                  <p className="text-xs text-gray-500 mt-1">Feature requests</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Sparkles className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Open Issues</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">
                    {(statistics.byStatus['New'] || 0) + (statistics.byStatus['In Progress'] || 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Needs attention</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Blocker</p>
                  <p className="text-3xl font-bold text-purple-600 mt-2">{statistics.bySeverity['Blocker'] || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Blocking issues</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Critical</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">{statistics.bySeverity['Critical'] || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">High priority</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Major</p>
                  <p className="text-3xl font-bold text-orange-600 mt-2">{statistics.bySeverity['Major'] || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Important issues</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          </div>

          {/* Unified Filter Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-9 gap-4 items-end">
            {/* Project Filter */}
            <div className="w-full">
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="w-full px-4 h-[42px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
              >
                <option value="all">All Projects</option>
                {projects.map(project => (
                  <option key={project.projectId} value={project.projectId}>
                    📁 {project.projectName}
                  </option>
                ))}
              </select>
            </div>

            {/* Subproject Filter */}
            <div className="w-full">
              <select
                value={subprojectFilter}
                onChange={(e) => setSubprojectFilter(e.target.value)}
                disabled={projectFilter === 'all' || subprojects.length === 0}
                className="w-full px-4 h-[42px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="all">All Subprojects</option>
                {subprojects.map(subproject => (
                  <option key={subproject.projectId} value={subproject.projectId}>
                    📂 {subproject.projectName}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignee Filter */}
            <div className="w-full relative z-50">
              <MultiSelect
                label=""
                placeholder="Assignee"
                options={[
                  { value: 'me', label: 'My Bugs' },
                  ...users.map(user => ({ value: user.employeeId, label: user.name }))
                ]}
                selectedValues={assigneeFilter}
                onChange={setAssigneeFilter}
                className="[&_button]:h-[42px]"
              />
            </div>

            {/* Search */}
            <div className="w-full relative">
              <div className="relative h-[42px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search bugs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 h-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div className="w-full relative z-40">
              <MultiSelect
                label=""
                placeholder="Type"
                options={[
                  { value: 'bug', label: '🐛 Bug' },
                  { value: 'feature', label: '✨ Feature' },
                  { value: 'testcase', label: '🧪 Testcase' },
                  { value: 'other', label: '📝 Other' }
                ]}
                selectedValues={typeFilter}
                onChange={setTypeFilter}
                className="[&_button]:h-[42px]"
              />
            </div>

            {/* Status Filter */}
            <div className="w-full relative z-30">
              <MultiSelect
                label=""
                placeholder="Status"
                options={settingsData.bugStatuses.map((status) => ({ value: status.value, label: status.value }))}
                selectedValues={statusFilter}
                onChange={setStatusFilter}
                className="[&_button]:h-[42px]"
              />
            </div>

            {/* Severity Filter */}
            <div className="w-full relative z-20">
              <MultiSelect
                label=""
                placeholder="Severity"
                options={settingsData.severities.map((s) => ({ value: s.value, label: s.value }))}
                selectedValues={severityFilter}
                onChange={setSeverityFilter}
                className="[&_button]:h-[42px]"
              />
            </div>

            {/* Category Filter */}
            <div className="w-full relative z-10">
              <MultiSelect
                label=""
                placeholder="Category"
                options={settingsData.categories.map((c) => ({ value: c.value, label: c.value }))}
                selectedValues={categoryFilter}
                onChange={setCategoryFilter}
                className="[&_button]:h-[42px]"
              />
            </div>

            {/* Clear Filters */}
            <div className="w-full">
              <button
                onClick={() => {
                  setSearchTerm('')
                  setTypeFilter([])
                  setStatusFilter([])
                  setSeverityFilter([])
                  setCategoryFilter([])
                  setAssigneeFilter([])
                  setProjectFilter('all')
                  setSubprojectFilter('all')
                }}
                className="w-full px-4 h-[42px] border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 transition-colors font-medium flex items-center justify-center whitespace-nowrap"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
            Showing <span className="font-semibold text-gray-900">{filteredBugs.length}</span> of <span className="font-semibold text-gray-900">{bugs.length}</span> bugs
          </div>
        </div>

        {/* Error State */}
        {error ? (
          <div className="bg-white rounded-xl p-12 border border-red-200 shadow-sm text-center">
            <div className="p-4 bg-red-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <AlertTriangle className="h-10 w-10 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-red-900 mb-3">
              {!isOnline ? 'No Internet Connection' : 'Unable to Load Bugs'}
            </h3>
            <p className="text-red-600 mb-6 max-w-md mx-auto">
              {!isOnline
                ? 'Please check your internet connection and try again.'
                : error
              }
            </p>
            <button
              onClick={() => loadBugs(true)}
              disabled={isLoading}
              className="btn-primary flex items-center space-x-2 mx-auto"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Retrying...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span>Try Again</span>
                </>
              )}
            </button>
          </div>
        ) : filteredBugs.length === 0 ? (
          <div className="bg-white rounded-xl p-12 border border-gray-200 shadow-sm text-center">
            <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <BugIcon className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">No bugs found</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {bugs.length === 0
                ? 'No bugs have been reported yet. Be the first to help improve our application by reporting an issue.'
                : 'No bugs match your current filters. Try adjusting your search criteria or clearing the filters.'
              }
            </p>
            <div className="flex items-center justify-center space-x-3">
              {bugs.length > 0 && (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter([])
                    setSeverityFilter([])
                    setCategoryFilter([])
                    setTypeFilter([])
                    setAssigneeFilter([])
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 transition-colors"
                >
                  Clear Filters
                </button>
              )}
              <button
                onClick={() => router.push('/bugs/create')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium"
              >
                {bugs.length === 0 ? 'Report First Bug' : 'Report New Bug'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <BugGridView
                bugs={filteredBugs}
                users={users}
                projects={projects}
                settingsData={settingsData}
                onBugsChange={setBugs}
              />
            ) : (
              <div className="space-y-4">
                {filteredBugs.map((bug) => (
                  <HierarchicalBugRow
                    key={bug.bugId}
                    bug={bug}
                    getStatusColor={getStatusColor}
                    getPriorityColor={getPriorityColor}
                    getSeverityColor={getSeverityColor}
                    getStatusIcon={getStatusIcon}
                    UserName={UserName}
                    ProjectDisplay={ProjectDisplay}
                  />
                ))}
              </div>
            )}

            {/* Infinite scroll trigger element */}
            {hasMore && (
              <div ref={loadMoreTriggerRef} className="py-8 text-center">
                {isLoadingMore && (
                  <div className="flex items-center justify-center space-x-2 text-gray-600">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span>Loading more bugs...</span>
                  </div>
                )}
              </div>
            )}

            {/* End of list indicator */}
            {!hasMore && bugs.length > 0 && (
              <div className="py-8 text-center text-gray-500 text-sm">
                <p>You've reached the end of the list</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
