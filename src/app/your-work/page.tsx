'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { isTaskOwner, isTaskSupporter } from '@/lib/data'

import { Task } from '@/lib/types'
import { Calendar, Clock, BarChart3, FileText, CheckCircle, AlertCircle, RefreshCw, Crown, Heart, AlertTriangle, Edit } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import TaskUpdateModal from '@/components/tasks/TaskUpdateModal'
import { getHoursForDate, wasWorkedOnDate } from '@/lib/dailyHours'

export default function YourWork() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [maxDate, setMaxDate] = useState('')
  const router = useRouter()
  const currentUser = getCurrentUser()

  // Initialize client-side values to avoid hydration mismatch
  useEffect(() => {
    setMaxDate(new Date().toISOString().split('T')[0])
  }, [])

  const loadTasks = useCallback(async () => {
    if (!currentUser) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/tasks/user/${currentUser.employeeId}`)
      if (response.ok) {
        const result = await response.json()
        const userTasks = result.data || []
        setTasks(userTasks)
      } else {
        setTasks([])
      }

      // Set default date to yesterday only if no date is selected
      if (!selectedDate) {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        setSelectedDate(yesterdayStr)
      }
    } catch (error) {
      console.error('Error loading tasks from Google Sheets:', error)
      setTasks([])
      setError('Failed to load tasks. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }, [currentUser, selectedDate])

  useEffect(() => {
    if (!currentUser) {
      router.push('/')
      return
    }

    // Only employees can access this page
    if (currentUser.role !== 'employee') {
      router.push('/dashboard')
      return
    }

    if (!initialized) {
      loadTasks()
      setInitialized(true)
    }
  }, [currentUser, router, initialized, loadTasks])

  useEffect(() => {
    if (selectedDate) {
      // Filter tasks that were actually worked on the selected date
      const filtered = tasks.filter(task => {
        // Check if task has hours logged for the selected date
        const hoursOnDate = getHoursForDate(selectedDate, task.dailyHours)
        const wasWorkedOn = wasWorkedOnDate(selectedDate, task.dailyHours)

        // Show task if it was worked on the selected date (has hours logged for that date)
        return wasWorkedOn && hoursOnDate > 0
      })
      setFilteredTasks(filtered)
    } else {
      setFilteredTasks([])
    }
  }, [selectedDate, tasks])



  // Auto-refresh data when window gains focus (in case tasks were updated elsewhere)
  useEffect(() => {
    const handleFocus = () => {
      if (initialized && currentUser) {
        loadTasks()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [initialized, currentUser, loadTasks])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const calculateTotalHours = () => {
    if (!selectedDate) return 0

    return filteredTasks.reduce((total, task) => {
      const hoursWorkedOnDate = getHoursForDate(selectedDate, task.dailyHours)
      return total + hoursWorkedOnDate
    }, 0)
  }

  const getTasksCompletedOnDate = () => {
    return filteredTasks.filter(task => {
      const completedDate = new Date(task.updatedAt).toISOString().split('T')[0]
      return task.status === 'Done' && completedDate === selectedDate
    }).length
  }

  const handleRefreshData = () => {
    loadTasks()
  }

  const handleTaskUpdate = () => {
    // Reload tasks when a task is updated
    loadTasks()
  }

  if (!currentUser) return null

  if (currentUser.role !== 'employee') {
    return (
      <div>
        <Navbar />
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-black mb-4">Access Denied</h1>
            <p className="text-gray-600">This page is only available for employees.</p>
          </div>
        </div>
      </div>
    )
  }

  const totalHours = calculateTotalHours()
  const tasksCompleted = getTasksCompletedOnDate()

  return (
    <div>
      <Navbar />
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black">Your Work Report</h1>
            <p className="text-gray-600 mt-1">
              View your daily work details for owned tasks and support assignments
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              onClick={handleRefreshData}
              className="btn-secondary flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Date Selection */}
        <div className="card mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-medium text-black mb-2">Select Date</h2>
              <p className="text-sm text-gray-600">Choose a date to view your work details</p>
            </div>
            <div className="mt-4 sm:mt-0">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={maxDate}
                  className="input-field pl-10"
                />
              </div>
            </div>
          </div>
        </div>

        {selectedDate && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="card">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary bg-opacity-20 rounded-lg">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Hours Worked</p>
                    <p className="text-2xl font-bold text-black">{totalHours.toFixed(1)}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tasks Completed</p>
                    <p className="text-2xl font-bold text-black">{tasksCompleted}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Active Tasks</p>
                    <p className="text-2xl font-bold text-black">{filteredTasks.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Work Details Table */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-black">
                  Work Details for {formatDate(selectedDate)}
                </h2>
                <span className="text-sm text-gray-500">
                  Employee: {currentUser.name} ({currentUser.employeeId})
                </span>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Work Found</h3>
                  <p className="text-gray-600 mb-4">
                    {selectedDate ? 'No tasks with logged hours were found for this date.' : 'Please select a date to view work details.'}
                  </p>
                  <button
                    onClick={handleRefreshData}
                    className="btn-primary flex items-center space-x-2 mx-auto"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Refresh Data</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sr. No.
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Task ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          SubTask
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hours Worked
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Due Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Remarks
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Difficulties
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredTasks.map((task, index) => {
                        const hoursWorked = selectedDate ? getHoursForDate(selectedDate, task.dailyHours) : 0

                        const isOwner = isTaskOwner(task, currentUser.employeeId)
                        const isSupporter = isTaskSupporter(task, currentUser.employeeId)

                        return (
                          <tr key={task.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {index + 1}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-black">
                              {task.taskId}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm">
                              {isOwner && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-200 text-primary-800">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Owner
                                </span>
                              )}
                              {isSupporter && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-200 text-blue-800">
                                  <Heart className="h-3 w-3 mr-1" />
                                  Support
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 max-w-xs">
                              <div className="truncate" title={task.description}>
                                {task.description}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900">
                              {task.subTask || 'No SubTask'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {hoursWorked.toFixed(1)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(task.endDate)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                task.status === 'Done' ? 'bg-green-100 text-green-800' :
                                task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                task.status === 'Delayed' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {task.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 max-w-xs">
                              <div className="truncate" title={task.remarks || ''}>
                                {task.remarks || '-'}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 max-w-xs">
                              <div className="truncate" title={task.difficulties || ''}>
                                {task.difficulties || '-'}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {(isOwner || isSupporter) && (
                                <button
                                  onClick={() => {
                                    setSelectedTask(task)
                                    setIsModalOpen(true)
                                  }}
                                  className="p-2 text-gray-600 hover:text-primary hover:bg-primary-50 rounded-lg transition-colors"
                                  title="Edit Task"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Task Update Modal */}
      <TaskUpdateModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedTask(null)
        }}
        onUpdate={handleTaskUpdate}
      />
    </div>
  )
}
