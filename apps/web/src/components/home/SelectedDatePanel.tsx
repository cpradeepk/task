'use client'

import React, { useState } from 'react'
import { format, isFuture, isToday } from 'date-fns'
import { useQuery, useMutation } from '@apollo/client/react'
import { gql } from '@apollo/client'
import { Clock, Calendar, AlertCircle, CheckCircle, Edit2 } from 'lucide-react'
import { QUERIES, MUTATIONS } from '@/lib/graphql-queries'
import { useLoading } from '@/contexts/LoadingContext'

interface AttendanceData {
    id: string
    employeeId: string
    signInTime: string
    signOutTime: string
    workHours: number
    date: string
    status: string
    isManualEntry: boolean
    approvalStatus: string
}

interface AttendanceResponse {
    attendance: AttendanceData
}

interface SelectedDatePanelProps {
    date: Date
}

export default function SelectedDatePanel({ date }: SelectedDatePanelProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [manualSignIn, setManualSignIn] = useState('')
    const [manualSignOut, setManualSignOut] = useState('')
    const [reason, setReason] = useState('')

    const { showGlobalLoading, hideGlobalLoading } = useLoading()
    const dateStr = format(date, 'yyyy-MM-dd')

    const { data, loading, refetch } = useQuery<AttendanceResponse>(gql(QUERIES.GET_ATTENDANCE), {
        variables: { date: dateStr },
        fetchPolicy: 'network-only'
    })

    const [requestManualAttendance] = useMutation(gql(MUTATIONS.REQUEST_MANUAL_ATTENDANCE), {
        onCompleted: () => {
            refetch()
            setIsEditing(false)
            setReason('')
            setManualSignIn('')
            setManualSignOut('')
            hideGlobalLoading()
            alert('Manual attendance request submitted successfully')
        },
        onError: (err) => {
            console.error('Manual Attendance Error:', err)
            hideGlobalLoading()
            alert(err.message)
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!manualSignIn || !manualSignOut || !reason) {
            alert('Please fill in all fields')
            return
        }

        showGlobalLoading()

        // Combine date with time strings to create ISO strings
        const signInDateTime = new Date(`${dateStr}T${manualSignIn}:00`)
        const signOutDateTime = new Date(`${dateStr}T${manualSignOut}:00`)

        requestManualAttendance({
            variables: {
                input: {
                    date: dateStr,
                    signInTime: signInDateTime.toISOString(),
                    signOutTime: signOutDateTime.toISOString(),
                    reason
                }
            }
        })
    }

    const attendance = data?.attendance
    const isFutureDate = isFuture(date) && !isToday(date)

    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full animate-pulse">
                <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-3">
                    <div className="h-4 w-full bg-gray-200 rounded"></div>
                    <div className="h-4 w-2/3 bg-gray-200 rounded"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-800">
                    Details for {format(date, 'MMM d, yyyy')}
                </h3>
                {!isFutureDate && !attendance && !isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
                    >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Request Update
                    </button>
                )}
            </div>

            {isFutureDate ? (
                <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>Cannot view details for future dates</p>
                </div>
            ) : isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sign In Time</label>
                        <input
                            type="time"
                            value={manualSignIn}
                            onChange={(e) => setManualSignIn(e.target.value)}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sign Out Time</label>
                        <input
                            type="time"
                            value={manualSignOut}
                            onChange={(e) => setManualSignOut(e.target.value)}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            rows={3}
                            required
                            placeholder="Why are you requesting this update?"
                        />
                    </div>
                    <div className="flex space-x-3 pt-2">
                        <button
                            type="submit"
                            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                            Submit Request
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            ) : attendance ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-xl">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Sign In</p>
                            <p className="text-lg font-semibold text-gray-900">
                                {format(new Date(parseInt(attendance.signInTime)), 'hh:mm a')}
                            </p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Sign Out</p>
                            <p className="text-lg font-semibold text-gray-900">
                                {attendance.signOutTime
                                    ? format(new Date(parseInt(attendance.signOutTime)), 'hh:mm a')
                                    : '--:--'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                        <div className="flex items-center">
                            <Clock className="h-5 w-5 text-blue-600 mr-3" />
                            <div>
                                <p className="text-sm font-medium text-blue-900">Total Work Hours</p>
                                <p className="text-xs text-blue-700">Based on sign in/out times</p>
                            </div>
                        </div>
                        <span className="text-xl font-bold text-blue-900 font-mono">
                            {attendance.workHours ? attendance.workHours.toFixed(2) : '0.00'} hrs
                        </span>
                    </div>

                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Status</p>
                        <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${attendance.status === 'full_day' ? 'bg-green-100 text-green-800' :
                                attendance.status === 'half_day' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                }`}>
                                {attendance.status === 'full_day' ? 'Full Day' :
                                    attendance.status === 'half_day' ? 'Half Day' :
                                        attendance.status}
                            </span>
                            {attendance.isManualEntry && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                                    Manual Entry
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 mx-auto mb-3 text-yellow-500" />
                    <p className="text-gray-900 font-medium mb-1">No Attendance Record</p>
                    <p className="text-gray-500 text-sm">You were absent on this day.</p>
                </div>
            )}
        </div>
    )
}
