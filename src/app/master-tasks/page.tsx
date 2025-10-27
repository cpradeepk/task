/**
 * Master Tasks Page - Admin and Top Management view of all tasks
 * Shows all tasks across the organization with comprehensive filtering
 */
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { Task, User } from '@/lib/types'
import { getCurrentUser, getAllUsers, getUserNameByEmployeeId } from '@/lib/auth'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import {
  CheckSquare,
  Search,
  Filter,
  Calendar,
  User as UserIcon,
  AlertCircle,
  BarChart3,
  Download,
  RefreshCw,
  Eye,
  Clock,
  Users,
  Crown,
  Heart
} from 'lucide-react'
import { formatDate, getStatusColor, getPriorityColor } from '@/lib/data'

// Helper function to check if task is overdue
function isTaskOverdue(task: Task): boolean {
  const today = new Date()
  const endDate = new Date(task.endDate)
  return today > endDate && !['Done', 'Cancel', 'Stop'].includes(task.status)
}

// Component to handle async user name fetching
function UserName({ employeeId }: { employeeId: string }) {
  const [name, setName] = useState<string>(employeeId)

  useEffect(() => {
    getUserNameByEmployeeId(employeeId).then(setName)
  }, [employeeId])

  return <span>{name}</span>
}

// Component to handle async support team names
function SupportTeam({ supportIds }: { supportIds: string[] }) {
  const [names, setNames] = useState<string[]>(supportIds)

  useEffect(() => {
    Promise.all(supportIds.map(id => getUserNameByEmployeeId(id)))
      .then(setNames)
  }, [supportIds])

  return <span>{names.join(', ')}</span>
}

