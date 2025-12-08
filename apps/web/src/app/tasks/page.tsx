/**
 * Task Listing Page - Role-based task visibility and filtering
 * Created: 2025-11-01 - Based on bugs/page.tsx structure
 * Updated: GraphQL migration with REST fallback
 */
'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { Task } from '@/lib/types'
import { getCurrentUser, getUserNameByEmployeeId, getAllUsers } from '@/lib/auth'
import { useLoading } from '@/contexts/LoadingContext'
import { QUERIES } from '@/lib/graphql-queries'
import AssigneeList from '@/components/tasks/AssigneeList'
import HierarchicalTaskRow from '@/components/tasks/HierarchicalTaskRow'
import MultiSelect from '@/components/ui/MultiSelect'
import {
  CheckSquare,
  Plus,
  Filter,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  BarChart3,
  RefreshCw,
  Target
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

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [priorityFilter, setPriorityFilter] = useState<string[]>([])
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([])
  const [projectFilter, setProjectFilter] = useState('all') // NEW: Project filter
  const [subprojectFilter, setSubprojectFilter] = useState('all') // NEW: Subproject filter

  // Type for task statistics
  type TaskStatistics = {
    total: number
    byStatus: Record<string, number>
    byPriority: Record<string, number>
  } | null

  const [statistics, setStatistics] = useState<TaskStatistics>(null)
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
    taskStatuses: Array<{ value: string; icon: string }>;
    taskPriorities: Array<{ value: string; icon: string }>;
  }>({
    taskStatuses: [],
    taskPriorities: []
  })

  const router = useRouter()
  const currentUser = getCurrentUser()
  const { showGlobalLoading, hideGlobalLoading } = useLoading()

  // Handle hydration and load persisted filters
  useEffect(() => {
    setIsHydrated(true)

    // Load persisted filters from localStorage
    try {
      const savedFilters = localStorage.getItem('taskFilters')
      if (savedFilters) {
        const filters = JSON.parse(savedFilters)
        setSearchTerm(filters.searchTerm || '')
        // Convert old string filters to arrays if necessary
        setStatusFilter(Array.isArray(filters.statusFilter) ? filters.statusFilter : [])
        setPriorityFilter(Array.isArray(filters.priorityFilter) ? filters.priorityFilter : [])
        setAssigneeFilter(Array.isArray(filters.assigneeFilter) ? filters.assigneeFilter : (filters.assigneeFilter === 'me' ? ['me'] : []))
        setProjectFilter(filters.projectFilter || 'all')
        setSubprojectFilter(filters.subprojectFilter || 'all')
      } else {
        // Set default assignee filter to current user if no saved filters
        if (currentUser?.employeeId) {
          setAssigneeFilter([currentUser.employeeId])
        }
      }
    } catch (error) {
      console.error('Failed to load saved filters:', error)
      // Set default assignee filter on error
      if (currentUser?.employeeId) {
        setAssigneeFilter([currentUser.employeeId])
      }
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
        console.log('🔵 [Tasks] Loading settings via GraphQL...')
        const data = await executeGraphQLQuery(QUERIES.GET_SETTINGS, { activeOnly: true })

        if (data && data.settings) {
          const settings = data.settings

          // Process task statuses
          const taskStatusesSetting = settings.find((s: any) => s.key === 'task_statuses')
          let taskStatuses: Array<{ value: string; icon: string }> = []
          if (taskStatusesSetting) {
            try {
              const values = JSON.parse(taskStatusesSetting.value)
              taskStatuses = values.map((val: string) => ({
                value: val,
                icon: '' // Icons are not stored in settings yet
              }))
            } catch (e) {
              console.error('Failed to parse task_statuses:', e)
            }
          }

          // Process task priorities
          const taskPrioritiesSetting = settings.find((s: any) => s.key === 'task_priorities')
          let taskPriorities: Array<{ value: string; icon: string }> = []
          if (taskPrioritiesSetting) {
            try {
              const values = JSON.parse(taskPrioritiesSetting.value)
              taskPriorities = values.map((val: string) => ({
                value: val,
                icon: '' // Icons are not stored in settings yet
              }))
            } catch (e) {
              console.error('Failed to parse task_priorities:', e)
            }
          }

          setSettingsData({
            taskStatuses,
            taskPriorities
          })
          console.log('✅ [Tasks] Settings loaded successfully via GraphQL')
        }
      } catch (error) {
        console.error('❌ [Tasks] Failed to load settings via GraphQL:', error)
      }
    }

    loadSettings()
  }, [])

  const loadTasks = useCallback(async (isRetry = false, loadMore = false) => {
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
      let tasksData: Task[] = []

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
      if (statusFilter.length > 0) {
        variables.status = statusFilter
      }
      if (priorityFilter.length > 0) {
        variables.priority = priorityFilter
      }
      if (projectFilter && projectFilter !== 'all') {
        variables.projectId = projectFilter
      }
      if (subprojectFilter && subprojectFilter !== 'all') {
        variables.subprojectId = subprojectFilter
      }

      // Try GraphQL first with pagination and filters
      try {
        console.log('🔵 [Tasks] Attempting GraphQL query with pagination and filters...', variables)
        const data = await executeGraphQLQuery(QUERIES.GET_TASKS, variables)
        tasksData = data.tasks || []
        console.log('✅ [Tasks] GraphQL query successful:', tasksData.length, 'tasks')
      } catch (graphqlError) {
        console.warn('⚠️ [Tasks] GraphQL failed, falling back to REST:', graphqlError)

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
        if (priorityFilter.length > 0) params.append('priority', priorityFilter.join(','))

        const response = await fetch(`/api/tasks?${params.toString()}`)
        if (!response.ok) {
          throw new Error('Failed to fetch tasks')
        }

        const result = await response.json()
        tasksData = result.data || []
        console.log('✅ [Tasks] REST API successful:', tasksData.length, 'tasks')
      }

      // Check if there are more items to load
      if (tasksData.length < ITEMS_PER_PAGE) {
        setHasMore(false)
      }

      // Note: Role-based filtering is NOT applied here anymore
      // All users can see all tasks in the system
      // The assignee filter dropdown allows users to filter by specific assignees
      // This ensures consistent task visibility across all users

      if (loadMore) {
        // Append new tasks to existing ones with deduplication
        setTasks(prev => {
          const combined = [...prev, ...tasksData]
          // Deduplicate by taskId using a Map
          const uniqueTasks = Array.from(new Map(combined.map(task => [task.taskId, task])).values())
          return uniqueTasks
        })
        setOffset(prev => prev + ITEMS_PER_PAGE)
      } else {
        // Replace tasks (initial load or filter change)
        setTasks(tasksData)
        setOffset(ITEMS_PER_PAGE)
      }

      // Calculate statistics from all loaded tasks
      setStatistics(prev => {
        const allTasks = loadMore ? [...tasks, ...tasksData] : tasksData
        return calculateStatistics(allTasks)
      })

      setError(null)
      setRetryCount(0)
    } catch (error) {
      console.error('Failed to load tasks:', error)

      let errorMessage = 'Failed to load tasks. '
      if (error instanceof Error) {
        errorMessage += error.message
      } else {
        errorMessage += 'This might be due to network issues. Please try again.'
      }

      setError(errorMessage)
      setTasks([])

      if (isRetry) {
        setRetryCount(prev => prev + 1)
      }
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [currentUser, offset, assigneeFilter, statusFilter, priorityFilter, projectFilter, subprojectFilter, tasks, ITEMS_PER_PAGE])

  // Save filters to localStorage whenever they change
  useEffect(() => {
    if (!isHydrated) return // Don't save during initial hydration

    try {
      const filters = {
        searchTerm,
        statusFilter,
        priorityFilter,
        assigneeFilter,
        projectFilter,
        subprojectFilter
      }
      localStorage.setItem('taskFilters', JSON.stringify(filters))
    } catch (error) {
      console.error('Failed to save filters:', error)
    }
  }, [searchTerm, statusFilter, priorityFilter, assigneeFilter, projectFilter, subprojectFilter, isHydrated])

  // Reload tasks when filters change (reset pagination)
  useEffect(() => {
    if (!initialized) return // Don't reload during initial mount

    console.log('🔵 [Tasks] Filters changed, reloading tasks from beginning...')
    loadTasks(false, false) // Reset to first page
  }, [statusFilter, priorityFilter, assigneeFilter, projectFilter, subprojectFilter, initialized])

  // Intersection Observer for infinite scroll (trigger at 80% scroll)
  useEffect(() => {
    if (!loadMoreTriggerRef.current || !hasMore || isLoadingMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && hasMore && !isLoadingMore) {
          console.log('🔵 [Tasks] Load more trigger reached, loading next batch...')
          loadTasks(false, true) // loadMore = true
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
  }, [hasMore, isLoadingMore, loadTasks])

  // Calculate statistics from filtered tasks
  const calculateStatistics = useCallback((tasksData: Task[]) => {
    const stats = {
      total: tasksData.length,
      byStatus: {} as Record<string, number>,
      byPriority: {} as Record<string, number>
    }

    tasksData.forEach(task => {
      // Count by status
      stats.byStatus[task.status] = (stats.byStatus[task.status] || 0) + 1

      // Count by priority
      stats.byPriority[task.priority] = (stats.byPriority[task.priority] || 0) + 1
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

    if (hasLoadedData.current) return

    const loadInitialData = async () => {
      try {
        hasLoadedData.current = true
        await Promise.all([
          loadTasks(),
          loadUsers(),
          loadProjects() // NEW: Load projects
        ])
      } catch (error) {
        console.error('Failed to load initial data:', error)
        hasLoadedData.current = false
      } finally {
        setInitialized(true)
      }
    }

    loadInitialData()
  }, [currentUser, router, isHydrated])

  // Memoized filtered tasks
  // Note: Status, priority, and assignee filters are now handled server-side for pagination
  // Only client-side search filter and subtask filtering remain
  const filteredTasks = useMemo(() => {
    let filtered = tasks

    // Filter out subtasks - only show root tasks (tasks without parent_task_id)
    filtered = filtered.filter(task => !task.parentTaskId)

    // Search filter (client-side only)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(task =>
        (task.name && task.name.toLowerCase().includes(searchLower)) ||
        (task.description && task.description.toLowerCase().includes(searchLower)) ||
        (task.taskId && task.taskId.toLowerCase().includes(searchLower))
      )
    }

    // Note: Server already returns tasks sorted by updated_at DESC
    // We don't need additional sorting here

    return filtered
  }, [tasks, searchTerm, statusFilter, priorityFilter, assigneeFilter, currentUser])

  const getPriorityColor = (priority: string) => {
    // Add null/undefined check to prevent TypeError
    if (!priority) return 'text-gray-600 bg-gray-100'
    if (priority.includes('U&I') && !priority.includes('N')) return 'text-red-600 bg-red-100' // U&I only
    if (priority.includes('NU&I')) return 'text-orange-600 bg-orange-100'
    if (priority.includes('NI&U')) return 'text-blue-600 bg-blue-100'
    return 'text-gray-600 bg-gray-100'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'text-blue-600 bg-blue-100'
      case 'In Progress': return 'text-yellow-600 bg-yellow-100'
      case 'Completed': return 'text-green-600 bg-green-100'
      case 'Done': return 'text-green-600 bg-green-100'
      case 'Delayed': return 'text-red-600 bg-red-100'
      case 'On Hold': return 'text-gray-600 bg-gray-100'
      case 'Cancelled': return 'text-gray-600 bg-gray-100'
      case 'ReOpened': return 'text-purple-600 bg-purple-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Open': return <Clock className="h-4 w-4" />
      case 'In Progress': return <Clock className="h-4 w-4" />
      case 'Completed': return <CheckCircle className="h-4 w-4" />
      case 'Done': return <CheckCircle className="h-4 w-4" />
      case 'Delayed': return <AlertTriangle className="h-4 w-4" />
      case 'On Hold': return <Clock className="h-4 w-4" />
      case 'ReOpened': return <AlertTriangle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  // Format hours to hh:mm:ss
  const formatHours = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.floor((hours - h) * 60)
    const s = Math.floor(((hours - h) * 60 - m) * 60)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Show loading state
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

            {/* Task List Skeleton */}
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
            <div className="p-3 bg-blue-100 rounded-lg">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Task Management</h1>
              <p className="text-gray-600 mt-1">Plan weekly, Execute daily</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 mt-6 sm:mt-0">
            <button
              onClick={() => router.push('/tasks/analytics')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 transition-colors flex items-center space-x-2"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </button>
            <button
              onClick={() => router.push('/tasks/create')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center space-x-2 font-medium"
            >
              <Plus className="h-4 w-4" />
              <span>Create Task</span>
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{statistics.total}</p>
                  <p className="text-xs text-gray-500 mt-1">All tasks</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-lg">
                  <CheckSquare className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Open Tasks</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">
                    {(statistics.byStatus['Open'] || 0) + (statistics.byStatus['In Progress'] || 0)}
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
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {(statistics.byStatus['Completed'] || 0) + (statistics.byStatus['Done'] || 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Finished tasks</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Delayed</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">{statistics.byStatus['Delayed'] || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Behind schedule</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">On Hold</p>
                  <p className="text-3xl font-bold text-gray-600 mt-2">{statistics.byStatus['On Hold'] || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Paused tasks</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-lg">
                  <Clock className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cancelled</p>
                  <p className="text-3xl font-bold text-gray-600 mt-2">
                    {(statistics.byStatus['Cancelled'] || 0) + (statistics.byStatus['Cancel'] || 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Cancelled tasks</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-gray-600" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 items-end">
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
            <div className="w-full relative z-30">
              <MultiSelect
                label=""
                placeholder="Assignee"
                options={[
                  { value: 'me', label: 'My Tasks' },
                  ...users.map(user => ({ value: user.employeeId, label: user.name }))
                ]}
                selectedValues={assigneeFilter}
                onChange={setAssigneeFilter}
                className="[&_button]:h-[42px]"
              />
            </div>

            {/* Status Filter */}
            <div className="w-full relative z-20">
              <MultiSelect
                label=""
                placeholder="Status"
                options={settingsData.taskStatuses.map(s => ({ value: s.value, label: s.value }))}
                selectedValues={statusFilter}
                onChange={setStatusFilter}
                className="[&_button]:h-[42px]"
              />
            </div>

            {/* Priority Filter */}
            <div className="w-full relative z-10">
              <MultiSelect
                label=""
                placeholder="Priority"
                options={settingsData.taskPriorities.map(p => ({ value: p.value, label: p.value }))}
                selectedValues={priorityFilter}
                onChange={setPriorityFilter}
                className="[&_button]:h-[42px]"
              />
            </div>

            {/* Search */}
            <div className="w-full relative">
              <div className="relative h-[42px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 h-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Clear Filters */}
            <div className="w-full">
              <button
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter([])
                  setPriorityFilter([])
                  setAssigneeFilter(currentUser?.employeeId ? [currentUser.employeeId] : [])
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
            Showing <span className="font-semibold text-gray-900">{filteredTasks.length}</span> of <span className="font-semibold text-gray-900">{tasks.length}</span> tasks
          </div>
        </div>

        {/* Error State */}
        {error ? (
          <div className="bg-white rounded-xl p-12 border border-red-200 shadow-sm text-center">
            <div className="p-4 bg-red-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <AlertTriangle className="h-10 w-10 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-red-900 mb-3">
              {!isOnline ? 'No Internet Connection' : 'Unable to Load Tasks'}
            </h3>
            <p className="text-red-600 mb-6 max-w-md mx-auto">
              {!isOnline
                ? 'Please check your internet connection and try again.'
                : error
              }
            </p>
            <button
              onClick={() => loadTasks(true)}
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
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white rounded-xl p-12 border border-gray-200 shadow-sm text-center">
            <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <CheckSquare className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">No tasks found</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {tasks.length === 0
                ? 'No tasks have been created yet. Create your first task to get started.'
                : 'No tasks match your current filters. Try adjusting your search criteria or clearing the filters.'
              }
            </p>
            <div className="flex items-center justify-center space-x-3">
              {tasks.length > 0 && (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter([])
                    setPriorityFilter([])
                    setAssigneeFilter([])
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 transition-colors"
                >
                  Clear Filters
                </button>
              )}
              <button
                onClick={() => router.push('/tasks/create')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium"
              >
                {tasks.length === 0 ? 'Create First Task' : 'Create New Task'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {filteredTasks.map((task) => (
                <HierarchicalTaskRow
                  key={task.taskId}
                  task={task}
                  currentUserId={currentUser.employeeId}
                  getStatusColor={getStatusColor}
                  getPriorityColor={getPriorityColor}
                  getStatusIcon={getStatusIcon}
                  ProjectDisplay={ProjectDisplay}
                />
              ))}
            </div>

            {/* Infinite scroll trigger element */}
            {hasMore && (
              <div ref={loadMoreTriggerRef} className="py-8 text-center">
                {isLoadingMore && (
                  <div className="flex items-center justify-center space-x-2 text-gray-600">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span>Loading more tasks...</span>
                  </div>
                )}
              </div>
            )}

            {/* End of list indicator */}
            {!hasMore && tasks.length > 0 && (
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

