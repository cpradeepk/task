'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getAllUsers } from '@/lib/auth'
import { dataService } from '@/lib/sheets'
import {
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  Clock,
  Target,
  Award,
  AlertTriangle
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'

interface AnalyticsData {
  totalEmployees: number
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  delayedTasks: number
  totalLeaveApplications: number
  totalWFHApplications: number
  averageTaskCompletion: number
  topPerformers: Array<{
    name: string
    employeeId: string
    completedTasks: number
  }>
  departmentStats: Array<{
    department: string
    employees: number
    completedTasks: number
  }>
}

export default function Analytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const router = useRouter()
  const currentUser = getCurrentUser()

  useEffect(() => {
    if (!currentUser) {
      router.push('/')
      return
    }

    if (currentUser.role !== 'top_management' && currentUser.role !== 'admin') {
      router.push('/dashboard')
      return
    }

    if (!initialized) {
      loadAnalyticsData()
      setInitialized(true)
    }
  }, [currentUser, router, initialized])

  const loadAnalyticsData = async () => {
    setIsLoading(true)

    try {
      const users = await getAllUsers()
      const tasks = await dataService.getAllTasks()
      const leaveApplications = await dataService.getAllLeaveApplications()
      const wfhApplications = await dataService.getAllWFHApplications()

      const completedTasks = tasks.filter(task => task.status === 'Done')
      const pendingTasks = tasks.filter(task => task.status === 'Yet to Start' || task.status === 'In Progress')
      const delayedTasks = tasks.filter(task => task.status === 'Delayed')

      // Calculate top performers
      const performanceMap = new Map()
      tasks.forEach(task => {
        if (task.status === 'Done') {
          const current = performanceMap.get(task.assignedTo) || 0
          performanceMap.set(task.assignedTo, current + 1)
        }
      })

      const topPerformers = Array.from(performanceMap.entries())
        .map(([name, completedTasks]) => {
          const user = users.find(u => u.name === name)
          return {
            name,
            employeeId: user?.employeeId || 'N/A',
            completedTasks: completedTasks as number
          }
        })
        .sort((a, b) => b.completedTasks - a.completedTasks)
        .slice(0, 5)

      // Calculate department stats
      const departmentMap = new Map()
      users.forEach(user => {
        if (user.status === 'active') {
          const dept = user.department
          const current = departmentMap.get(dept) || { employees: 0, completedTasks: 0 }
          current.employees += 1
          
          // Count completed tasks for this user
          const userCompletedTasks = tasks.filter(task =>
            task.assignedTo === user.name && task.status === 'Done'
          ).length
          current.completedTasks += userCompletedTasks
          
          departmentMap.set(dept, current)
        }
      })

      const departmentStats = Array.from(departmentMap.entries()).map(([department, stats]) => ({
        department,
        employees: stats.employees,
        completedTasks: stats.completedTasks
      }))

      const analyticsData: AnalyticsData = {
        totalEmployees: users.filter(u => u.status === 'active').length,
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        pendingTasks: pendingTasks.length,
        delayedTasks: delayedTasks.length,
        totalLeaveApplications: leaveApplications.length,
        totalWFHApplications: wfhApplications.length,
        averageTaskCompletion: tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0,
        topPerformers,
        departmentStats
      }

      setAnalyticsData(analyticsData)
    } catch (error) {
      console.error('Error loading analytics data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!currentUser) return null

  if (isLoading) {
    return (
      <div>
        <Navbar />
        <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
        </div>
      </div>
    )
  }

  if (!analyticsData) return null

  return (
    <div>
      <Navbar />
      <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Comprehensive insights and performance metrics</p>
        </div>
        <button
          onClick={loadAnalyticsData}
          className="btn-primary flex items-center space-x-2 mt-4 sm:mt-0"
        >
          <BarChart3 className="h-4 w-4" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold text-black">{analyticsData.totalEmployees}</p>
            </div>
            <Users className="h-8 w-8 text-primary" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tasks</p>
              <p className="text-2xl font-bold text-black">{analyticsData.totalTasks}</p>
            </div>
            <Target className="h-8 w-8 text-primary" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completion Rate</p>
              <p className="text-2xl font-bold text-black">{analyticsData.averageTaskCompletion}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-primary" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Delayed Tasks</p>
              <p className="text-2xl font-bold text-black">{analyticsData.delayedTasks}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-primary" />
          </div>
        </div>
      </div>

      {/* Task Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed Tasks</p>
              <p className="text-2xl font-bold text-black">{analyticsData.completedTasks}</p>
            </div>
            <Award className="h-8 w-8 text-primary" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Tasks</p>
              <p className="text-2xl font-bold text-black">{analyticsData.pendingTasks}</p>
            </div>
            <Clock className="h-8 w-8 text-primary" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Leave Applications</p>
              <p className="text-2xl font-bold text-black">{analyticsData.totalLeaveApplications}</p>
              <p className="text-xs text-gray-500">WFH: {analyticsData.totalWFHApplications}</p>
            </div>
            <Calendar className="h-8 w-8 text-primary" />
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="card">
        <h3 className="text-lg font-semibold text-black mb-4">Top Performers</h3>
        <div className="space-y-3">
          {analyticsData.topPerformers.map((performer, index) => (
            <div key={performer.employeeId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-primary text-black' :
                    index === 1 ? 'bg-gray-300 text-black' :
                    index === 2 ? 'bg-gray-200 text-black' :
                    'bg-gray-100 text-black'
                  }`}>
                    {index + 1}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-black">{performer.name}</p>
                  <p className="text-sm text-gray-600">{performer.employeeId}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-black">{performer.completedTasks}</p>
                <p className="text-sm text-gray-600">tasks completed</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Department Statistics */}
      <div className="card">
        <h3 className="text-lg font-semibold text-black mb-4">Department Overview</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employees
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completed Tasks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Tasks/Employee
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analyticsData.departmentStats.map((dept) => (
                <tr key={dept.department}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                    {dept.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                    {dept.employees}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                    {dept.completedTasks}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                    {dept.employees > 0 ? Math.round(dept.completedTasks / dept.employees * 10) / 10 : 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  )
}
