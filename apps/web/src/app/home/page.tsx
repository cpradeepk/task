'use client'

import React, { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import { gql } from '@apollo/client'
import { format } from 'date-fns'
import Navbar from '@/components/layout/Navbar'
import UnifiedWorkItemsList from '@/components/dashboard/UnifiedWorkItemsList'
import DailyAttendanceCard from '@/components/home/DailyAttendanceCard'
import SummaryCards from '@/components/home/SummaryCards'
import CalendarWidget from '@/components/home/CalendarWidget'
import SelectedDatePanel from '@/components/home/SelectedDatePanel'
import MembersList from '@/components/home/MembersList'
import { QUERIES } from '@/lib/graphql-queries'
import { useLoading } from '@/contexts/LoadingContext'
import { getCurrentUser } from '@/lib/auth'
import { hasTabAccess } from '@/lib/permissions'
import { Users, UserCheck, UserX, Plane, Home as HomeIcon, Clock, MapPin, AlertCircle, BarChart3 } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface HomeDashboardData {
    userWorkHours: number
    membersOnLeave: Array<{
        user: {
            employeeId: string
            name: string
            role: string
        }
        leaveType: string
    }>
    membersOnWFH: Array<{
        user: {
            employeeId: string
            name: string
            role: string
        }
    }>
    attendance: Array<{
        id: string
        signInTime: string
        signOutTime: string
        workHours: number
        status: string
    }>
}

interface HomeDashboardResponse {
    homeDashboardData: HomeDashboardData
}

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

export default function HomePage() {
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [activeTab, setActiveTab] = useState<'home' | 'attendance'>('home')
    const dateStr = format(new Date(), 'yyyy-MM-dd')
    const currentUser = getCurrentUser()

    // Check if user has access to attendance dashboard
    const hasAttendanceDashboardAccess = hasTabAccess(currentUser, 'attendance_dashboard')

    const { data, loading, error } = useQuery<HomeDashboardResponse>(gql(QUERIES.GET_HOME_DASHBOARD_DATA), {
        variables: { date: dateStr },
        pollInterval: 60000 // Refresh every minute
    })

    const { data: adminData, loading: adminLoading, error: adminError } = useQuery<{ adminDashboardData: AdminDashboardData }>(
        ADMIN_DASHBOARD_QUERY,
        {
            pollInterval: 60000,
            skip: !hasAttendanceDashboardAccess || activeTab !== 'attendance'
        }
    )

    const { data: dashData } = useQuery<any>(gql(QUERIES.GET_DASHBOARD), {
        variables: { employeeId: currentUser?.employeeId, role: currentUser?.role },
        skip: !currentUser,
        pollInterval: 60000
    })

    const handleTaskUpdate = () => {
        // Apollo will handle cache updates, but we could trigger refetch here if needed
    }

    if (loading && !data) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="h-64 bg-gray-200 rounded-2xl"></div>
                        <div className="lg:col-span-2 h-64 bg-gray-200 rounded-2xl"></div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-96">
                        <div className="bg-gray-200 rounded-2xl"></div>
                        <div className="bg-gray-200 rounded-2xl"></div>
                        <div className="bg-gray-200 rounded-2xl"></div>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-red-600">
                    <p>Error loading dashboard: {error.message}</p>
                </div>
            </div>
        )
    }

    const defaultDashboardData: HomeDashboardData = {
        userWorkHours: 0,
        membersOnLeave: [],
        membersOnWFH: [],
        attendance: []
    }

    const dashboardData = data?.homeDashboardData || defaultDashboardData

    // Mock data for missing fields (until backend supports them)
    const averageWorkHours = "8.5" // Placeholder
    const onTimeArrivalPercentage = 92 // Placeholder
    const leavesTakenYTD = 0 // Placeholder - will be updated from GraphQL
    const totalWFHApproved = 0 // Placeholder - will be updated from GraphQL

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
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Header with Tabs */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {activeTab === 'home' ? 'Home Dashboard' : 'Attendance Dashboard'}
                        </h1>
                        <p className="text-gray-500 mt-1">
                            {activeTab === 'home'
                                ? "Welcome back! Here's your daily overview."
                                : 'Real-time attendance monitoring and statistics'}
                        </p>
                    </div>
                    <div className="text-sm text-gray-500 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100">
                        {format(new Date(), 'EEEE, MMMM do, yyyy')}
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('home')}
                            className={`
                                flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                                ${activeTab === 'home'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                        >
                            <HomeIcon className="h-5 w-5 mr-2" />
                            Home
                        </button>
                        {hasAttendanceDashboardAccess && (
                            <button
                                onClick={() => setActiveTab('attendance')}
                                className={`
                                    flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                                    ${activeTab === 'attendance'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                                `}
                            >
                                <BarChart3 className="h-5 w-5 mr-2" />
                                Attendance Dashboard
                            </button>
                        )}
                    </nav>
                </div>

                {/* Tab Content */}
                {activeTab === 'home' ? (
                    <>
                        {/* Top Row: Daily Card & Summary Stats */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-1 h-full">
                                <DailyAttendanceCard />
                            </div>
                            <div className="lg:col-span-2 h-full">
                                <SummaryCards
                                    averageWorkHours={averageWorkHours}
                                    onTimeArrivalPercentage={onTimeArrivalPercentage}
                                    leavesTakenYTD={leavesTakenYTD}
                                    totalWFHApproved={totalWFHApproved}
                                />

                                <div className="mt-6">
                                    <UnifiedWorkItemsList
                                        tasks={dashData?.dashboard?.tasks || []}
                                        bugs={dashData?.dashboard?.bugs || []}
                                        title="Recent Work Items"
                                        showAssignee={false}
                                        allowEdit={true}
                                        onTaskUpdate={handleTaskUpdate}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Middle Row: Calendar, Selected Date, Members */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-1 h-[500px]">
                                <CalendarWidget
                                    selectedDate={selectedDate}
                                    onDateSelect={setSelectedDate}
                                />
                            </div>
                            <div className="lg:col-span-1 h-[500px]">
                                <SelectedDatePanel date={selectedDate} />
                            </div>
                            <div className="lg:col-span-1 h-[500px]">
                                <MembersList
                                    membersOnLeave={(dashboardData.membersOnLeave || []).map(m => ({
                                        user: m.user,
                                        status: m.leaveType
                                    }))}
                                    membersOnWFH={(dashboardData.membersOnWFH || []).map(m => ({
                                        user: m.user,
                                        status: 'WFH'
                                    }))}
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Attendance Dashboard Content */}
                        {adminLoading ? (
                            <div className="flex items-center justify-center min-h-[400px]">
                                <LoadingSpinner size="lg" />
                            </div>
                        ) : adminError ? (
                            <div className="flex items-center justify-center min-h-[400px]">
                                <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg flex items-center space-x-3">
                                    <AlertCircle className="h-6 w-6" />
                                    <div>
                                        <p className="font-semibold">Error loading dashboard</p>
                                        <p className="text-sm">{adminError.message}</p>
                                    </div>
                                </div>
                            </div>
                        ) : adminData?.adminDashboardData ? (
                            <>
                                {/* Stats Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                                    {/* Live Status */}
                                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-600">Online Now</p>
                                                <p className="text-3xl font-bold text-gray-900 mt-2">{adminData.adminDashboardData.usersOnline}</p>
                                            </div>
                                            <Users className="h-12 w-12 text-green-500" />
                                        </div>
                                    </div>

                                    {/* Present Today */}
                                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-600">Present Today</p>
                                                <p className="text-3xl font-bold text-gray-900 mt-2">{adminData.adminDashboardData.usersPresent}</p>
                                            </div>
                                            <UserCheck className="h-12 w-12 text-blue-500" />
                                        </div>
                                    </div>

                                    {/* Absent */}
                                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-gray-500">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-600">Absent</p>
                                                <p className="text-3xl font-bold text-gray-900 mt-2">{adminData.adminDashboardData.usersAbsent}</p>
                                            </div>
                                            <UserX className="h-12 w-12 text-gray-500" />
                                        </div>
                                    </div>

                                    {/* On Leave */}
                                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-600">On Leave</p>
                                                <p className="text-3xl font-bold text-gray-900 mt-2">{adminData.adminDashboardData.usersOnLeave}</p>
                                            </div>
                                            <Plane className="h-12 w-12 text-yellow-500" />
                                        </div>
                                    </div>

                                    {/* WFH */}
                                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-600">Work From Home</p>
                                                <p className="text-3xl font-bold text-gray-900 mt-2">{adminData.adminDashboardData.usersWFH}</p>
                                            </div>
                                            <HomeIcon className="h-12 w-12 text-purple-500" />
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
                                                {adminData.adminDashboardData.liveAttendance.map((record: AttendanceRecord) => (
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
                            </>
                        ) : null}
                    </>
                )}
            </main>
        </div>
    )
}
