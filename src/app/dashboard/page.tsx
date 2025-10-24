'use client'

import React, { useEffect, useState, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getAllUsers, getRoleDisplayName } from '@/lib/auth'

import { optimizedDataService } from '@/lib/optimizedDataService'
import { Task, User } from '@/lib/types'
import StatsCard from '@/components/dashboard/StatsCard'
import TaskList from '@/components/dashboard/TaskListNew'
import TaskWarningAlert from '@/components/TaskWarningAlert'

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

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState('')
  const [todayString, setTodayString] = useState('')
  const [initialized, setInitialized] = useState(false)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [isHydrated, setIsHydrated] = useState(false)
  const router = useRouter()
  const currentUser = getCurrentUser()
  const { showGlobalLoading, hideGlobalLoading } = useLoading()

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    if (!currentUser) {
      router.push('/')
      return
    }

    if (initialized) return // Prevent multiple executions

    const loadInitialData = async () => {
      try {
        // Set current date on client side only after hydration
        const now = new Date()
        setCurrentDate(now.toLocaleDateString('en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }))
        setTodayString(now.toISOString().split('T')[0])

        // Load data based on user role with error handling
        if (currentUser.role === 'admin') {
          // For admin, load all users
          try {
            console.log('Initial load: Admin dashboard loading users...')
            const allUsers = await getAllUsers()
            console.log('Initial load: Loaded users:', allUsers.length, allUsers)
            setUsers(allUsers)
          } catch (userError) {
            console.warn('Failed to load users, using fallback:', userError)
            // Fallback: show at least the current user
            setUsers([currentUser])
          }
        } else {
          // For other roles, load tasks
          try {
            let userTasks: Task[] = []
            // All non-admin roles should only see their own tasks
            userTasks = await optimizedDataService.getTasksByUser(currentUser.employeeId)
            setTasks(userTasks)
          } catch (taskError) {
            console.warn('Failed to load tasks, using empty array:', taskError)
            // Fallback: show empty tasks array
            setTasks([])
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
      if (currentUser.role === 'admin') {
        // For admin, reload all users
        try {
          console.log('Admin dashboard: Loading all users...')
          const allUsers = await getAllUsers()
          console.log('Admin dashboard: Loaded users:', allUsers.length, allUsers)
          setUsers(allUsers)
        } catch (userError) {
          console.warn('Failed to reload users:', userError)
          // Keep existing users if reload fails
        }
      } else {
        // For other roles, reload tasks with force refresh
        try {
          let userTasks: Task[] = []
          // All non-admin roles should only see their own tasks
          // Use optimized service with force refresh to get latest data
          userTasks = await optimizedDataService.getTasksByUser(currentUser.employeeId, true)
          setTasks(userTasks)
        } catch (taskError) {
          console.warn('Failed to reload tasks:', taskError)
          // Keep existing tasks if reload fails
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
    const employeeUsers = users.filter(user => user.role === 'employee').length

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
                <div className="overflow-x-auto">
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

  // For non-admin users, show the original task-based dashboard
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(task => task.status === 'Done').length
  const inProgressTasks = tasks.filter(task => task.status === 'In Progress').length
  const delayedTasks = tasks.filter(task => task.status === 'Delayed').length
  const pendingTasks = tasks.filter(task => task.status === 'Yet to Start').length

  // Filter tasks based on active filter
  const getFilteredTasks = () => {
    let filteredTasks = tasks

    switch (activeFilter) {
      case 'completed':
        filteredTasks = tasks.filter(task => task.status === 'Done')
        break
      case 'in-progress':
        filteredTasks = tasks.filter(task => task.status === 'In Progress')
        break
      case 'delayed':
        filteredTasks = tasks.filter(task => task.status === 'Delayed')
        break
      case 'pending':
        filteredTasks = tasks.filter(task => task.status === 'Yet to Start')
        break
      default:
        filteredTasks = tasks
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

          {/* Task Warning Alert - Only for employees */}
          {currentUser.role === 'employee' && (
            <TaskWarningAlert
              employeeId={currentUser.employeeId}
              onWarningProcessed={(hasWarning, count) => {
                // Optional: Handle warning state changes
                console.log('Warning processed:', { hasWarning, count })
              }}
            />
          )}

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatsCard
              title="Total Tasks"
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
              subtitle={`${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}% completion rate`}
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





          {/* Filtered Tasks */}
          <TaskList
            tasks={displayTasks}
            title={
              activeFilter === 'all' ? "Recent Tasks (Owned & Supporting)" :
              activeFilter === 'completed' ? "Completed Tasks" :
              activeFilter === 'in-progress' ? "In Progress Tasks" :
              activeFilter === 'delayed' ? "Delayed Tasks" :
              activeFilter === 'pending' ? "Pending Tasks" :
              "Tasks"
            }
            showAssignee={false}
            allowEdit={true}
            onTaskUpdate={loadData}
          />

          {/* Quick Actions */}
          <div className="card">
            <h3 className="text-lg font-semibold text-black mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {currentUser.role === 'employee' && (
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
        </div>
      </div>
    </div>
  )
}
