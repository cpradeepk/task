'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import { gql } from '@apollo/client'
import { format } from 'date-fns'
import { Clock, LogIn, LogOut, Calendar, AlertCircle, CheckCircle } from 'lucide-react'
import { QUERIES, MUTATIONS } from '@/lib/graphql-queries'
import { useLoading } from '@/contexts/LoadingContext'

interface AttendanceData {
    id: string
    employeeId: string
    signInTime: string
    signOutTime: string
    signInLocation?: string
    signOutLocation?: string
    workHours: number
    date: string
    status: string
    isManualEntry: boolean
    approvalStatus: string
    signOutUndoneAt?: string
    signOutUndoneBy?: string
}

interface AttendanceResponse {
    attendance: AttendanceData
}

export default function DailyAttendanceCard() {
    const [currentTime, setCurrentTime] = useState(new Date())
    const [workDuration, setWorkDuration] = useState<string>('00:00:00')
    const { showGlobalLoading, hideGlobalLoading } = useLoading()

    // Update clock every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date())
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    // Get today's date string for query
    const todayDate = format(new Date(), 'yyyy-MM-dd')

    // Fetch attendance data
    const { data, loading, error, refetch } = useQuery<AttendanceResponse>(gql(QUERIES.GET_ATTENDANCE), {
        variables: { date: todayDate },
        fetchPolicy: 'network-only',
        pollInterval: 60000 // Poll every minute to keep in sync
    })

    const attendance = data?.attendance

    // Calculate work duration if signed in but not signed out
    useEffect(() => {
        if (attendance?.signInTime && !attendance.signOutTime) {
            const interval = setInterval(() => {
                const start = new Date(parseInt(attendance.signInTime))
                const now = new Date()
                const diff = now.getTime() - start.getTime()

                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                const seconds = Math.floor((diff % (1000 * 60)) / 1000)

                setWorkDuration(
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                )
            }, 1000)
            return () => clearInterval(interval)
        } else if (attendance?.workHours) {
            // If already signed out, show final work hours
            const hours = Math.floor(attendance.workHours)
            const minutes = Math.floor((attendance.workHours - hours) * 60)
            setWorkDuration(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`)
        } else {
            setWorkDuration('00:00:00')
        }
    }, [attendance])

    // Mutations
    const [signIn] = useMutation(gql(MUTATIONS.SIGN_IN), {
        onCompleted: () => {
            refetch()
            hideGlobalLoading()
        },
        onError: (err) => {
            console.error('Sign In Error:', err)
            hideGlobalLoading()
            alert(err.message)
        }
    })

    const [signOut] = useMutation(gql(MUTATIONS.SIGN_OUT), {
        onCompleted: () => {
            refetch()
            hideGlobalLoading()
        },
        onError: (err) => {
            console.error('Sign Out Error:', err)
            hideGlobalLoading()
            alert(err.message)
        }
    })

    const [undoSignOut] = useMutation(gql(MUTATIONS.UNDO_SIGN_OUT), {
        onCompleted: () => {
            refetch()
            hideGlobalLoading()
        },
        onError: (err) => {
            console.error('Undo Sign Out Error:', err)
            hideGlobalLoading()
            alert(err.message)
        }
    })

    const handleSignIn = () => {
        showGlobalLoading()
        signIn()
    }

    const handleSignOut = () => {
        if (confirm('Are you sure you want to sign out for the day?')) {
            showGlobalLoading()
            signOut()
        }
    }

    const handleUndoSignOut = () => {
        showGlobalLoading()
        undoSignOut({ variables: { date: todayDate } })
    }

    // Check if undo is available (within 2 hours of sign-out)
    const canUndoSignOut = () => {
        if (!attendance?.signOutTime) return false
        const signOutTime = new Date(parseInt(attendance.signOutTime))
        const now = new Date()
        const hoursSinceSignOut = (now.getTime() - signOutTime.getTime()) / (1000 * 60 * 60)
        return hoursSinceSignOut <= 2 // TODO: Get from settings
    }

    if (loading && !attendance) {
        return (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-8 w-32 bg-gray-200 rounded mb-4"></div>
                    <div className="h-12 w-48 bg-gray-200 rounded"></div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full flex flex-col items-center justify-center text-red-500">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>Failed to load attendance data</p>
                <button onClick={() => refetch()} className="mt-2 text-sm underline">Retry</button>
            </div>
        )
    }

    // Determine states: null = Not Signed In, signInTime && !signOutTime = Active, signInTime && signOutTime = Completed
    const isNotSignedIn = !attendance
    const isSignedOut = !!attendance?.signOutTime
    const isSignedIn = !!attendance?.signInTime && !isSignedOut

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-50 rounded-full opacity-50 blur-xl"></div>

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                            <Clock className="h-5 w-5 mr-2 text-blue-600" />
                            Daily Attendance
                        </h3>
                        <div className="text-sm font-medium text-gray-500 bg-gray-50 px-3 py-1 rounded-full flex items-center">
                            <Calendar className="h-3 w-3 mr-1.5" />
                            {format(currentTime, 'EEE, MMM d')}
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center py-6">
                        <div className="text-5xl font-bold text-gray-900 tracking-tight mb-2 font-mono">
                            {format(currentTime, 'HH:mm:ss')}
                        </div>
                        <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Current Time</p>
                    </div>

                    <div className="bg-blue-50 rounded-xl p-4 mb-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider mb-1">Work Hours</p>
                                <p className="text-2xl font-bold text-blue-900 font-mono">{workDuration}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider mb-1">Status</p>
                                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isSignedIn ? 'bg-green-100 text-green-800' :
                                    isSignedOut ? 'bg-gray-100 text-gray-800' :
                                        'bg-yellow-100 text-yellow-800'
                                    }`}>
                                    {isSignedIn ? 'Working' : isSignedOut ? 'Completed' : 'Not Started'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    {/* System Admin Check - Hide Sign In/Out Buttons */}
                    {attendance?.employeeId === 'AM-0001' ? (
                        <div className="w-full flex items-center justify-center py-3 px-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-600 text-sm font-medium">
                            <AlertCircle className="h-5 w-5 mr-2" />
                            Attendance tracking disabled for System Admin
                        </div>
                    ) : isNotSignedIn ? (
                        <button
                            onClick={handleSignIn}
                            className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-[1.02]"
                        >
                            <LogIn className="h-5 w-5 mr-2" />
                            Sign In
                        </button>
                    ) : isSignedIn ? (
                        <button
                            onClick={handleSignOut}
                            className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 transform hover:scale-[1.02]"
                        >
                            <LogOut className="h-5 w-5 mr-2" />
                            Sign Out
                        </button>
                    ) : (
                        <div className="space-y-2">
                            <div className="w-full flex items-center justify-center py-3 px-4 bg-green-50 border border-green-100 rounded-xl text-green-700 text-sm font-medium">
                                <CheckCircle className="h-5 w-5 mr-2" />
                                Attendance Completed
                            </div>
                            {canUndoSignOut() && (
                                <button
                                    onClick={handleUndoSignOut}
                                    className="w-full flex items-center justify-center py-2 px-4 border border-orange-300 rounded-xl shadow-sm text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200"
                                >
                                    <AlertCircle className="h-4 w-4 mr-2" />
                                    Undo Sign Out
                                </button>
                            )}
                        </div>
                    )}

                    {attendance?.signInTime && (
                        <div className="mt-3 space-y-1">
                            <div className="flex justify-between text-xs text-gray-500 px-1">
                                <span>In: {format(new Date(parseInt(attendance.signInTime)), 'hh:mm a')}</span>
                                {attendance.signOutTime && (
                                    <span>Out: {format(new Date(parseInt(attendance.signOutTime)), 'hh:mm a')}</span>
                                )}
                            </div>
                            {(attendance.signInLocation || attendance.signOutLocation) && (
                                <div className="text-xs text-gray-400 px-1">
                                    {attendance.signInLocation && <div>📍 In: {attendance.signInLocation}</div>}
                                    {attendance.signOutLocation && <div>📍 Out: {attendance.signOutLocation}</div>}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
