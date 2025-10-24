'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { 
  generateDailyReport, 
  generateMonthlyReport, 
  generateTeamTaskReport,
  formatReportDate,
  formatMonthYear
} from '@/lib/reports'
import { DailyReport, MonthlyReport } from '@/lib/types'
import {
  Calendar,
  Download,
  BarChart3,
  FileText
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'

export default function Reports() {
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'team'>('daily')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedYear, setSelectedYear] = useState(2024) // Use static year to avoid hydration mismatch
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([])
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([])
  const [teamReport, setTeamReport] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [error, setError] = useState('')
  const [maxDate, setMaxDate] = useState('')
  const router = useRouter()
  const currentUser = getCurrentUser()

  // Initialize client-side state to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true)

    // Set current year on client side
    setSelectedYear(new Date().getFullYear())

    // Set max date for date inputs
    setMaxDate(new Date().toISOString().split('T')[0])

    // Set default date to yesterday
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    setSelectedDate(yesterday.toISOString().split('T')[0])

    // Set default month to current month
    const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0')
    setSelectedMonth(currentMonth)
  }, [])

  useEffect(() => {
    if (!currentUser) {
      router.push('/')
      return
    }

    // Only allow top_management to access reports
    if (currentUser.role !== 'top_management') {
      router.push('/dashboard')
      return
    }
  }, [currentUser, router])

  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Date changed to:', e.target.value)
    setSelectedDate(e.target.value)
    setError('')
  }

  // Handle month change
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log('Month changed to:', e.target.value)
    setSelectedMonth(e.target.value)
    setError('')
  }

  // Handle year change
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(parseInt(e.target.value))
    setError('')
  }

  // Handle report type change
  const handleReportTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setReportType(e.target.value as 'daily' | 'monthly' | 'team')
    setError('')
    // Clear previous reports
    setDailyReports([])
    setMonthlyReports([])
    setTeamReport(null)
  }

  const generateReport = async () => {
    console.log('Generate report called with:', {
      reportType,
      selectedDate,
      selectedMonth,
      selectedYear
    })

    setIsLoading(true)
    setError('')

    try {
      // Validation
      if (reportType === 'daily' || reportType === 'team') {
        if (!selectedDate) {
          setError('Please select a date')
          return
        }
      }

      if (reportType === 'monthly') {
        if (!selectedMonth) {
          setError('Please select a month')
          return
        }
      }

      switch (reportType) {
        case 'daily':
          console.log('Generating daily report for:', selectedDate)
          const reports = await generateDailyReport(selectedDate)
          setDailyReports(reports)
          console.log('Daily reports generated:', reports.length)
          break
        case 'monthly':
          console.log('Generating monthly report for:', selectedMonth, selectedYear)
          const monthlyReports = await generateMonthlyReport(selectedMonth, selectedYear)
          setMonthlyReports(monthlyReports)
          console.log('Monthly reports generated:', monthlyReports.length)
          break
        case 'team':
          console.log('Generating team report for:', selectedDate)
          const teamReport = await generateTeamTaskReport(selectedDate, currentUser?.employeeId)
          setTeamReport(teamReport)
          console.log('Team report generated:', teamReport)
          break
      }
    } catch (error) {
      console.error('Error generating report:', error)
      setError(error instanceof Error ? error.message : 'Failed to generate report')
    } finally {
      setIsLoading(false)
    }
  }

  const exportReport = () => {
    // Simple CSV export functionality
    let csvContent = ''
    let filename = ''

    switch (reportType) {
      case 'daily':
        csvContent = 'Employee ID,Employee Name,Total Tasks,In Progress,Delayed,Completed,Hours Worked,MTD Tasks,MTD Hours\n'
        dailyReports.forEach(report => {
          csvContent += `${report.employeeId},${report.employeeName},${report.totalTasks},${report.tasksInProgress},${report.tasksDelayed},${report.tasksCompleted},${report.hoursWorked},${report.tasksCompletedMTD},${report.hoursMTD}\n`
        })
        filename = `daily-report-${selectedDate}.csv`
        break
      case 'monthly':
        csvContent = 'Employee ID,Employee Name,Total Leaves,Total WFH,Hours Worked,Warning Count\n'
        monthlyReports.forEach(report => {
          csvContent += `${report.employeeId},${report.employeeName},${report.totalLeaves},${report.totalWFH},${report.totalHoursWorked},${report.warningCount}\n`
        })
        filename = `monthly-report-${selectedMonth}-${selectedYear}.csv`
        break
    }

    if (csvContent) {
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      window.URL.revokeObjectURL(url)
    }
  }

  if (!currentUser) return null

  // Prevent hydration mismatch by waiting for client-side initialization
  if (!isClient) {
    return (
      <div>
        <Navbar />
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Navbar />
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black">Reports & Analytics</h1>
            <p className="text-gray-600 mt-1">Generate and view performance reports</p>
          </div>
        </div>

      {/* Report Controls */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Report Type
            </label>
            <select
              value={reportType}
              onChange={handleReportTypeChange}
              className="input-field"
            >
              <option value="daily">Daily Performance</option>
              <option value="monthly">Monthly Summary</option>
              <option value="team">Team Task Overview</option>
            </select>
          </div>

          {(reportType === 'daily' || reportType === 'team') && (
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="input-field pl-10"
                  max={maxDate}
                />
              </div>
            </div>
          )}

          {reportType === 'monthly' && (
            <>
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Month
                </label>
                <select
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  className="input-field"
                >
                  <option value="">Select Month</option>
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = (i + 1).toString().padStart(2, '0')
                    const monthName = new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'long' })
                    return (
                      <option key={month} value={month}>
                        {monthName}
                      </option>
                    )
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Year
                </label>
                <select
                  value={selectedYear}
                  onChange={handleYearChange}
                  className="input-field"
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - 2 + i
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    )
                  })}
                </select>
              </div>
            </>
          )}

          <div className="flex space-x-2">
            <button
              onClick={generateReport}
              disabled={isLoading}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50"
            >
              <BarChart3 className="h-4 w-4" />
              <span>{isLoading ? 'Generating...' : 'Generate'}</span>
            </button>
            {((reportType === 'daily' && dailyReports.length > 0) || 
              (reportType === 'monthly' && monthlyReports.length > 0)) && (
              <button
                onClick={exportReport}
                className="btn-secondary flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="text-red-600">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Daily Performance Report */}
      {reportType === 'daily' && dailyReports.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-black mb-4">
            Daily Performance Report - {formatReportDate(selectedDate)}
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Total Tasks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    In Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delayed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours Worked
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    MTD Tasks
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dailyReports.map((report) => (
                  <tr key={report.employeeId}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-black">
                          {report.employeeName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {report.employeeId}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                      {report.totalTasks}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                      {report.tasksInProgress}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                      {report.tasksCompleted}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                      {report.tasksDelayed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                      {report.hoursWorked}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                      {report.tasksCompletedMTD} ({report.hoursMTD}h)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Data Message for Daily Report */}
      {reportType === 'daily' && !isLoading && dailyReports.length === 0 && selectedDate && !error && (
        <div className="card">
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-600">
              No performance data found for {formatReportDate(selectedDate)}.
              This could mean no tasks were worked on this date.
            </p>
          </div>
        </div>
      )}

      {/* Monthly Summary Report */}
      {reportType === 'monthly' && monthlyReports.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-black mb-4">
            Monthly Summary Report - {formatMonthYear(selectedMonth, selectedYear)}
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Leaves
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total WFH
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours Worked
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Warning Count
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {monthlyReports.map((report) => (
                  <tr key={report.employeeId}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-black">
                          {report.employeeName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {report.employeeId}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                      {report.totalLeaves}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                      {report.totalWFH}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                      {report.totalHoursWorked}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        report.warningCount === 0 ? 'bg-green-100 text-green-800' :
                        report.warningCount <= 2 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {report.warningCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Data Message for Monthly Report */}
      {reportType === 'monthly' && !isLoading && monthlyReports.length === 0 && selectedMonth && !error && (
        <div className="card">
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-600">
              No monthly data found for {formatMonthYear(selectedMonth, selectedYear)}.
            </p>
          </div>
        </div>
      )}

      {/* Team Task Overview Report */}
      {reportType === 'team' && teamReport && (
        <div className="card">
          <h3 className="text-lg font-semibold text-black mb-4">
            Team Task Overview - {formatReportDate(selectedDate)}
          </h3>
          <div className="space-y-6">
            {teamReport.teamTasks.map((member: any) => (
              <div key={member.employeeId} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-black">
                    {member.employeeName} ({member.employeeId})
                  </h4>
                  <span className="text-sm text-gray-600">
                    {member.tasks.length} tasks
                  </span>
                </div>
                <div className="grid gap-2">
                  {member.tasks.map((task: any) => (
                    <div key={task.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-black">{task.description}</p>
                        <p className="text-xs text-gray-600">{task.taskId}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          task.status === 'Done' ? 'bg-green-100 text-green-800' :
                          task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                          task.status === 'Delayed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {task.status}
                        </span>
                        <span className="text-xs text-gray-600">
                          {task.actualHours || 0}h / {task.estimatedHours}h
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Data Message for Team Report */}
      {reportType === 'team' && !isLoading && (!teamReport || teamReport.teamTasks.length === 0) && selectedDate && !error && (
        <div className="card">
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Team Data Available</h3>
            <p className="text-gray-600">
              No team task data found for {formatReportDate(selectedDate)}.
            </p>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
