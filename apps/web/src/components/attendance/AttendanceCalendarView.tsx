'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Download, Search, Filter } from 'lucide-react'

interface AttendanceCalendarViewProps {
    teamMembers?: string[]
}

interface CalendarEmployee {
    employeeId: string
    name: string
    department: string
    role: string
}

interface CalendarRecord {
    employeeId: string
    date: string
    status: string
    signInTime: string | null
    signOutTime: string | null
    workHours: number | null
    location: string | null
    leaveType: string | null
    wfhType: string | null
}

interface CalendarData {
    employees: CalendarEmployee[]
    records: CalendarRecord[]
    pagination: {
        total: number
        page: number
        limit: number
        hasMore: boolean
    }
}

const ATTENDANCE_CALENDAR_QUERY = `
  query AttendanceCalendar(
    $startDate: String!
    $endDate: String!
    $department: String
    $teamMembers: [String!]
    $search: String
    $page: Int
    $limit: Int
  ) {
    attendanceCalendar(
      startDate: $startDate
      endDate: $endDate
      department: $department
      teamMembers: $teamMembers
      search: $search
      page: $page
      limit: $limit
    ) {
      employees {
        employeeId
        name
        department
        role
      }
      records {
        employeeId
        date
        status
        signInTime
        signOutTime
        workHours
        location
        leaveType
        wfhType
      }
      pagination {
        total
        page
        limit
        hasMore
      }
    }
  }
`

const getStatusColor = (status: string) => {
    switch (status) {
        case 'PRESENT':
            return 'bg-green-100 text-green-800 border-green-200'
        case 'ONLINE':
            return 'bg-blue-100 text-blue-800 border-blue-200'
        case 'ABSENT':
            return 'bg-red-100 text-red-800 border-red-200'
        case 'ON_LEAVE':
            return 'bg-yellow-100 text-yellow-800 border-yellow-200'
        case 'WFH':
            return 'bg-purple-100 text-purple-800 border-purple-200'
        case 'HALF_DAY':
            return 'bg-orange-100 text-orange-800 border-orange-200'
        case 'WEEKEND':
            return 'bg-gray-100 text-gray-600 border-gray-200'
        default:
            return 'bg-gray-50 text-gray-500 border-gray-100'
    }
}

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'PRESENT': return 'P'
        case 'ONLINE': return 'O'
        case 'ABSENT': return 'A'
        case 'ON_LEAVE': return 'L'
        case 'WFH': return 'W'
        case 'HALF_DAY': return 'H'
        case 'WEEKEND': return '-'
        default: return '?'
    }
}

