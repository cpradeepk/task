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

// Component to handle async project name fetching
function ProjectDisplay({ projectId }: { projectId?: string | null }) {
  const [projectName, setProjectName] = useState<string>('')

  useEffect(() => {
    const loadProjectNames = async () => {
      try {
        if (projectId) {
          const response = await fetch(`/api/projects/${projectId}`)
          const data = await response.json()
          if (data && data.projectName) {
            setProjectName(data.projectName)
          }
        }
      } catch (error) {
        console.error('Failed to load project names:', error)
      }
    }

    loadProjectNames()
  }, [projectId])

  if (!projectName) return null

  return (
    <div className="flex items-center space-x-2 text-sm text-gray-600">
      <span className="text-gray-400">-</span>
      <span>{projectName}</span>
    </div>
  )
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [myTasksOnly, setMyTasksOnly] = useState(true) // Default: checked (show only my tasks)
  const [statistics, setStatistics] = useState<any>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [retryCount, setRetryCount] = useState(0)
  const [isOnline, setIsOnline] = useState(true)
  const hasLoadedData = useRef(false)

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

  // Load settings data from database
  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch('/api/settings')
        const data = await response.json()

        if (data.success && data.data) {
          const settings = data.data

          // Process task statuses
          const taskStatusesSetting = settings.find((s: any) => s.key === 'task_statuses')
          const taskStatuses = taskStatusesSetting?.value?.map((val: string) => ({
            value: val,
            icon: taskStatusesSetting?.metadata?.icons?.[val] || ''
          })) || []

          // Process task priorities
          const taskPrioritiesSetting = settings.find((s: any) => s.key === 'task_priorities')
          const taskPriorities = taskPrioritiesSetting?.value?.map((val: string) => ({
            value: val,
            icon: taskPrioritiesSetting?.metadata?.icons?.[val] || ''
          })) || []

          setSettingsData({
            taskStatuses,
            taskPriorities
          })
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }

    loadSettings()
  }, [])

  const loadTasks = useCallback(async (isRetry = false) => {
    try {
      setIsLoading(true)
      setError(null)

      let tasksData: Task[] = []

      // Try GraphQL first
      try {
        console.log('🔵 [Tasks] Attempting GraphQL query...')
        const data = await executeGraphQLQuery(QUERIES.GET_TASKS, {})
        tasksData = data.tasks || []
        console.log('✅ [Tasks] GraphQL query successful:', tasksData.length, 'tasks')
      } catch (graphqlError) {
        console.warn('⚠️ [Tasks] GraphQL failed, falling back to REST:', graphqlError)

        // Fallback to REST API
        const response = await fetch('/api/tasks')
        if (!response.ok) {
          throw new Error('Failed to fetch tasks')
        }

        const result = await response.json()
        tasksData = result.data || []
        console.log('✅ [Tasks] REST API successful:', tasksData.length, 'tasks')
      }

      // Filter tasks based on user role and involvement
      if (currentUser) {
        if (currentUser.role === 'employee') {
          // Employees can only see tasks they created or are assigned to
          tasksData = tasksData.filter((task: Task) =>
            task.assignedBy === currentUser.employeeId ||
            (Array.isArray(task.assignedTo) ? task.assignedTo.includes(currentUser.employeeId) : task.assignedTo === currentUser.employeeId) ||
            (task.support && task.support.includes(currentUser.employeeId))
          )
        } else if (currentUser.role === 'management') {
          // Management can see tasks they're involved in
          tasksData = tasksData.filter((task: Task) =>
            task.assignedBy === currentUser.employeeId ||
            (Array.isArray(task.assignedTo) ? task.assignedTo.includes(currentUser.employeeId) : task.assignedTo === currentUser.employeeId) ||
            (task.support && task.support.includes(currentUser.employeeId))
          )
        }
        // top_management and admin can see all tasks (no filtering)
      }

      setTasks(tasksData)

      // Calculate statistics from filtered tasks
      const stats = calculateStatistics(tasksData)
      setStatistics(stats)

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
    }
  }, [currentUser])

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
          loadUsers()
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
  const filteredTasks = useMemo(() => {
    let filtered = tasks

    // Filter out subtasks - only show root tasks (tasks without parent_task_id)
    filtered = filtered.filter(task => !task.parentTaskId)

    // My Tasks filter (default: checked)
    // Include tasks where user is assigned OR in support team
    if (myTasksOnly && currentUser) {
      filtered = filtered.filter(task => {
        const isAssignee = Array.isArray(task.assignedTo)
          ? task.assignedTo.includes(currentUser.employeeId)
          : task.assignedTo === currentUser.employeeId
        const isSupport = task.support && task.support.includes(currentUser.employeeId)
        return isAssignee || isSupport
      })
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(task =>
        (task.name && task.name.toLowerCase().includes(searchLower)) ||
        (task.description && task.description.toLowerCase().includes(searchLower)) ||
        (task.taskId && task.taskId.toLowerCase().includes(searchLower))
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter)
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter)
    }

    // Assignee filter
    if (assigneeFilter !== 'all') {
      if (assigneeFilter === 'me') {
        filtered = filtered.filter(task =>
          Array.isArray(task.assignedTo)
            ? task.assignedTo.includes(currentUser?.employeeId || '')
            : task.assignedTo === currentUser?.employeeId
        )
      } else {
        filtered = filtered.filter(task =>
          Array.isArray(task.assignedTo)
            ? task.assignedTo.includes(assigneeFilter)
            : task.assignedTo === assigneeFilter
        )
      }
    }

    // Sort tasks: Completed/Cancelled tasks should appear last
    filtered = filtered.sort((a, b) => {
      const completedStatuses = ['Done', 'Completed', 'Cancel', 'Cancelled']
      const aCompleted = completedStatuses.includes(a.status)
      const bCompleted = completedStatuses.includes(b.status)

      if ((aCompleted && bCompleted) || (!aCompleted && !bCompleted)) {
        return 0
      }
      if (aCompleted) return 1
      return -1
    })

    return filtered
  }, [tasks, searchTerm, statusFilter, priorityFilter, assigneeFilter, myTasksOnly, currentUser])

  const getPriorityColor = (priority: string) => {
    // Add null/undefined check to prevent TypeError
    if (!priority) return 'text-gray-600 bg-gray-100'
    if (priority.includes('IU&I')) return 'text-red-600 bg-red-100'
    if (priority.includes('IU&NI')) return 'text-orange-600 bg-orange-100'
    if (priority.includes('NU&I')) return 'text-blue-600 bg-blue-100'
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
              <p className="text-gray-600 mt-1">Track, manage, and complete your tasks</p>
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

          {/* My Tasks Checkbox */}
          <div className="mb-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={myTasksOnly}
                onChange={(e) => setMyTasksOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-sm font-medium text-gray-700">
                My Tasks Only
              </span>
              <span className="text-xs text-gray-500">
                (Show only tasks assigned to me)
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search tasks..."
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
              {settingsData.taskStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.icon} {status.value}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
            >
              <option value="all">All Priority</option>
              {settingsData.taskPriorities.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.icon} {priority.value}
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
              <option value="me">👤 My Tasks</option>
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
                setPriorityFilter('all')
                setAssigneeFilter('all')
                setMyTasksOnly(true) // Reset to default (checked)
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
                    setStatusFilter('all')
                    setPriorityFilter('all')
                    setAssigneeFilter('all')
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
        )}
      </div>
    </div>
  )
}

