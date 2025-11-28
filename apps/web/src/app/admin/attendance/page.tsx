'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@apollo/client/react'
import { gql } from '@apollo/client'
import { Users, UserCheck, UserX, Plane, Home, Clock, MapPin, AlertCircle } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Navbar from '@/components/layout/Navbar'

const ADMIN_DASHBOARD_QUERY = gql`
  query AdminDashboardData {
    adminDashboardData {
      usersOnline
      usersPresent
      usersAbsent
      usersOnLeave
      usersWFH
      liveAttendance {
        userId
        userName
        department
        role
        status
        signInTime
        signOutTime
        location
      }
    }
  }
`

interface AttendanceRecord {
  userId: string
  userName: string
  department: string
  role: string
  status: string
  signInTime?: string
  signOutTime?: string
  location?: string
}

interface AdminDashboardData {
  usersOnline: number
  usersPresent: number
  usersAbsent: number
  usersOnLeave: number
  usersWFH: number
  liveAttendance: AttendanceRecord[]
}

export default function AdminAttendancePage() {
  const { data, loading, error, refetch } = useQuery<{ adminDashboardData: AdminDashboardData }>(
    ADMIN_DASHBOARD_QUERY,
    {
      pollInterval: 60000, // Refresh every minute
    }
  )

  useEffect(() => {
    // Check permissions
    const currentUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('currentUser') || 'null') : null
    if (currentUser) {
      const hasAccess = currentUser.isSystemAdmin === 1 ||
        (currentUser.tabPermissions && currentUser.tabPermissions.includes('attendance_dashboard'))

      if (!hasAccess) {
        window.location.href = '/dashboard'
      }
    }
  }, [])

  useEffect(() => {
    // Refresh data when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refetch()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [refetch])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg flex items-center space-x-3">
          <AlertCircle className="h-6 w-6" />
          <div>
            <p className="font-semibold">Error loading dashboard</p>
            <p className="text-sm">{error.message}</p>
          </div>
        </div>
      </div>
    )
  }

  const dashboardData = data?.adminDashboardData

  if (!dashboardData) {
    return null
  }

  const formatTime = (timeString?: string) => {
    if (!timeString) return '-'

    // Handle YYYY-MM-DD HH:mm:ss format from backend
    if (timeString.includes(' ')) {
      const [datePart, timePart] = timeString.split(' ')
      if (timePart) {
        const [hours, minutes] = timePart.split(':')
        const date = new Date()
        date.setHours(parseInt(hours))
        date.setMinutes(parseInt(minutes))
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      }
    }

    const date = new Date(timeString)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return 'bg-green-100 text-green-800'
      case 'PRESENT':
        return 'bg-blue-100 text-blue-800'
      case 'ABSENT':
        return 'bg-gray-100 text-gray-800'
      case 'ON_LEAVE':
        return 'bg-yellow-100 text-yellow-800'
      case 'WFH':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Attendance Dashboard</h1>
            <p className="text-gray-600 mt-2">Real-time attendance monitoring and statistics</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            {/* Live Status */}
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Online Now</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{dashboardData.usersOnline}</p>
                </div>
                <Users className="h-12 w-12 text-green-500" />
              </div>
            </div>

            {/* Present Today */}
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Present Today</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{dashboardData.usersPresent}</p>
                </div>
                <UserCheck className="h-12 w-12 text-blue-500" />
              </div>
            </div>

            {/* Absent */}
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-gray-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Absent</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{dashboardData.usersAbsent}</p>
                </div>
                <UserX className="h-12 w-12 text-gray-500" />
              </div>
            </div>

            {/* On Leave */}
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">On Leave</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{dashboardData.usersOnLeave}</p>
                </div>
                <Plane className="h-12 w-12 text-yellow-500" />
              </div>
            </div>

            {/* WFH */}
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Work From Home</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{dashboardData.usersWFH}</p>
                </div>
                <Home className="h-12 w-12 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Live Attendance Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Live Attendance</h2>
              <p className="text-sm text-gray-600 mt-1">Current status of all active users</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sign In
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sign Out
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dashboardData.liveAttendance.map((record: AttendanceRecord) => (
                    <tr key={record.userId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{record.userName}</div>
                        <div className="text-sm text-gray-500">{record.userId}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.department || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.role || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTime(record.signInTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTime(record.signOutTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          {record.location ? (
                            <>
                              <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                              {record.location}
                            </>
                          ) : (
                            '-'
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
