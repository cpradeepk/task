'use client'

import React, { useEffect, useState, Fragment, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getAllUsers, getRoleDisplayName } from '@/lib/auth'

import { optimizedDataService } from '@/lib/optimizedDataService'
import { Task, User, Bug } from '@/lib/types'
import { useProjectFilter } from '@/contexts/ProjectFilterContext'
import StatsCard from '@/components/dashboard/StatsCard'
import UnifiedWorkItemsList from '@/components/dashboard/UnifiedWorkItemsList'
import TaskWarningAlert from '@/components/TaskWarningAlert'
import { QUERIES } from '@/lib/graphql-queries'

import {
  CheckCircle,
  Clock,
  AlertTriangle,
  ListTodo,
  Calendar,
  Users,
  UserCheck,
  UserX,
  UserPlus,
  Shield,
  Mail,
  Phone,
  Building
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import LoadingCard from '@/components/ui/LoadingCard'
import UserModal from '@/components/users/UserModal'
import { useLoading } from '@/contexts/LoadingContext'
import { DashboardCardSkeleton, TaskCardSkeleton, UserListSkeleton } from '@/components/ui/Skeletons'

// Helper function to execute GraphQL queries
async function executeGraphQLQuery(query: string, variables: any) {
  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables
    })
  })

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status}`)
  }

  const result = await response.json()

  if (result.errors) {
    throw new Error(result.errors[0]?.message || 'GraphQL query failed')
  }

  return result.data
}

export default function Dashboard() {
  const { selectedProjectIds } = useProjectFilter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [bugs, setBugs] = useState<Bug[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState('')
  const [todayString, setTodayString] = useState('')
  const [initialized, setInitialized] = useState(false)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [myTasksOnly, setMyTasksOnly] = useState(true) // Default: checked (show only my tasks)
  const [isHydrated, setIsHydrated] = useState(false)
  const hasLoadedData = useRef(false) // Prevent duplicate GraphQL calls in React Strict Mode
  const router = useRouter()
  const currentUser = getCurrentUser()
  const { showGlobalLoading, hideGlobalLoading} = useLoading()

  // Filter by selected project IDs from context and scope to current user
  const filteredTasksByProject = React.useMemo(() => {
    let filtered = tasks
    if (selectedProjectIds && selectedProjectIds.length > 0) {
      filtered = filtered.filter(task => task.projectId && selectedProjectIds.includes(task.projectId))
      // Enforce current user relationship
      filtered = filtered.filter(task => {
        if (!currentUser || !currentUser.employeeId) return false
        const isAssignedTo = Array.isArray(task.assignedTo)
          ? task.assignedTo.includes(currentUser.employeeId)
          : task.assignedTo === currentUser.employeeId
        const isAssignedBy = task.assignedBy === currentUser.employeeId
        const isSupport = Array.isArray(task.support)
          ? task.support.includes(currentUser.employeeId)
          : task.support === currentUser.employeeId
        return isAssignedTo || isAssignedBy || isSupport
      })
    }
    return filtered
  }, [tasks, selectedProjectIds, currentUser])

  const filteredBugsByProject = React.useMemo(() => {
    let filtered = bugs
    if (selectedProjectIds && selectedProjectIds.length > 0) {
      filtered = filtered.filter(bug => bug.projectId && selectedProjectIds.includes(bug.projectId))
      // Enforce current user relationship
      filtered = filtered.filter(bug => {
        if (!currentUser || !currentUser.employeeId) return false
        const isAssignedTo = Array.isArray(bug.assignedTo)
          ? bug.assignedTo.includes(currentUser.employeeId)
          : bug.assignedTo === currentUser.employeeId
        const isAssignedBy = bug.assignedBy === currentUser.employeeId
        const isReportedBy = bug.reportedBy === currentUser.employeeId
        return isAssignedTo || isAssignedBy || isReportedBy
      })
    }
    return filtered
  }, [bugs, selectedProjectIds, currentUser])

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    if (!currentUser) {
      console.log('❌ [Dashboard] No user found, redirecting to home')
      router.push('/')
      return
    }

    // Use ref to prevent duplicate calls in React Strict Mode
    if (hasLoadedData.current) {
      console.log('⏭️  [Dashboard] Skipping data load - already loaded')
      return
    }

    if (initialized) return // Prevent multiple executions

    const loadInitialData = async () => {
      try {
        console.log('✅ [Dashboard] First data load - fetching dashboard data')
        hasLoadedData.current = true

        // Set current date on client side only after hydration
        const now = new Date()
        setCurrentDate(now.toLocaleDateString('en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }))
        setTodayString(now.toISOString().split('T')[0])

        // Try GraphQL first, fallback to REST if it fails
        const includeUsers = currentUser.role === 'admin' || currentUser.role === 'top_management'

        try {
          console.log('🔵 [Dashboard] Attempting GraphQL query...')
          const data = await executeGraphQLQuery(QUERIES.GET_DASHBOARD, {
            employeeId: currentUser.employeeId,
            role: currentUser.role
          })

          console.log('✅ [Dashboard] GraphQL query successful')
          const dashboardData = data.dashboard

          setTasks(dashboardData.tasks || [])
          setBugs(dashboardData.bugs || [])
          if (includeUsers) {
            setUsers(dashboardData.users || [])
          }

          // Cache data in window for other components
          if (typeof window !== 'undefined') {
            ;(window as any).__DASHBOARD_DATA = {
              employeeId: currentUser.employeeId,
              tasks: dashboardData.tasks || [],
              bugs: dashboardData.bugs || [],
              users: dashboardData.users || [],
              userMap: {}, // Build userMap from users array
              timestamp: Date.now(),
              source: 'graphql'
            }
          }
        } catch (graphqlError) {
          console.warn('⚠️ [Dashboard] GraphQL failed, falling back to REST:', graphqlError)

          // Fallback to REST API
          try {
            const resp = await fetch(`/api/dashboard-data?employeeId=${currentUser.employeeId}&role=${currentUser.role}&includeUsers=${includeUsers}`)
            if (resp.ok) {
              const json = await resp.json()
              const payload = json.data || {}
              setTasks(payload.tasks || [])
              setBugs(payload.bugs || [])
              if (includeUsers) {
                setUsers(payload.users || [])
              }
              if (typeof window !== 'undefined') {
                ;(window as any).__DASHBOARD_DATA = {
                  employeeId: currentUser.employeeId,
                  tasks: payload.tasks || [],
                  bugs: payload.bugs || [],
                  users: payload.users || [],
                  userMap: payload.userMap || {},
                  timestamp: Date.now(),
                  source: 'rest'
                }
              }
            } else {
              console.warn('Dashboard data request failed with status', resp.status)
              if (includeUsers) setUsers([currentUser])
            }
          } catch (restError) {
            console.error('❌ [Dashboard] Both GraphQL and REST failed:', restError)
            if (includeUsers) setUsers([currentUser])
          }
        }
      } catch (error) {
        console.error('Failed to load initial data:', error)
      } finally {
        setIsLoading(false)
        setInitialized(true)
      }
    }

    loadInitialData()
  }, [currentUser, router, initialized, isHydrated])

  const loadData = async () => {
    if (!currentUser) return

    try {
      const includeUsers = currentUser.role === 'admin' || currentUser.role === 'top_management'

      // Try GraphQL first
      try {
        const data = await executeGraphQLQuery(QUERIES.GET_DASHBOARD, {
          employeeId: currentUser.employeeId,
          role: currentUser.role
        })

        const dashboardData = data.dashboard
        setTasks(dashboardData.tasks || [])
        setBugs(dashboardData.bugs || [])
        if (includeUsers) {
          setUsers(dashboardData.users || [])
        }

        if (typeof window !== 'undefined') {
          ;(window as any).__DASHBOARD_DATA = {
            employeeId: currentUser.employeeId,
            tasks: dashboardData.tasks || [],
            bugs: dashboardData.bugs || [],
            users: dashboardData.users || [],
            userMap: {},
            timestamp: Date.now(),
            source: 'graphql'
          }
        }
      } catch (graphqlError) {
        console.warn('GraphQL reload failed, falling back to REST:', graphqlError)

        // Fallback to REST
        const resp = await fetch(`/api/dashboard-data?employeeId=${currentUser.employeeId}&role=${currentUser.role}&includeUsers=${includeUsers}`)
        if (resp.ok) {
          const json = await resp.json()
          const payload = json.data || {}
          setTasks(payload.tasks || [])
          setBugs(payload.bugs || [])
          if (includeUsers) {
            setUsers(payload.users || [])
          }
          if (typeof window !== 'undefined') {
            ;(window as any).__DASHBOARD_DATA = {
              employeeId: currentUser.employeeId,
              tasks: payload.tasks || [],
              bugs: payload.bugs || [],
              users: payload.users || [],
              userMap: payload.userMap || {},
              timestamp: Date.now(),
              source: 'rest'
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to reload data:', error)
    }
  }

  // Prevent hydration mismatch
  if (!isHydrated) {
    return (
      <div>
        <Navbar />
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-96 mb-6"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded"></div>
                ))}
              </div>
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div>
        <Navbar />
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 animate-fade-in">
            {/* Header skeleton */}
            <div className="animate-pulse mb-8">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>

            {/* Stats cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <DashboardCardSkeleton />
              <DashboardCardSkeleton />
              <DashboardCardSkeleton />
              <DashboardCardSkeleton />
            </div>

            {/* Content skeleton */}
            <div className="card animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                <TaskCardSkeleton />
                <TaskCardSkeleton />
                <TaskCardSkeleton />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!currentUser) return null

  // Calculate statistics based on user role
  if (currentUser.role === 'admin') {
    // Admin statistics - user-based
    const totalUsers = users.length
    const activeUsers = users.filter(user => user.status === 'active').length
    const inactiveUsers = users.filter(user => user.status === 'inactive').length
    const employeeUsers = users.filter(user => user.role === 'amtarikshian').length

    return (
      <div>
        <Navbar />
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-black">
                  Admin Dashboard
                </h1>
                <p className="text-gray-600 mt-1">
                  System overview and user management
                </p>
              </div>

              <div className="mt-4 sm:mt-0">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>{currentDate || 'Loading...'}</span>
                </div>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Total Users"
                value={totalUsers}
                icon={Users}
                color="blue"
              />
              <StatsCard
                title="Active Users"
                value={activeUsers}
                icon={UserCheck}
                color="green"
                subtitle={`${totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0}% active`}
              />
              <StatsCard
                title="Employees"
                value={employeeUsers}
                icon={Users}
                color="yellow"
              />
              <StatsCard
                title="Inactive Users"
                value={inactiveUsers}
                icon={UserX}
                color="red"
              />
            </div>

            {/* Users List */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-black">All Users ({totalUsers})</h3>
                <button
                  onClick={() => router.push('/users')}
                  className="btn-primary text-sm"
                >
                  Manage Users
                </button>
              </div>

              {users.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No users found</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <div className="overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Manager
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Warning Count
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.employeeId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center">
                                <span className="text-black font-medium text-sm">
                                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-black">{user.name}</div>
                                <div className="text-sm text-gray-500">{user.employeeId}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              <div className="flex items-center space-x-1">
                                <Mail className="h-3 w-3" />
                                <span>{user.email}</span>
                              </div>
                              <div className="flex items-center space-x-1 mt-1">
                                <Phone className="h-3 w-3" />
                                <span>{user.phone}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-1">
                              <Building className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-900">{user.department}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {user.managerEmail ? (
                                <div className="flex items-center space-x-1">
                                  <Mail className="h-3 w-3 text-gray-400" />
                                  <span>{user.managerEmail}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">No manager</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                              user.role === 'top_management' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {getRoleDisplayName(user.role)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {user.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.warningCount === 0 ? 'bg-green-100 text-green-800' :
                              user.warningCount <= 2 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {user.warningCount}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions for Admin */}
            <div className="card">
              <h3 className="text-lg font-semibold text-black mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                  onClick={() => setIsUserModalOpen(true)}
                  className="p-4 text-left border border-gray-200 rounded-lg hover:border-primary hover:bg-primary-50 transition-colors"
                >
                  <div className="flex items-center space-x-2 text-primary font-medium mb-1">
                    <UserPlus className="h-4 w-4" />
                    <span>Add User</span>
                  </div>
                  <div className="text-sm text-gray-600">Create a new user account</div>
                </button>
                <button
                  onClick={() => router.push('/users')}
                  className="p-4 text-left border border-gray-200 rounded-lg hover:border-primary hover:bg-primary-50 transition-colors"
                >
                  <div className="flex items-center space-x-2 text-primary font-medium mb-1">
                    <Users className="h-4 w-4" />
                    <span>Manage Users</span>
                  </div>
                  <div className="text-sm text-gray-600">View, edit, or manage user accounts</div>
                </button>
                <button
                  onClick={() => router.push('/settings')}
                  className="p-4 text-left border border-gray-200 rounded-lg hover:border-primary hover:bg-primary-50 transition-colors"
                >
                  <div className="flex items-center space-x-2 text-primary font-medium mb-1">
                    <Shield className="h-4 w-4" />
                    <span>System Settings</span>
                  </div>
                  <div className="text-sm text-gray-600">Configure system preferences</div>
                </button>
              </div>
            </div>

            {/* Add User Modal */}
            <UserModal
              user={selectedUser}
              isOpen={isUserModalOpen}
              onClose={() => setIsUserModalOpen(false)}
              onSave={async (userData) => {
                try {
                  const response = await fetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                  })

                  if (response.ok) {
                    await loadData()
                    setIsUserModalOpen(false)
                    setSelectedUser(null)
                  } else {
                    throw new Error('Failed to save user')
                  }
                } catch (error) {
                  console.error('Error saving user:', error)
                }
              }}
              existingUsers={users}
            />
          </div>
        </div>
      </div>
    )
  }

  // Already computed at the top to satisfy React's Rule of Hooks

  // For non-admin users, show the original task-based dashboard
  // Calculate statistics for ALL tasks (not filtered by employee)
  const allTasksCount = filteredTasksByProject.length

  // Calculate statistics for current user's tasks (assigned to OR created by current user)
  const myTasks = filteredTasksByProject.filter(task => {
    const isAssignedTo = Array.isArray(task.assignedTo)
      ? task.assignedTo.includes(currentUser.employeeId)
      : task.assignedTo === currentUser.employeeId
    return isAssignedTo || task.assignedBy === currentUser.employeeId
  })
  const totalTasks = myTasks.length
  const completedTasks = myTasks.filter(task => task.status === 'Done').length
  const inProgressTasks = myTasks.filter(task => task.status === 'In Progress').length
  const delayedTasks = myTasks.filter(task => task.status === 'Delayed').length
  const pendingTasks = myTasks.filter(task => task.status === 'Yet to Start').length

  // Filter tasks based on active filter
  const getFilteredTasks = () => {
    let filteredTasks: typeof tasks = []

    // Apply "My Tasks Only" filter first
    let baseTasks = filteredTasksByProject
    if (myTasksOnly) {
      baseTasks = filteredTasksByProject.filter(task => {
        return Array.isArray(task.assignedTo)
          ? task.assignedTo.includes(currentUser.employeeId)
          : task.assignedTo === currentUser.employeeId
      })
    }

    switch (activeFilter) {
      case 'all-system':
        // Show ALL tasks from ALL employees (no employee filter)
        // When "My Tasks Only" is checked, still filter by assignee
        filteredTasks = baseTasks
        break
      case 'all':
        // Show all tasks (filtered by "My Tasks Only" if checked)
        filteredTasks = baseTasks
        break
      case 'completed':
        // Show completed tasks (filtered by "My Tasks Only" if checked)
        filteredTasks = baseTasks.filter(task => task.status === 'Done')
        break
      case 'in-progress':
        // Show in-progress tasks (filtered by "My Tasks Only" if checked)
        filteredTasks = baseTasks.filter(task => task.status === 'In Progress')
        break
      case 'delayed':
        // Show delayed tasks (filtered by "My Tasks Only" if checked)
        filteredTasks = baseTasks.filter(task => task.status === 'Delayed')
        break
      case 'pending':
        // Show pending tasks (filtered by "My Tasks Only" if checked)
        filteredTasks = baseTasks.filter(task => task.status === 'Yet to Start')
        break
      default:
        // Default to showing tasks (filtered by "My Tasks Only" if checked)
        filteredTasks = baseTasks
        break
    }

    return filteredTasks
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20) // Show more tasks when filtered
  }

  const displayTasks = getFilteredTasks()

  // Handle filter clicks
  const handleFilterClick = (filter: string) => {
    setActiveFilter(filter)
  }

  return (
    <div>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-black">
                Welcome back, {currentUser.name}!
              </h1>
              <p className="text-gray-600 mt-1">
                Here&apos;s an overview of your tasks and activities
              </p>
            </div>

            <div className="mt-4 sm:mt-0">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>{currentDate || 'Loading...'}</span>
              </div>
            </div>
          </div>

          {/* Task Warning Alert - Only for amtariksians */}
          {currentUser.role === 'amtarikshian' && (
            <TaskWarningAlert
              employeeId={currentUser.employeeId}
              tasks={tasks}
              onWarningProcessed={(hasWarning, count) => {
                // Optional: Handle warning state changes
                console.log('Warning processed:', { hasWarning, count })
              }}
            />
          )}

          {/* Quick Actions - Moved here before statistics */}
          <div className="card">
            <h3 className="text-lg font-semibold text-black mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {currentUser.role === 'amtarikshian' && (
                <>
                  <button
                    onClick={() => router.push('/tasks/create')}
                    className="p-4 text-left border border-gray-200 rounded-lg hover:border-primary hover:bg-primary-50 transition-colors"
                  >
                    <div className="text-primary font-medium">Create Task</div>
                    <div className="text-sm text-gray-600 mt-1">Add a new task</div>
                  </button>
                  <button
                    onClick={() => router.push('/leave/apply')}
                    className="p-4 text-left border border-gray-200 rounded-lg hover:border-primary hover:bg-primary-50 transition-colors"
                  >
                    <div className="text-primary font-medium">Apply Leave</div>
                    <div className="text-sm text-gray-600 mt-1">Request time off</div>
                  </button>
                  <button
                    onClick={() => router.push('/wfh/apply')}
                    className="p-4 text-left border border-gray-200 rounded-lg hover:border-primary hover:bg-primary-50 transition-colors"
                  >
                    <div className="text-primary font-medium">Apply WFH</div>
                    <div className="text-sm text-gray-600 mt-1">Work from home request</div>
                  </button>
                </>
              )}

              {currentUser.role === 'top_management' && (
                <>
                  <button
                    onClick={() => router.push('/reports')}
                    className="p-4 text-left border border-gray-200 rounded-lg hover:border-primary hover:bg-primary-50 transition-colors"
                  >
                    <div className="text-primary font-medium">View Reports</div>
                    <div className="text-sm text-gray-600 mt-1">Team performance</div>
                  </button>
                  {currentUser.role === 'top_management' && (
                    <button
                      onClick={() => router.push('/approvals')}
                      className="p-4 text-left border border-gray-200 rounded-lg hover:border-primary hover:bg-primary-50 transition-colors"
                    >
                      <div className="text-primary font-medium">Pending Approvals</div>
                      <div className="text-sm text-gray-600 mt-1">Review requests</div>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* My Tasks Checkbox - hidden when project is selected since it's already user-scoped */}
          {(!selectedProjectIds || selectedProjectIds.length === 0) && (
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm mb-4">
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
          )}

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">

            <StatsCard
              title="My Tasks"
              value={totalTasks}
              icon={ListTodo}
              color="blue"
              onClick={() => handleFilterClick('all')}
              isActive={activeFilter === 'all'}
            />
            <StatsCard
              title="Pending"
              value={pendingTasks}
              icon={Clock}
              color="gray"
              onClick={() => handleFilterClick('pending')}
              isActive={activeFilter === 'pending'}
            />
            <StatsCard
              title="In Progress"
              value={inProgressTasks}
              icon={Clock}
              color="yellow"
              onClick={() => handleFilterClick('in-progress')}
              isActive={activeFilter === 'in-progress'}
            />
            <StatsCard
              title="Completed"
              value={completedTasks}
              icon={CheckCircle}
              color="green"
              onClick={() => handleFilterClick('completed')}
              isActive={activeFilter === 'completed'}
            />
            <StatsCard
              title="Delayed"
              value={delayedTasks}
              icon={AlertTriangle}
              color="red"
              onClick={() => handleFilterClick('delayed')}
              isActive={activeFilter === 'delayed'}
            />
          </div>





          {/* Unified Work Items (Tasks + Bugs) */}
          <UnifiedWorkItemsList
            tasks={displayTasks}
            bugs={filteredBugsByProject}
            title="Recent Work Items (Tasks & Bugs)"
            showAssignee={false}
            allowEdit={true}
            onTaskUpdate={loadData}
          />
        </div>
      </div>
    </div>
  )
}