export default function AttendanceCalendarView({ teamMembers }: AttendanceCalendarViewProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [calendarData, setCalendarData] = useState<CalendarData | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [selectedCell, setSelectedCell] = useState<CalendarRecord | null>(null)
    const [department, setDepartment] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [page, setPage] = useState(1)
    const [showFilters, setShowFilters] = useState(false)

    const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
    const dates = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })

    useEffect(() => {
        fetchCalendarData()
    }, [currentMonth, department, searchQuery, page, teamMembers])

    const fetchCalendarData = async () => {
        setIsLoading(true)
        try {
            const response = await fetch('/api/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: ATTENDANCE_CALENDAR_QUERY,
                    variables: {
                        startDate,
                        endDate,
                        department: department || null,
                        teamMembers: teamMembers || null,
                        search: searchQuery || null,
                        page,
                        limit: 20
                    }
                })
            })

            const result = await response.json()
            if (result.data?.attendanceCalendar) {
                setCalendarData(result.data.attendanceCalendar)
            }
        } catch (error) {
            console.error('Error fetching calendar data:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const getRecordForCell = (employeeId: string, date: string): CalendarRecord | undefined => {
        return calendarData?.records.find(
            r => r.employeeId === employeeId && r.date === date
        )
    }

    const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
    const handleToday = () => setCurrentMonth(new Date())

    const exportToCSV = () => {
        if (!calendarData) return

        const headers = ['Employee ID', 'Name', 'Department', ...dates.map(d => format(d, 'dd MMM'))]
        const rows = calendarData.employees.map(emp => {
            const row = [emp.employeeId, emp.name, emp.department]
            dates.forEach(date => {
                const dateStr = format(date, 'yyyy-MM-dd')
                const record = getRecordForCell(emp.employeeId, dateStr)
                row.push(record?.status || 'N/A')
            })
            return row
        })

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `attendance-${format(currentMonth, 'yyyy-MM')}.csv`
        a.click()
    }

    return (
        <div className="space-y-4">
            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePrevMonth}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl font-semibold min-w-[200px] text-center">
                        {format(currentMonth, 'MMMM yyyy')}
                    </h2>
                    <button
                        onClick={handleNextMonth}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleToday}
                        className="ml-2 px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                        Today
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <Filter className="w-5 h-5" />
                    </button>
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Export CSV</span>
                    </button>
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Search Employee
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Name or ID..."
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Department
                            </label>
                            <input
                                type="text"
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                                placeholder="Filter by department..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Calendar Grid */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="inline-block min-w-full align-middle">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th className="sticky left-0 z-20 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                                        Employee
                                    </th>
                                    {dates.map(date => (
                                        <th
                                            key={date.toISOString()}
                                            className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase"
                                        >
                                            <div>{format(date, 'EEE')}</div>
                                            <div className="font-bold text-gray-900">{format(date, 'd')}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={dates.length + 1} className="px-4 py-8 text-center text-gray-500">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : calendarData?.employees.length === 0 ? (
                                    <tr>
                                        <td colSpan={dates.length + 1} className="px-4 py-8 text-center text-gray-500">
                                            No employees found
                                        </td>
                                    </tr>
                                ) : (
                                    calendarData?.employees.map(employee => (
                                        <tr key={employee.employeeId} className="hover:bg-gray-50">
                                            <td className="sticky left-0 z-10 bg-white px-4 py-3 border-r border-gray-200">
                                                <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                                                <div className="text-xs text-gray-500">{employee.department}</div>
                                            </td>
                                            {dates.map(date => {
                                                const dateStr = format(date, 'yyyy-MM-dd')
                                                const record = getRecordForCell(employee.employeeId, dateStr)
                                                const status = record?.status || 'ABSENT'

                                                return (
                                                    <td
                                                        key={dateStr}
                                                        className="px-1 py-2 text-center cursor-pointer"
                                                        onClick={() => record && setSelectedCell(record)}
                                                    >
                                                        <div
                                                            className={`w-8 h-8 mx-auto flex items-center justify-center rounded border text-xs font-medium ${getStatusColor(status)}`}
                                                            title={status}
                                                        >
                                                            {getStatusLabel(status)}
                                                        </div>
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {calendarData && calendarData.pagination.total > 20 && (
                    <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                            Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, calendarData.pagination.total)} of {calendarData.pagination.total} employees
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={!calendarData.pagination.hasMore}
                                className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Status Legend</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {[
                        { status: 'PRESENT', label: 'Present' },
                        { status: 'ONLINE', label: 'Online' },
                        { status: 'ABSENT', label: 'Absent' },
                        { status: 'ON_LEAVE', label: 'On Leave' },
                        { status: 'WFH', label: 'Work From Home' },
                        { status: 'HALF_DAY', label: 'Half Day' },
                        { status: 'WEEKEND', label: 'Weekend' }
                    ].map(({ status, label }) => (
                        <div key={status} className="flex items-center gap-2">
                            <div className={`w-6 h-6 flex items-center justify-center rounded border text-xs font-medium ${getStatusColor(status)}`}>
                                {getStatusLabel(status)}
                            </div>
                            <span className="text-xs text-gray-600">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Detail Modal */}
            {selectedCell && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">Attendance Details</h3>
                            <button
                                onClick={() => setSelectedCell(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-6 space-y-3">
                            <div>
                                <p className="text-sm text-gray-500">Date</p>
                                <p className="font-medium">{format(new Date(selectedCell.date), 'EEEE, MMMM d, yyyy')}</p>
                            </div>

                            <div>
                                <p className="text-sm text-gray-500">Status</p>
                                <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${getStatusColor(selectedCell.status)}`}>
                                    {selectedCell.status}
                                </span>
                            </div>

                            {selectedCell.signInTime && (
                                <div>
                                    <p className="text-sm text-gray-500">Sign In</p>
                                    <p className="font-medium">{selectedCell.signInTime}</p>
                                </div>
                            )}

                            {selectedCell.signOutTime && (
                                <div>
                                    <p className="text-sm text-gray-500">Sign Out</p>
                                    <p className="font-medium">{selectedCell.signOutTime}</p>
                                </div>
                            )}

                            {selectedCell.workHours !== null && (
                                <div>
                                    <p className="text-sm text-gray-500">Work Hours</p>
                                    <p className="font-medium">{selectedCell.workHours.toFixed(2)} hours</p>
                                </div>
                            )}

                            {selectedCell.location && (
                                <div>
                                    <p className="text-sm text-gray-500">Location</p>
                                    <p className="font-medium">{selectedCell.location}</p>
                                </div>
                            )}

                            {selectedCell.leaveType && (
                                <div>
                                    <p className="text-sm text-gray-500">Leave Type</p>
                                    <p className="font-medium">{selectedCell.leaveType}</p>
                                </div>
                            )}

                            {selectedCell.wfhType && (
                                <div>
                                    <p className="text-sm text-gray-500">WFH Type</p>
                                    <p className="font-medium">{selectedCell.wfhType}</p>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                            <button
                                onClick={() => setSelectedCell(null)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