export default function MasterTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isHydrated, setIsHydrated] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')

  const router = useRouter()

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    if (initialized) return // Prevent multiple executions

    const currentUser = getCurrentUser()

    if (!currentUser) {
      router.push('/')
      return
    }

    // Only Admin and Top Management can access
    if (currentUser.role !== 'admin' && currentUser.role !== 'top_management') {
      router.push('/dashboard')
      return
    }

    loadData()
    setInitialized(true)
  }, [isHydrated, initialized, router])

  const loadData = async () => {
    try {
      setIsLoading(true)

      // Fetch all tasks via API
      const tasksResponse = await fetch('/api/tasks')
      if (!tasksResponse.ok) {
        throw new Error('Failed to fetch tasks')
      }
      const tasksData = await tasksResponse.json()

      // Fetch all users
      const allUsers = await getAllUsers()

      setTasks(tasksData.data || [])
      setUsers(allUsers.filter(u => u.status === 'active'))
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Get unique projects
  const projects = useMemo(() => {
    const projectSet = new Set(tasks.map(t => t.projectId).filter((p): p is string => Boolean(p)))
    return Array.from(projectSet)
  }, [tasks])

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let filtered = tasks

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(task =>
        task.taskId.toLowerCase().includes(searchLower) ||
        task.description.toLowerCase().includes(searchLower) ||
        task.assignedTo.toLowerCase().includes(searchLower)
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
      filtered = filtered.filter(task => task.assignedTo === assigneeFilter)
    }

    // Project filter
    if (projectFilter !== 'all') {
      filtered = filtered.filter(task => task.projectId === projectFilter)
    }

    // Date filter
    if (dateFilter !== 'all') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      filtered = filtered.filter(task => {
        const endDate = new Date(task.endDate)
        endDate.setHours(0, 0, 0, 0)
        
        switch (dateFilter) {
          case 'overdue':
            return endDate < today && task.status !== 'Done'
          case 'today':
            return endDate.getTime() === today.getTime()
          case 'this-week':
            const weekFromNow = new Date(today)
            weekFromNow.setDate(weekFromNow.getDate() + 7)
            return endDate >= today && endDate <= weekFromNow
          case 'this-month':
            return endDate.getMonth() === today.getMonth() && 
                   endDate.getFullYear() === today.getFullYear()
          default:
            return true
        }
      })
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [tasks, searchTerm, statusFilter, priorityFilter, assigneeFilter, projectFilter, dateFilter])

  // Calculate statistics
  const statistics = useMemo(() => {
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'Done').length,
      inProgress: tasks.filter(t => t.status === 'In Progress').length,
      delayed: tasks.filter(t => t.status === 'Delayed').length,
      pending: tasks.filter(t => t.status === 'Yet to Start').length
    }
  }, [tasks])

  const currentUser = getCurrentUser()

  if (!isHydrated || !currentUser) {
    return null
  }

  if (currentUser.role !== 'admin' && currentUser.role !== 'top_management') {
    return (
      <div>
        <Navbar />
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-black mb-4">Access Denied</h1>
            <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="p-2 sm:p-3 bg-blue-100 rounded-lg flex-shrink-0">
              <CheckSquare className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Master Tasks View</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">All tasks across the organization</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={loadData}
              className="btn-secondary flex items-center space-x-2 text-sm sm:text-base"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600">Total Tasks</p>
            <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600">Completed</p>
            <p className="text-2xl font-bold text-green-600">{statistics.completed}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">{statistics.inProgress}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600">Delayed</p>
            <p className="text-2xl font-bold text-red-600">{statistics.delayed}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-gray-600">{statistics.pending}</p>
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner message="Loading tasks..." center />
        ) : (
          <>
            {/* Filters */}
            <div className="bg-white rounded-lg p-6 border border-gray-200 space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Filter className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="md:col-span-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by task ID, description, or assignee..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input-field pl-10"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Statuses</option>
                    <option value="Yet to Start">Yet to Start</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                    <option value="Delayed">Delayed</option>
                  </select>
                </div>

                {/* Priority Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Priorities</option>
                    <option value="U&I">U&I (Urgent & Important)</option>
                    <option value="NU&I">NU&I (Not Urgent & Important)</option>
                    <option value="U&NI">U&NI (Urgent & Not Important)</option>
                    <option value="NU&NI">NU&NI (Not Urgent & Not Important)</option>
                  </select>
                </div>

                {/* Assignee Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assignee</label>
                  <select
                    value={assigneeFilter}
                    onChange={(e) => setAssigneeFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Assignees</option>
                    {users.map(user => (
                      <option key={user.employeeId} value={user.employeeId}>
                        {user.name} ({user.employeeId})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Dates</option>
                    <option value="overdue">Overdue</option>
                    <option value="today">Due Today</option>
                    <option value="this-week">This Week</option>
                    <option value="this-month">This Month</option>
                  </select>
                </div>

                {/* Project Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
                  <select
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Projects</option>
                    {projects.map(projectId => (
                      <option key={projectId} value={projectId}>
                        {projectId}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Clear Filters */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('all')
                    setPriorityFilter('all')
                    setAssigneeFilter('all')
                    setProjectFilter('all')
                    setDateFilter('all')
                  }}
                  className="btn-secondary"
                >
                  Clear All Filters
                </button>
              </div>
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 bg-white px-4 py-2 rounded-lg border border-gray-200">
                Showing <span className="font-semibold text-gray-900">{filteredTasks.length}</span> of <span className="font-semibold text-gray-900">{tasks.length}</span> tasks
              </div>
            </div>

            {/* Tasks List - Card Based Layout */}
            {filteredTasks.length === 0 ? (
              <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
                <p className="text-gray-600">
                  {tasks.length === 0 ? 'No tasks in the system yet.' : 'Try adjusting your filters.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTasks.map((task) => {
                  const assignee = users.find(u => u.employeeId === task.assignedTo)
                  const assignedBy = users.find(u => u.employeeId === task.assignedBy)
                  const isOverdue = isTaskOverdue(task)

                  return (
                    <div
                      key={task.id}
                      className="card border rounded-lg p-4 hover:shadow-md transition-shadow bg-white border-gray-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-mono text-sm text-primary font-medium">
                              {task.taskId}
                            </span>

                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                              {task.status}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            {isOverdue && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-200 text-red-800">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Overdue
                              </span>
                            )}
                          </div>

                          <h4 className="font-medium text-black mb-2">
                            {task.description}
                          </h4>

                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <UserIcon className="h-4 w-4" />
                              <span>Assigned to: {assignee?.name || task.assignedTo}</span>
                            </div>

                            {task.assignedBy && task.assignedBy !== task.assignedTo && (
                              <div className="flex items-center space-x-1">
                                <UserIcon className="h-4 w-4 text-blue-500" />
                                <span>Assigned by: {assignedBy?.name || task.assignedBy}</span>
                              </div>
                            )}

                            {task.support && task.support.length > 0 && (
                              <div className="flex items-center space-x-1">
                                <Users className="h-4 w-4" />
                                <span>Support: <SupportTeam supportIds={task.support} /></span>
                              </div>
                            )}

                            <div className="flex items-center space-x-1">
                              <Calendar className={`h-4 w-4 ${isOverdue ? 'text-red-500' : ''}`} />
                              <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                                {formatDate(task.startDate)} - {formatDate(task.endDate)}
                                {isOverdue && ' (Overdue)'}
                              </span>
                            </div>

                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>
                                {task.actualHours || 0}h / {task.estimatedHours}h
                              </span>
                            </div>

                            {task.projectId && (
                              <div className="flex items-center space-x-1">
                                <CheckSquare className="h-4 w-4" />
                                <span>Project: {task.projectId}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="ml-4">
                          <button
                            onClick={() => router.push(`/tasks/${task.taskId}`)}
                            className="btn-secondary flex items-center space-x-1"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="text-sm">View</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

