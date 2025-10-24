'use client'

import React, { useEffect, useState } from 'react'
import { Clock, AlertTriangle, CheckCircle, Calendar } from 'lucide-react'
import { DateUtils } from '@/lib/dateUtils'

interface WorkHoursReportProps {
  date?: string // Optional date, defaults to yesterday
  showAllEmployees?: boolean // For management view
}

interface WorkHoursData {
  employeeId: string
  employeeName: string
  requiredHours: number
  actualHours: number
  deficit: number
  status: 'compliant' | 'deficit' | 'holiday'
}

export default function WorkHoursReport({ date, showAllEmployees = false }: WorkHoursReportProps) {
  const [workHoursData, setWorkHoursData] = useState<WorkHoursData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [reportDate, setReportDate] = useState('')

  const getYesterdayDate = (): string => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().split('T')[0]
  }

  useEffect(() => {
    loadWorkHoursReport()
  }, [date, showAllEmployees])

  const loadWorkHoursReport = async () => {
    try {
      setIsLoading(true)
      
      // Use provided date or yesterday
      const targetDate = date || getYesterdayDate()
      setReportDate(targetDate)

      if (showAllEmployees) {
        // Load report for all employees (management view)
        const response = await fetch(`/api/work-hours?action=report&date=${targetDate}`)
        if (response.ok) {
          const result = await response.json()
          setWorkHoursData(result.data || [])
        } else {
          setWorkHoursData([])
        }
      } else {
        // Load report for current user only
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}')
        if (currentUser.employeeId) {
          const response = await fetch(`/api/work-hours?action=validate&employeeId=${currentUser.employeeId}&date=${targetDate}`)
          if (response.ok) {
            const result = await response.json()
            const validation = result.data
            setWorkHoursData([{
              employeeId: currentUser.employeeId,
              employeeName: currentUser.name || 'Current User',
              requiredHours: validation.requiredHours,
              actualHours: validation.actualHours,
              deficit: validation.deficit,
              status: validation.requiredHours === 0 ? 'holiday' : (validation.isValid ? 'compliant' : 'deficit')
            }])
          } else {
            setWorkHoursData([])
          }
        } else {
          setWorkHoursData([])
        }
      }
    } catch (error) {
      console.error('Error loading work hours report:', error)
      setWorkHoursData([])
    } finally {
      setIsLoading(false)
    }
  }



  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'deficit':
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      case 'holiday':
        return <Calendar className="h-5 w-5 text-blue-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'bg-green-100 text-green-800'
      case 'deficit':
        return 'bg-red-100 text-red-800'
      case 'holiday':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'Compliant'
      case 'deficit':
        return 'Hours Deficit'
      case 'holiday':
        return 'Holiday'
      default:
        return 'Unknown'
    }
  }

  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          <span className="text-gray-600">Loading work hours report...</span>
        </div>
      </div>
    )
  }

  const deficitEmployees = workHoursData.filter(emp => emp.status === 'deficit')
  const totalDeficitHours = deficitEmployees.reduce((sum, emp) => sum + emp.deficit, 0)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-black flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Work Hours Report</span>
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Report for {formatDate(reportDate)}
          </p>
        </div>
        
        {deficitEmployees.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <div className="text-sm font-medium text-red-800">
              {deficitEmployees.length} employee{deficitEmployees.length > 1 ? 's' : ''} with deficit
            </div>
            <div className="text-xs text-red-600">
              Total deficit: {totalDeficitHours.toFixed(1)} hours
            </div>
          </div>
        )}
      </div>

      {workHoursData.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No work hours data available</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Required Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actual Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deficit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workHoursData.map((employee) => (
                <tr key={employee.employeeId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-black">{employee.employeeName}</div>
                    <div className="text-sm text-gray-500">{employee.employeeId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.requiredHours} hrs</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.actualHours} hrs</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${
                      employee.deficit > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {employee.deficit > 0 ? `-${employee.deficit.toFixed(1)} hrs` : '0 hrs'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(employee.status)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(employee.status)}`}>
                        {getStatusText(employee.status)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
