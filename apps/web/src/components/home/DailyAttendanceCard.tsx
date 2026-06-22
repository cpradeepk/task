'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import { gql } from '@apollo/client'
import { format } from 'date-fns'
import { Clock, LogIn, LogOut, Calendar, AlertCircle, CheckCircle, Edit3, X } from 'lucide-react'
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

const parseTimeSafe = (timeStr: string | null | undefined): Date | null => {
    if (!timeStr) return null
    if (/^\d+$/.test(timeStr)) {
        return new Date(parseInt(timeStr, 10))
    }
    const d = new Date(timeStr)
    return isNaN(d.getTime()) ? null : d
}

export default function DailyAttendanceCard() {
    const [currentTime, setCurrentTime] = useState(new Date())
    const [workDuration, setWorkDuration] = useState<string>('00:00:00')
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editType, setEditType] = useState<'SIGN_IN_EDIT' | 'SIGN_OUT_EDIT' | 'MISSING_ENTRY'>('SIGN_IN_EDIT')
    const [editDate, setEditDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [editTime, setEditTime] = useState('')
    const [editReason, setEditReason] = useState('')
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
                const start = parseTimeSafe(attendance.signInTime)
                if (start) {
                    const now = new Date()
                    const diff = now.getTime() - start.getTime()

                    const hours = Math.floor(diff / (1000 * 60 * 60))
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

                    setWorkDuration(
                        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                    )
                }
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
            console.warn('Sign In Error:', err)
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
            console.warn('Sign Out Error:', err)
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
            console.warn('Undo Sign Out Error:', err)
            hideGlobalLoading()
            alert(err.message)
        }
    })

    const [requestAttendanceEdit] = useMutation(gql`
        mutation RequestAttendanceEdit($input: AttendanceRequestInput!) {
            requestAttendanceEdit(input: $input) {
                id
                status
            }
        }
    `, {
        onCompleted: () => {
            hideGlobalLoading()
            alert('Attendance edit request submitted successfully!')
            setIsEditModalOpen(false)
            setEditDate(format(new Date(), 'yyyy-MM-dd'))
            setEditTime('')
            setEditReason('')
        },
        onError: (err) => {
            console.warn('Request Edit Error:', err)
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

    const handleEditRequest = () => {
        if (!editTime) {
            alert('Please select a time')
            return
        }

        showGlobalLoading()
        const originalTime = editType === 'SIGN_IN_EDIT' ? attendance?.signInTime :
            editType === 'SIGN_OUT_EDIT' ? attendance?.signOutTime : null
        const originalTimeDate = parseTimeSafe(originalTime)

        requestAttendanceEdit({
            variables: {
                input: {
                    attendanceDate: editDate,
                    requestType: editType,
                    originalTime: originalTimeDate ? originalTimeDate.toISOString() : null,
                    newTime: new Date(`${editDate}T${editTime}`).toISOString(),
                    reason: editReason
                }
            }
        })
    }

    // Check if undo is available (within 2 hours of sign-out)
    const canUndoSignOut = () => {
        if (!attendance?.signOutTime) return false
        const signOutTime = parseTimeSafe(attendance.signOutTime)
        if (!signOutTime) return false
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
                    {isNotSignedIn ? (
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

                    {/* Edit Attendance Button - Always show for today */}
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="w-full mt-2 flex items-center justify-center py-2 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                    >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Request Attendance Edit
                    </button>

                    {attendance?.signInTime && (
                        <div className="mt-3 space-y-1">
                            <div className="flex justify-between text-xs text-gray-500 px-1">
                                <span>In: {(() => {
                                    const d = parseTimeSafe(attendance.signInTime);
                                    return d ? format(d, 'hh:mm a') : '--:--';
                                })()}</span>
                                {attendance.signOutTime && (
                                    <span>Out: {(() => {
                                        const d = parseTimeSafe(attendance.signOutTime);
                                        return d ? format(d, 'hh:mm a') : '--:--';
                                    })()}</span>
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

            {/* Edit Attendance Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">Request Attendance Edit</h3>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Request Type
                                </label>
                                <select
                                    value={editType}
                                    onChange={(e) => setEditType(e.target.value as any)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="SIGN_IN_EDIT">Edit Sign In Time</option>
                                    <option value="SIGN_OUT_EDIT">Edit Sign Out Time</option>
                                    <option value="MISSING_ENTRY">Add Missing Entry</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={editDate}
                                    onChange={(e) => setEditDate(e.target.value)}
                                    max={format(new Date(), 'yyyy-MM-dd')}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    New Time
                                </label>
                                <input
                                    type="time"
                                    value={editTime}
                                    onChange={(e) => setEditTime(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Reason (Optional)
                                </label>
                                <textarea
                                    value={editReason}
                                    onChange={(e) => setEditReason(e.target.value)}
                                    rows={3}
                                    placeholder="Explain why you need to edit your attendance..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {attendance && (
                                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                                    <p className="text-gray-600 mb-1">Current Times:</p>
                                    {attendance.signInTime && (
                                        <p className="text-gray-900">Sign In: {(() => {
                                            const d = parseTimeSafe(attendance.signInTime);
                                            return d ? format(d, 'hh:mm a') : '--:--';
                                        })()}</p>
                                    )}
                                    {attendance.signOutTime && (
                                        <p className="text-gray-900">Sign Out: {(() => {
                                            const d = parseTimeSafe(attendance.signOutTime);
                                            return d ? format(d, 'hh:mm a') : '--:--';
                                        })()}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEditRequest}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Submit Request
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
