'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { Task } from '@/lib/types'
import { getAllTasks, getTaskStatistics, getAverageCompletionTime } from '@/lib/taskService'
import { getCurrentUser } from '@/lib/auth'
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  Users,
  Calendar,
  Target,
  ArrowLeft
} from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

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

export default function TaskAnalyticsPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [statistics, setStatistics] = useState<any>(null)
  const [averageCompletionTime, setAverageCompletionTime] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isHydrated, setIsHydrated] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const router = useRouter()
  const currentUser = getCurrentUser()

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const loadAnalyticsData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [tasksData, stats, avgTime] = await Promise.all([
        getAllTasks(),
        getTaskStatistics(),
        getAverageCompletionTime()
      ])

      setTasks(tasksData)
      setStatistics(stats)
      setAverageCompletionTime(avgTime)
    } catch (error) {
      console.error('Failed to load analytics data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    if (!currentUser) {
      router.push('/')
      return
    }

    if (initialized) return // Prevent multiple executions

    loadAnalyticsData()
    setInitialized(true)
  }, [currentUser, router, isHydrated, initialized, loadAnalyticsData])

  const getRecentTasks = () => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    return tasks.filter(task => new Date(task.createdAt) >= thirtyDaysAgo)
  }

  const getTopAssignees = () => {
    const assigneeCounts: Record<string, number> = {}
    
    tasks.forEach(task => {
      if (task.assignedTo) {
        assigneeCounts[task.assignedTo] = (assigneeCounts[task.assignedTo] || 0) + 1
      }
    })

    return Object.entries(assigneeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([assignee, count]) => ({ assignee, count }))
  }

  const getCompletionRate = () => {
    if (tasks.length === 0) return 0
    const completedTasks = tasks.filter(task => task.status === 'Done')
    return Math.round((completedTasks.length / tasks.length) * 100)
  }

  const getAverageEstimatedVsActual = () => {
    const tasksWithActual = tasks.filter(task => task.actualHours && task.actualHours > 0)
    if (tasksWithActual.length === 0) return { estimated: '0', actual: '0', variance: '0' }

    const totalEstimated = tasksWithActual.reduce((sum, task) => sum + task.estimatedHours, 0)
    const totalActual = tasksWithActual.reduce((sum, task) => sum + (task.actualHours || 0), 0)

    const avgEstimated = totalEstimated / tasksWithActual.length
    const avgActual = totalActual / tasksWithActual.length
    const variance = ((avgActual - avgEstimated) / avgEstimated) * 100

    return {
      estimated: avgEstimated.toFixed(2),
      actual: avgActual.toFixed(2),
      variance: variance.toFixed(1)
    }
  }

  const getOnTimeCompletionRate = () => {
    const completedTasks = tasks.filter(task => task.status === 'Done')
    if (completedTasks.length === 0) return 0

    const onTimeTasks = completedTasks.filter(task => {
      const endDate = new Date(task.endDate)
      const completedDate = new Date(task.updatedAt)
      return completedDate <= endDate
    })

    return Math.round((onTimeTasks.length / completedTasks.length) * 100)
  }

  // Show loading state to prevent flickering
  if (!isHydrated || !currentUser || !initialized) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div>
                  <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-64"></div>
                </div>
              </div>
              <div className="h-10 bg-gray-200 rounded w-32"></div>
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

            {/* Charts Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
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
        <div className="max-w-7xl mx-auto p-6">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  const recentTasks = getRecentTasks()
  const topAssignees = getTopAssignees()
  const completionRate = getCompletionRate()
  const estimatedVsActual = getAverageEstimatedVsActual()
  const onTimeRate = getOnTimeCompletionRate()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/tasks')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Task Analytics</h1>
                <p className="text-gray-600 mt-1">Insights and statistics for task management</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => router.push('/tasks')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 transition-colors"
          >
            Back to Tasks
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{statistics?.total || 0}</p>
                <p className="text-xs text-gray-500 mt-1">All time</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{completionRate}%</p>
                <p className="text-xs text-gray-500 mt-1">Tasks completed</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Completion Time</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">{averageCompletionTime.toFixed(1)}</p>
                <p className="text-xs text-gray-500 mt-1">Days</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">On-Time Rate</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">{onTimeRate}%</p>
                <p className="text-xs text-gray-500 mt-1">Completed on time</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Status and Priority Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Breakdown */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span>Tasks by Status</span>
            </h2>
            <div className="space-y-3">
              {statistics && Object.entries(statistics.byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      status === 'Done' ? 'bg-green-500' :
                      status === 'In Progress' ? 'bg-yellow-500' :
                      status === 'Delayed' ? 'bg-red-500' :
                      status === 'On Hold' ? 'bg-gray-500' :
                      'bg-blue-500'
                    }`}></div>
                    <span className="text-sm text-gray-700">{status}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-semibold text-gray-900">{count as number}</span>
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          status === 'Done' ? 'bg-green-500' :
                          status === 'In Progress' ? 'bg-yellow-500' :
                          status === 'Delayed' ? 'bg-red-500' :
                          status === 'On Hold' ? 'bg-gray-500' :
                          'bg-blue-500'
                        }`}
                        style={{ width: `${((count as number) / statistics.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Priority Breakdown */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span>Tasks by Priority</span>
            </h2>
            <div className="space-y-3">
              {statistics && Object.entries(statistics.byPriority).map(([priority, count]) => (
                <div key={priority} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      priority.includes('IU&I') ? 'bg-red-500' :
                      priority.includes('IU&NI') ? 'bg-orange-500' :
                      priority.includes('NU&I') ? 'bg-blue-500' :
                      'bg-gray-500'
                    }`}></div>
                    <span className="text-sm text-gray-700">{priority}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-semibold text-gray-900">{count as number}</span>
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          priority.includes('IU&I') ? 'bg-red-500' :
                          priority.includes('IU&NI') ? 'bg-orange-500' :
                          priority.includes('NU&I') ? 'bg-blue-500' :
                          'bg-gray-500'
                        }`}
                        style={{ width: `${((count as number) / statistics.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Tasks and Top Assignees */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Tasks */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-green-600" />
              <span>Recent Tasks (Last 30 Days)</span>
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <span className="text-sm text-gray-700">Total Created</span>
                <span className="text-2xl font-bold text-green-600">{recentTasks.length}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <span className="text-sm text-gray-700">Completed</span>
                <span className="text-2xl font-bold text-blue-600">
                  {recentTasks.filter(t => t.status === 'Done').length}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                <span className="text-sm text-gray-700">In Progress</span>
                <span className="text-2xl font-bold text-yellow-600">
                  {recentTasks.filter(t => t.status === 'In Progress').length}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                <span className="text-sm text-gray-700">Delayed</span>
                <span className="text-2xl font-bold text-red-600">
                  {recentTasks.filter(t => t.status === 'Delayed').length}
                </span>
              </div>
            </div>
          </div>

          {/* Top Assignees */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-600" />
              <span>Top Assignees</span>
            </h2>
            {topAssignees.length > 0 ? (
              <div className="space-y-3">
                {topAssignees.map(({ assignee, count }, index) => (
                  <div key={assignee} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-600' :
                        'bg-blue-500'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        <UserName employeeId={assignee} />
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{count} tasks</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No task assignments yet
              </div>
            )}
          </div>
        </div>

        {/* Estimated vs Actual Hours */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Clock className="h-5 w-5 text-indigo-600" />
            <span>Estimated vs Actual Hours</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Average Estimated</p>
              <p className="text-3xl font-bold text-blue-600">{estimatedVsActual.estimated}h</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Average Actual</p>
              <p className="text-3xl font-bold text-purple-600">{estimatedVsActual.actual}h</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Variance</p>
              <p className={`text-3xl font-bold ${
                parseFloat(estimatedVsActual.variance) > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {parseFloat(estimatedVsActual.variance) > 0 ? '+' : ''}{estimatedVsActual.variance}%
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            {parseFloat(estimatedVsActual.variance) > 0
              ? 'Tasks are taking longer than estimated on average'
              : 'Tasks are being completed faster than estimated on average'
            }
          </p>
        </div>
      </div>
    </div>
  )
}
