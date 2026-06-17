'use client'

import React, { useState } from 'react'
import { format, isFuture, isToday } from 'date-fns'
import { useQuery, useMutation } from '@apollo/client/react'
import { gql } from '@apollo/client'
import { Clock, Calendar, AlertCircle, Edit2, LogIn, LogOut } from 'lucide-react'
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

const parseTimeSafe = (timeStr: string | null | undefined): Date | null => {
    if (!timeStr) return null
    if (/^\d+$/.test(timeStr)) {
        return new Date(parseInt(timeStr, 10))
    }
    const d = new Date(timeStr)
    return isNaN(d.getTime()) ? null : d
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

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'full_day':
                return {
                    label: 'Full Day',
                    bgClass: 'bg-green-50',
                    textClass: 'text-green-700',
                    dotClass: 'bg-green-500',
                    iconBg: 'bg-green-100',
                    iconColor: 'text-green-600'
                }
            case 'half_day':
                return {
                    label: 'Half Day',
                    bgClass: 'bg-yellow-50',
                    textClass: 'text-yellow-700',
                    dotClass: 'bg-yellow-500',
                    iconBg: 'bg-yellow-100',
                    iconColor: 'text-yellow-600'
                }
            default:
                return {
                    label: status,
                    bgClass: 'bg-red-50',
                    textClass: 'text-red-700',
                    dotClass: 'bg-red-500',
                    iconBg: 'bg-red-100',
                    iconColor: 'text-red-600'
                }
        }
    }

    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">
                <div className="animate-pulse space-y-5">
                    <div className="flex items-center justify-between">
                        <div className="h-5 w-40 bg-gray-200 rounded-lg"></div>
                        <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="h-20 bg-gray-100 rounded-xl"></div>
                        <div className="h-20 bg-gray-100 rounded-xl"></div>
                    </div>
                    <div className="h-16 bg-gray-100 rounded-xl"></div>
                    <div className="h-10 bg-gray-100 rounded-xl"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-5 pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                            <Calendar className="h-4.5 w-4.5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 leading-tight">
                                {format(date, 'EEEE')}
                            </h3>
                            <p className="text-xs text-gray-500">
                                {format(date, 'MMM d, yyyy')}
                            </p>
                        </div>
                    </div>
                    {!isFutureDate && !attendance && !isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="h-8 w-8 rounded-lg bg-gray-50 hover:bg-blue-50 flex items-center justify-center text-gray-400 hover:text-blue-600 transition-all duration-200"
                            title="Request Update"
                        >
                            <Edit2 className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Divider */}
            <div className="mx-6 h-px bg-gray-100"></div>

            {/* Content */}
            <div className="flex-1 px-6 py-4 overflow-y-auto">
                {isFutureDate ? (
                    <div className="flex flex-col items-center justify-center h-full py-8">
                        <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                            <Calendar className="h-7 w-7 text-gray-300" />
                        </div>
                        <p className="text-sm font-medium text-gray-400 text-center">
                            Future date selected
                        </p>
                        <p className="text-xs text-gray-300 mt-1 text-center">
                            Details unavailable for upcoming dates
                        </p>
                    </div>
                ) : isEditing ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Sign In Time</label>
                            <input
                                type="time"
                                value={manualSignIn}
                                onChange={(e) => setManualSignIn(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Sign Out Time</label>
                            <input
                                type="time"
                                value={manualSignOut}
                                onChange={(e) => setManualSignOut(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Reason</label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200 outline-none resize-none"
                                rows={3}
                                required
                                placeholder="Why are you requesting this update?"
                            />
                        </div>
                        <div className="flex space-x-2.5 pt-1">
                            <button
                                type="submit"
                                className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-xl hover:bg-blue-700 transition-all duration-200 text-sm font-semibold shadow-sm hover:shadow-md"
                            >
                                Submit
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="flex-1 bg-gray-100 text-gray-600 py-2.5 px-4 rounded-xl hover:bg-gray-200 transition-all duration-200 text-sm font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                ) : attendance ? (
                    <div className="space-y-4">
                        {/* Sign In / Sign Out Cards */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-green-50 rounded-xl p-3.5 border border-green-100/50">
                                <div className="flex items-center space-x-1.5 mb-2">
                                    <LogIn className="h-3.5 w-3.5 text-green-500" />
                                    <p className="text-[11px] font-semibold text-green-600 uppercase tracking-wider">Sign In</p>
                                </div>
                                <p className="text-lg font-bold text-gray-900 font-mono">
                                    {(() => {
                                        const d = parseTimeSafe(attendance.signInTime);
                                        return d ? format(d, 'hh:mm a') : '--:--';
                                    })()}
                                </p>
                            </div>
                            <div className="bg-red-50 rounded-xl p-3.5 border border-red-100/50">
                                <div className="flex items-center space-x-1.5 mb-2">
                                    <LogOut className="h-3.5 w-3.5 text-red-500" />
                                    <p className="text-[11px] font-semibold text-red-600 uppercase tracking-wider">Sign Out</p>
                                </div>
                                <p className="text-lg font-bold text-gray-900 font-mono">
                                    {(() => {
                                        const d = parseTimeSafe(attendance.signOutTime);
                                        return d ? format(d, 'hh:mm a') : '--:--';
                                    })()}
                                </p>
                            </div>
                        </div>

                        {/* Work Hours Banner */}
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                        <Clock className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Work Hours</p>
                                        <p className="text-[11px] text-blue-500 mt-0.5">Based on sign in/out</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-bold text-blue-900 font-mono">
                                        {attendance.workHours ? attendance.workHours.toFixed(1) : '0.0'}
                                    </span>
                                    <span className="text-xs font-medium text-blue-500 ml-1">hrs</span>
                                </div>
                            </div>
                        </div>

                        {/* Status & Tags */}
                        <div className="flex items-center flex-wrap gap-2">
                            {(() => {
                                const config = getStatusConfig(attendance.status)
                                return (
                                    <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold ${config.bgClass} ${config.textClass}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass} mr-1.5`}></span>
                                        {config.label}
                                    </span>
                                )
                            })()}
                            {attendance.isManualEntry && (
                                <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700">
                                    <Edit2 className="h-3 w-3 mr-1.5" />
                                    Manual
                                </span>
                            )}
                            {attendance.approvalStatus && attendance.approvalStatus !== 'approved' && (
                                <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-yellow-50 text-yellow-700">
                                    <AlertCircle className="h-3 w-3 mr-1.5" />
                                    {attendance.approvalStatus}
                                </span>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full py-8">
                        <div className="w-16 h-16 rounded-2xl bg-yellow-50 flex items-center justify-center mb-4">
                            <AlertCircle className="h-7 w-7 text-yellow-400" />
                        </div>
                        <p className="text-sm font-semibold text-gray-700 text-center">No Record Found</p>
                        <p className="text-xs text-gray-400 mt-1 text-center">
                            You were absent on this day
                        </p>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="mt-4 inline-flex items-center px-4 py-2 rounded-xl bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition-all duration-200"
                        >
                            <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                            Request Update
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
