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
import { useLoading } from '@/contexts/LoadingContext'
import { QUERIES } from '@/lib/graphql-queries'
import HierarchicalBugRow from '@/components/bugs/HierarchicalBugRow'
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
  Sparkles
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
  const [statusFilter, setStatusFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all') // New: Bug type filter
  const [statistics, setStatistics] = useState<any>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [retryCount, setRetryCount] = useState(0)
  const [isOnline, setIsOnline] = useState(true)
  const hasLoadedData = useRef(false)

  // Settings data from database
  const [settingsData, setSettingsData] = useState<{
    bugStatuses: Array<{ value: string; icon: string }>;
    severities: Array<{ value: string; icon: string }>;
    categories: Array<{ value: string; icon: string }>;
  }>({
    bugStatuses: [],
    severities: [],
    categories: []
  })

  const router = useRouter()
  const currentUser = getCurrentUser()
  const { showGlobalLoading, hideGlobalLoading } = useLoading()

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true)

    // Set default assignee filter to current user
    if (currentUser?.employeeId) {
      setAssigneeFilter(currentUser.employeeId)
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
          const severitiesSetting = settings.find((s: any) => s.key === 'severities')
          let severities: Array<{ value: string; icon: string }> = []
          if (severitiesSetting) {
            try {
              const values = JSON.parse(severitiesSetting.value)
              severities = values.map((val: string) => ({
                value: val,
                icon: '' // Icons are not stored in settings yet
              }))
            } catch (e) {
              console.error('Failed to parse severities:', e)
            }
          }

          // Process categories
          const categoriesSetting = settings.find((s: any) => s.key === 'categories')
          let categories: Array<{ value: string; icon: string }> = []
          if (categoriesSetting) {
            try {
              const values = JSON.parse(categoriesSetting.value)
              categories = values.map((val: string) => ({
                value: val,
                icon: '' // Icons are not stored in settings yet
              }))
            } catch (e) {
              console.error('Failed to parse categories:', e)
            }
          }

          setSettingsData({
            bugStatuses,
            severities,
            categories
          })
          console.log('✅ [Bugs] Settings loaded successfully via GraphQL')
        }
      } catch (error) {
        console.error('❌ [Bugs] Failed to load settings via GraphQL:', error)
      }
    }

    loadSettings()
  }, [])

  const loadBugs = useCallback(async (isRetry = false) => {
    try {
      setIsLoading(true)
      setError(null)

      let bugsData: Bug[] = []

      // Try GraphQL first
      try {
        console.log('🔵 [Bugs] Attempting GraphQL query...')
        const data = await executeGraphQLQuery(QUERIES.GET_BUGS, {})
        bugsData = data.bugs || []
        console.log('✅ [Bugs] GraphQL query successful:', bugsData.length, 'bugs')
      } catch (graphqlError) {
        console.warn('⚠️ [Bugs] GraphQL failed, falling back to REST:', graphqlError)

        // Fallback to REST API
        bugsData = await getAllBugs()
        console.log('✅ [Bugs] REST API successful:', bugsData.length, 'bugs')
      }

      // Filter bugs based on user role and involvement
      if (currentUser) {
        if (currentUser.role === 'amtariksian') {
          // Amtariksians can only see bugs they created or are assigned to
          bugsData = bugsData.filter(bug =>
            bug.reportedBy === currentUser.employeeId ||
            bug.assignedTo === currentUser.employeeId
          )
        } else if (currentUser.role === 'management') {
          // Management can see bugs they're involved in + bugs from their team
          // For now, applying same restriction as amtariksians (can be expanded)
          bugsData = bugsData.filter(bug =>
            bug.reportedBy === currentUser.employeeId ||
            bug.assignedTo === currentUser.employeeId
          )
        }
        // top_management and admin can see all bugs (no filtering)
      }

      // Set bugs data directly without any field swapping
      setBugs(bugsData)

      // Calculate statistics from filtered bugs (user's visible bugs)
      const stats = calculateStatistics(bugsData)
      setStatistics(stats)

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
    }
  }, [])

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
          loadUsers()
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
  const filteredBugs = useMemo(() => {
    let filtered = bugs

    // Filter out subtasks - only show root bugs (bugs without parent_dev_id)
    filtered = filtered.filter(bug => !bug.parentDevId)

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(bug =>
        (bug.title && bug.title.toLowerCase().includes(searchLower)) ||
        (bug.description && bug.description.toLowerCase().includes(searchLower)) ||
        (bug.bugId && bug.bugId.toLowerCase().includes(searchLower))
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(bug => bug.status === statusFilter)
    }

    // Severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(bug => bug.severity === severityFilter)
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(bug => bug.category === categoryFilter)
    }

    // Type filter (Bug, Feature, Testcase, Other)
    if (typeFilter !== 'all') {
      if (typeFilter === 'bug') {
        // Show bugs that are NOT features (null, 'testcase', 'other')
        filtered = filtered.filter(bug => bug.type !== 'feature')
      } else if (typeFilter === 'feature') {
        // Show only features
        filtered = filtered.filter(bug => bug.type === 'feature')
      } else if (typeFilter === 'testcase') {
        // Show only testcases
        filtered = filtered.filter(bug => bug.type === 'testcase')
      } else if (typeFilter === 'other') {
        // Show only 'other' type or null
        filtered = filtered.filter(bug => bug.type === 'other' || bug.type === null)
      }
    }

    // Assignee filter
    if (assigneeFilter !== 'all') {
      if (assigneeFilter === 'me') {
        // Filter for current user's bugs
        filtered = filtered.filter(bug => bug.assignedTo === currentUser?.employeeId)
      } else {
        // Filter for specific assignee
        filtered = filtered.filter(bug => bug.assignedTo === assigneeFilter)
      }
    }

    // Sort bugs: Closed bugs should appear last
    filtered = filtered.sort((a, b) => {
      // If both are closed or both are not closed, maintain original order
      if ((a.status === 'Closed' && b.status === 'Closed') ||
          (a.status !== 'Closed' && b.status !== 'Closed')) {
        return 0
      }
      // If a is closed and b is not, a should come after b
      if (a.status === 'Closed') return 1
      // If b is closed and a is not, b should come after a
      return -1
    })

    return filtered
  }, [bugs, searchTerm, statusFilter, severityFilter, categoryFilter, typeFilter, assigneeFilter, currentUser])

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
              onClick={() => setTypeFilter('bug')}
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
              onClick={() => setTypeFilter('feature')}
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search bugs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
            >
              <option value="all">All Types</option>
              <option value="bug">🐛 Bug</option>
              <option value="feature">✨ Feature</option>
              <option value="testcase">🧪 Testcase</option>
              <option value="other">📝 Other</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
            >
              <option value="all">All Status</option>
              {settingsData.bugStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.icon} {status.value}
                </option>
              ))}
            </select>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
            >
              <option value="all">All Severity</option>
              {settingsData.severities.map((severity) => (
                <option key={severity.value} value={severity.value}>
                  {severity.icon} {severity.value}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
            >
              <option value="all">All Categories</option>
              {settingsData.categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.icon} {category.value}
                </option>
              ))}
            </select>

            {/* Assignee Filter */}
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
            >
              <option value="all">All Assignees</option>
              <option value="me">👤 My Bugs</option>
              {users.map(user => (
                <option key={user.employeeId} value={user.employeeId}>
                  👤 {user.name}
                </option>
              ))}
            </select>

            {/* Clear Filters */}
            <button
              onClick={() => {
                setSearchTerm('')
                setTypeFilter('all')
                setStatusFilter('all')
                setSeverityFilter('all')
                setCategoryFilter('all')
                setAssigneeFilter('all')
              }}
              className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 transition-colors font-medium"
            >
              Clear Filters
            </button>
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
                    setStatusFilter('all')
                    setSeverityFilter('all')
                    setCategoryFilter('all')
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
      </div>
    </div>
  )
}
