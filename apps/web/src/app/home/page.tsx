'use client'

import React, { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import { gql } from '@apollo/client'
import { format } from 'date-fns'
import Navbar from '@/components/layout/Navbar'
import DailyAttendanceCard from '@/components/home/DailyAttendanceCard'
import SummaryCards from '@/components/home/SummaryCards'
import CalendarWidget from '@/components/home/CalendarWidget'
import SelectedDatePanel from '@/components/home/SelectedDatePanel'
import MembersList from '@/components/home/MembersList'
import { QUERIES } from '@/lib/graphql-queries'
import { useLoading } from '@/contexts/LoadingContext'

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

export default function HomePage() {
    const [selectedDate, setSelectedDate] = useState(new Date())
    const dateStr = format(new Date(), 'yyyy-MM-dd')

    const { data, loading, error } = useQuery<HomeDashboardResponse>(gql(QUERIES.GET_HOME_DASHBOARD_DATA), {
        variables: { date: dateStr },
        pollInterval: 60000 // Refresh every minute
    })

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

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Home Dashboard</h1>
                        <p className="text-gray-500 mt-1">Welcome back! Here's your daily overview.</p>
                    </div>
                    <div className="text-sm text-gray-500 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100">
                        {format(new Date(), 'EEEE, MMMM do, yyyy')}
                    </div>
                </div>

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

                        {/* Additional Quick Stats or Charts could go here */}
                        <div className="mt-6 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Weekly Activity</h3>
                            <div className="h-32 flex items-end justify-between space-x-2">
                                {[65, 80, 75, 90, 85, 40, 30].map((h, i) => (
                                    <div key={i} className="w-full bg-blue-100 rounded-t-lg relative group">
                                        <div
                                            className="absolute bottom-0 left-0 right-0 bg-blue-500 rounded-t-lg transition-all duration-500"
                                            style={{ height: `${h}%` }}
                                        ></div>
                                        <div className="absolute -bottom-6 left-0 right-0 text-center text-xs text-gray-500">
                                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                                        </div>
                                    </div>
                                ))}
                            </div>
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
            </main>
        </div>
    )
}
