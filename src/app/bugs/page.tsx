/**
 * Bug Listing Page - Role-based bug visibility and filtering
 * Updated: 2025-10-23 - Fixed statistics and visibility issues
 */
'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { Bug } from '@/lib/types'
import { getAllBugs, getBugStatistics } from '@/lib/bugService'
import { getCurrentUser, getUserNameByEmployeeId, getAllUsers } from '@/lib/auth'
import { useLoading } from '@/contexts/LoadingContext'
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
  RefreshCw
} from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

// Component to handle async user name fetching
function UserName({ employeeId }: { employeeId: string }) {
  const [name, setName] = useState<string>(employeeId)

  useEffect(() => {
    getUserNameByEmployeeId(employeeId).then(setName)
  }, [employeeId])

  return <span>{name}</span>
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
  const [statistics, setStatistics] = useState<any>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [retryCount, setRetryCount] = useState(0)
  const [isOnline, setIsOnline] = useState(true)
  const hasLoadedData = useRef(false)

  const router = useRouter()
  const currentUser = getCurrentUser()
  const { showGlobalLoading, hideGlobalLoading } = useLoading()

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true)

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

  const loadBugs = useCallback(async (isRetry = false) => {
    try {
      setIsLoading(true)
      setError(null)

      let bugsData = await getAllBugs()

      // Filter bugs based on user role and involvement
      if (currentUser) {
        if (currentUser.role === 'employee') {
          // Employees can only see bugs they created or are assigned to
          bugsData = bugsData.filter(bug =>
            bug.reportedBy === currentUser.employeeId ||
            bug.assignedTo === currentUser.employeeId
          )
        } else if (currentUser.role === 'management') {
          // Management can see bugs they're involved in + bugs from their team
          // For now, applying same restriction as employees (can be expanded)
          bugsData = bugsData.filter(bug =>
            bug.reportedBy === currentUser.employeeId ||
            bug.assignedTo === currentUser.employeeId
          )
        }
        // top_management and admin can see all bugs (no filtering)
      }

      // TEMPORARY FIX: Swap bugId and title fields due to data mapping issue
      const fixedBugsData = bugsData.map(bug => ({
        ...bug,
        bugId: bug.title, // The actual bug ID is in the title field
        title: bug.bugId  // The actual title is in the bugId field
      }))

      setBugs(fixedBugsData)

      // Calculate statistics from filtered bugs (user's visible bugs)
      const stats = calculateStatistics(fixedBugsData)
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
      byPlatform: {} as Record<string, number>
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

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(bug =>
        bug.title.toLowerCase().includes(searchLower) ||
        bug.description.toLowerCase().includes(searchLower) ||
        bug.bugId.toLowerCase().includes(searchLower)
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

    return filtered
  }, [bugs, searchTerm, statusFilter, severityFilter, categoryFilter, assigneeFilter, currentUser])

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
            <div className="p-3 bg-red-100 rounded-lg">
              <BugIcon className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Bug Tracking</h1>
              <p className="text-gray-600 mt-1">Track, manage, and resolve bug reports</p>
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
              <span>Report Bug</span>
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Bugs</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{statistics.total}</p>
                  <p className="text-xs text-gray-500 mt-1">All reported issues</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-lg">
                  <BugIcon className="h-6 w-6 text-gray-600" />
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
                  <p className="text-sm font-medium text-gray-600">Resolved</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{statistics.byStatus['Resolved'] || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Fixed issues</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
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
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
            >
              <option value="all">All Status</option>
              <option value="New">🆕 New</option>
              <option value="In Progress">⏳ In Progress</option>
              <option value="Resolved">✅ Resolved</option>
              <option value="Closed">🔒 Closed</option>
              <option value="Reopened">🔄 Reopened</option>
            </select>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
            >
              <option value="all">All Severity</option>
              <option value="Critical">🔴 Critical</option>
              <option value="Major">🟠 Major</option>
              <option value="Minor">🟡 Minor</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
            >
              <option value="all">All Categories</option>
              <option value="UI">🎨 UI</option>
              <option value="API">🔌 API</option>
              <option value="Backend">⚙️ Backend</option>
              <option value="Performance">⚡ Performance</option>
              <option value="Security">🔒 Security</option>
              <option value="Database">🗄️ Database</option>
              <option value="Integration">🔗 Integration</option>
              <option value="Other">📋 Other</option>
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
              <div key={bug.bugId} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:border-gray-300">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="font-mono text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-lg font-medium">
                        {bug.bugId}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSeverityColor(bug.severity)}`}>
                        {bug.severity === 'Critical' ? '🔴' : bug.severity === 'Major' ? '🟠' : '🟡'} {bug.severity}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1 ${getStatusColor(bug.status)}`}>
                        {getStatusIcon(bug.status)}
                        <span>{bug.status}</span>
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {bug.platform === 'Web' ? '🌐' : bug.platform === 'iOS' ? '📱' : bug.platform === 'Android' ? '🤖' : '🔄'} {bug.platform}
                      </span>
                    </div>

                    <h3 className="text-xl font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors cursor-pointer"
                        onClick={() => router.push(`/bugs/${bug.bugId}`)}>
                      {bug.title}
                    </h3>
                    <p className="text-gray-600 mb-4 line-clamp-2 leading-relaxed">{bug.description}</p>

                    <div className="flex items-center flex-wrap gap-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <span className="font-medium">Category:</span>
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                          {bug.category === 'UI' ? '🎨' : bug.category === 'API' ? '🔌' : bug.category === 'Backend' ? '⚙️' : '📋'} {bug.category}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="font-medium">Priority:</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          bug.priority === 'High' ? 'bg-red-50 text-red-700' :
                          bug.priority === 'Medium' ? 'bg-yellow-50 text-yellow-700' :
                          'bg-green-50 text-green-700'
                        }`}>
                          {bug.priority === 'High' ? '⬆️' : bug.priority === 'Medium' ? '➡️' : '⬇️'} {bug.priority}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="font-medium">Reported:</span>
                        <span>{new Date(bug.createdAt).toLocaleDateString()}</span>
                      </div>
                      {bug.assignedTo && (
                        <div className="flex items-center space-x-1">
                          <span className="font-medium">Assigned to:</span>
                          <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs">👤 <UserName employeeId={bug.assignedTo} /></span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-6">
                    <button
                      onClick={() => router.push(`/bugs/${bug.bugId}`)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center space-x-2 font-medium"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View Details</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
