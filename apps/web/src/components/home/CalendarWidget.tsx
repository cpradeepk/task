'use client'

import React, { useState, useEffect } from 'react'
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    isToday
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useQuery } from '@apollo/client/react'
import { gql } from '@apollo/client'
import { QUERIES } from '@/lib/graphql-queries'

interface AttendanceRecord {
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

interface MonthlyAttendanceResponse {
    monthlyAttendance: AttendanceRecord[]
}

interface CalendarWidgetProps {
    onDateSelect: (date: Date) => void
    selectedDate: Date
}

export default function CalendarWidget({ onDateSelect, selectedDate }: CalendarWidgetProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date())

    // Fetch monthly attendance data
    const { data, loading } = useQuery<MonthlyAttendanceResponse>(gql(QUERIES.GET_MONTHLY_ATTENDANCE), {
        variables: { year: currentMonth.getFullYear(), month: currentMonth.getMonth() + 1 },
        fetchPolicy: 'cache-and-network'
    })

    const attendanceMap = React.useMemo(() => {
        const map = new Map()
        if (data?.monthlyAttendance) {
            data.monthlyAttendance.forEach((record: any) => {
                map.set(record.date, record)
            })
        }
        return map
    }, [data])

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate
    })

    const getStatusColor = (day: Date) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const record = attendanceMap.get(dateStr)

        if (!record) return null

        switch (record.status) {
            case 'full_day': return 'bg-green-500'
            case 'half_day': return 'bg-yellow-500'
            case 'absent': return 'bg-red-500'
            case 'leave': return 'bg-blue-500' // Assuming 'leave' status exists or handled differently
            default: return 'bg-gray-400'
        }
    }

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-800">
                    {format(currentMonth, 'MMMM yyyy')}
                </h3>
                <div className="flex space-x-2">
                    <button
                        onClick={prevMonth}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5 text-gray-600" />
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ChevronRight className="h-5 w-5 text-gray-600" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider py-2">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, dayIdx) => {
                    const isSelected = isSameDay(day, selectedDate)
                    const isCurrentMonth = isSameMonth(day, currentMonth)
                    const statusColor = getStatusColor(day)
                    const isTodayDate = isToday(day)

                    return (
                        <button
                            key={day.toString()}
                            onClick={() => onDateSelect(day)}
                            className={`
                relative h-10 w-full flex items-center justify-center rounded-lg text-sm transition-all duration-200
                ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                ${isSelected ? 'bg-blue-600 text-white shadow-md transform scale-105' : 'hover:bg-gray-50'}
                ${isTodayDate && !isSelected ? 'border border-blue-200 font-semibold text-blue-600' : ''}
              `}
                        >
                            <span>{format(day, 'd')}</span>
                            {statusColor && !isSelected && (
                                <span className={`absolute bottom-1.5 left-1/2 transform -translate-x-1/2 h-1 w-1 rounded-full ${statusColor}`}></span>
                            )}
                        </button>
                    )
                })}
            </div>

            <div className="mt-6 flex items-center justify-center space-x-4 text-xs text-gray-500">
                <div className="flex items-center">
                    <span className="h-2 w-2 rounded-full bg-green-500 mr-1.5"></span>
                    Present
                </div>
                <div className="flex items-center">
                    <span className="h-2 w-2 rounded-full bg-yellow-500 mr-1.5"></span>
                    Half Day
                </div>
                <div className="flex items-center">
                    <span className="h-2 w-2 rounded-full bg-red-500 mr-1.5"></span>
                    Absent
                </div>
            </div>
        </div>
    )
}
