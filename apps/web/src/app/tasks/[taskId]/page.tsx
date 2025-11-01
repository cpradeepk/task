/**
 * Task Detail Page - Enhanced UI with modern button styling
 * Features: Role-based access, responsive design, improved UX, timer integration
 */
'use client'

import React, { useState, useEffect, use, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { getCurrentUser, getAllUsers } from '@/lib/auth'
import { Task, User } from '@/lib/types'
import { getTaskById, updateTask, canEditTask, canCommentOnTask } from '@/lib/taskService'
import UnifiedTimeline from '@/components/UnifiedTimeline'
import TaskEditModal from '@/components/tasks/TaskEditModal'
import TaskSubTaskManager from '@/components/tasks/TaskSubTaskManager'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import LoadingButton from '@/components/ui/LoadingButton'
import TimerButton from '@/components/TimerButton'
import {
  CheckSquare,
  MessageSquare,
  Send,
  Calendar,
  User as UserIcon,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowLeft,
  UserCheck,
  X,
  ExternalLink,
  Timer,
  Settings,
  Pencil,
  Target
} from 'lucide-react'

// Component to handle async user name fetching
function UserName({ employeeId }: { employeeId: string }) {
  const [name, setName] = useState<string>(employeeId)

  useEffect(() => {
    const fetchName = async () => {
      try {
        const response = await fetch(`/api/users/${employeeId}`)
        if (response.ok) {
          const result = await response.json()
          setName(result.data?.name || employeeId)
        }
      } catch (error) {
        console.error('Failed to fetch user name:', error)
      }
    }
    fetchName()
  }, [employeeId])

  return <span>{name}</span>
}

// Helper function to format hours to hh:mm:ss
function formatHoursToTime(hours: number): string {
  if (!hours || isNaN(hours) || hours < 0) {
    return '00:00:00'
  }

  const totalSeconds = Math.floor(hours * 3600)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// Helper function to format milliseconds to hh:mm:ss
function formatMillisecondsToTime(ms: number): string {
  if (!ms || isNaN(ms) || ms < 0) {
    return '00:00:00'
  }

  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// Helper function to convert hh:mm:ss to decimal hours
function timeToHours(timeStr: string): number {
  const parts = timeStr.split(':')
  if (parts.length !== 3) return 0

  const hours = parseInt(parts[0]) || 0
  const minutes = parseInt(parts[1]) || 0
  const seconds = parseInt(parts[2]) || 0

  return hours + (minutes / 60) + (seconds / 3600)
}

// Helper function to validate hh:mm:ss format
function isValidTimeFormat(timeStr: string): boolean {
  const timeRegex = /^(\d{1,3}):([0-5]\d):([0-5]\d)$/
  return timeRegex.test(timeStr)
}

export default function TaskDetailPage({ params }: { params: Promise<{ taskId: string }> }) {
  const [task, setTask] = useState<Task | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  // Inline editing states
  const [isEditingAssignee, setIsEditingAssignee] = useState(false)
  const [isEditingEstimatedHours, setIsEditingEstimatedHours] = useState(false)
  const [tempEstimatedHours, setTempEstimatedHours] = useState('')

  // Log hours modal
  const [showHoursModal, setShowHoursModal] = useState(false)
  const [hoursWorked, setHoursWorked] = useState('')
  const [workDescription, setWorkDescription] = useState('')
  const [useTimerHours, setUseTimerHours] = useState(true)

  // Settings state
  const [taskStatusOptions, setTaskStatusOptions] = useState<string[]>([])
  const [taskPriorityOptions, setTaskPriorityOptions] = useState<string[]>([])
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)

  // Project names
  const [projectName, setProjectName] = useState<string>('')

  // Activity log filter state - default to showing only comments
  const [showActivity, setShowActivity] = useState(false)
  const [showComments, setShowComments] = useState(true)

  // Related tasks state
  const [relatedTasksData, setRelatedTasksData] = useState<Task[]>([])
  const [isLoadingRelatedTasks, setIsLoadingRelatedTasks] = useState(false)

  // Edit modal state
  const [taskEditModalOpen, setTaskEditModalOpen] = useState(false)

  const hasLoadedData = useRef(false)
  const router = useRouter()
  const currentUser = getCurrentUser()

  // Unwrap the params Promise
  const { taskId } = use(params)

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!isHydrated) return

      try {
        setIsLoadingSettings(true)
        const response = await fetch('/api/settings?grouped=true&activeOnly=true')
        const data = await response.json()

        if (data.success) {
          const grouped = data.data
          setTaskStatusOptions(grouped.task_status || [])
          setTaskPriorityOptions(grouped.task_priority || [])
        } else {
          console.error('Failed to load settings:', data.error)
          // Use defaults
          setTaskStatusOptions(['Open', 'In Progress', 'Completed', 'Delayed', 'On Hold', 'Cancelled'])
          setTaskPriorityOptions(['IU&I', 'IU&NI', 'NU&I', 'NU&NI'])
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
        // Use defaults
        setTaskStatusOptions(['Open', 'In Progress', 'Completed', 'Delayed', 'On Hold', 'Cancelled'])
        setTaskPriorityOptions(['IU&I', 'IU&NI', 'NU&I', 'NU&NI'])
      } finally {
        setIsLoadingSettings(false)
      }
    }

    loadSettings()
  }, [isHydrated])

  const loadTaskData = useCallback(async () => {
    try {
      const taskData = await getTaskById(taskId)
      if (!taskData) {
        router.push('/tasks')
        return
      }

      setTask(taskData)
      setIsLoading(false)
    } catch (error) {
      console.error('Failed to load task data:', error)
      setIsLoading(false)
    }
  }, [taskId, router])

  const loadUsers = useCallback(async () => {
    try {
      const allUsers = await getAllUsers()
      setUsers(allUsers.filter(user => user.status === 'active'))
    } catch (error) {
      console.error('Failed to load users:', error)
    }
  }, [])

  // Close dropdown on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showHoursModal) {
        setShowHoursModal(false)
        setHoursWorked('')
        setWorkDescription('')
        setUseTimerHours(true)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showHoursModal])

  // Load project names
  const loadProjectNames = useCallback(async () => {
    if (!task?.projectId) return

    try {
      const response = await fetch(`/api/projects/${task.projectId}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setProjectName(result.data.name || '')
        }
      }
    } catch (error) {
      console.error('Failed to load project names:', error)
    }
  }, [task?.projectId])

  // Load related tasks
  const loadRelatedTasks = useCallback(async () => {
    if (!task?.relatedTasks) return

    try {
      setIsLoadingRelatedTasks(true)
      const taskIds = task.relatedTasks.split(',').map(id => id.trim()).filter(Boolean)
      
      const relatedTasks = await Promise.all(
        taskIds.map(async (id) => {
          try {
            const response = await fetch(`/api/tasks/${id}`)
            if (response.ok) {
              const result = await response.json()
              return result.data
            }
          } catch (error) {
            console.error(`Failed to load related task ${id}:`, error)
          }
          return null
        })
      )

      setRelatedTasksData(relatedTasks.filter(Boolean) as Task[])
    } catch (error) {
      console.error('Failed to load related tasks:', error)
    } finally {
      setIsLoadingRelatedTasks(false)
    }
  }, [task?.relatedTasks])

  // Initial data load
  useEffect(() => {
    if (!isHydrated || !currentUser || hasLoadedData.current) return

    hasLoadedData.current = true
    loadTaskData()
    loadUsers()
  }, [isHydrated, currentUser, loadTaskData, loadUsers])

  // Load project names when task changes
  useEffect(() => {
    if (task) {
      loadProjectNames()
      loadRelatedTasks()
    }
  }, [task, loadProjectNames, loadRelatedTasks])

  // Permission checks
  const isAdminOrTopManagement = currentUser?.role === 'admin' || currentUser?.role === 'top_management'
  const canEdit = task ? canEditTask(task, currentUser?.employeeId || '', isAdminOrTopManagement) : false
  const canComment = task ? canCommentOnTask(task, currentUser?.employeeId || '', isAdminOrTopManagement) : false
  const canAssign = isAdminOrTopManagement || task?.assignedBy === currentUser?.employeeId || task?.assignedTo === currentUser?.employeeId

  // Handle status update
  const handleStatusUpdate = async (newStatus: string) => {
    if (!task || !canEdit) return

    try {
      setIsUpdating(true)
      await updateTask(task.taskId, { status: newStatus as Task['status'] })
      await loadTaskData()
    } catch (error) {
      console.error('Failed to update status:', error)
      alert('Failed to update status. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  // Handle priority update
  const handlePriorityUpdate = async (newPriority: string) => {
    if (!task || !canEdit) return

    try {
      setIsUpdating(true)
      await updateTask(task.taskId, { priority: newPriority as Task['priority'] })
      await loadTaskData()
    } catch (error) {
      console.error('Failed to update priority:', error)
      alert('Failed to update priority. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  // Handle assignee update
  const handleAssigneeUpdate = async (newAssignee: string) => {
    if (!task || !canAssign) return

    try {
      setIsUpdating(true)
      await updateTask(task.taskId, { assignedTo: newAssignee })
      await loadTaskData()
      setIsEditingAssignee(false)
    } catch (error) {
      console.error('Failed to update assignee:', error)
      alert('Failed to update assignee. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  // Handle estimated hours update
  const handleEstimatedHoursUpdate = async () => {
    if (!task || !canEdit || !tempEstimatedHours) return

    if (!isValidTimeFormat(tempEstimatedHours)) {
      alert('Please enter time in hh:mm:ss format (e.g., 02:30:00)')
      return
    }

    try {
      setIsUpdating(true)
      const hours = timeToHours(tempEstimatedHours)
      await updateTask(task.taskId, { estimatedHours: hours })
      await loadTaskData()
      setIsEditingEstimatedHours(false)
      setTempEstimatedHours('')
    } catch (error) {
      console.error('Failed to update estimated hours:', error)
      alert('Failed to update estimated hours. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  // Handle log hours
  const handleLogHours = async () => {
    if (!task || !canEdit) return

    let finalHours = ''

    if (useTimerHours && task.timerTotalTime) {
      finalHours = formatMillisecondsToTime(task.timerTotalTime)
    } else if (hoursWorked) {
      finalHours = hoursWorked
    } else {
      alert('Please enter hours worked or use timer hours')
      return
    }

    if (!isValidTimeFormat(finalHours)) {
      alert('Please enter time in hh:mm:ss format (e.g., 02:30:00)')
      return
    }

    try {
      setIsUpdating(true)
      const hours = timeToHours(finalHours)
      const currentActualHours = task.actualHours || 0
      const newActualHours = currentActualHours + hours

      await updateTask(task.taskId, {
        actualHours: newActualHours
      })

      // Log activity
      await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'task',
          entityId: task.taskId,
          action: 'hours_logged',
          details: `Logged ${finalHours} hours${workDescription ? `: ${workDescription}` : ''}`,
          employeeId: currentUser?.employeeId
        })
      })

      await loadTaskData()
      setShowHoursModal(false)
      setHoursWorked('')
      setWorkDescription('')
      setUseTimerHours(true)
    } catch (error) {
      console.error('Failed to log hours:', error)
      alert('Failed to log hours. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-blue-100 text-blue-800'
      case 'In Progress': return 'bg-yellow-100 text-yellow-800'
      case 'Completed': return 'bg-green-100 text-green-800'
      case 'Done': return 'bg-green-100 text-green-800'
      case 'Delayed': return 'bg-red-100 text-red-800'
      case 'On Hold': return 'bg-gray-100 text-gray-800'
      case 'Cancelled': return 'bg-gray-100 text-gray-800'
      case 'ReOpened': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Get priority color
  const getPriorityColor = (priority: string) => {
    if (priority.includes('IU&I')) return 'bg-red-100 text-red-800'
    if (priority.includes('IU&NI')) return 'bg-orange-100 text-orange-800'
    if (priority.includes('NU&I')) return 'bg-blue-100 text-blue-800'
    return 'bg-gray-100 text-gray-800'
  }

  // Show loading state
  if (!isHydrated || !currentUser || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto p-6">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-white rounded-xl p-12 border border-gray-200 shadow-sm text-center">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Task Not Found</h2>
            <p className="text-gray-600 mb-6">The task you're looking for doesn't exist or has been deleted.</p>
            <button
              onClick={() => router.push('/tasks')}
              className="btn-primary"
            >
              Back to Tasks
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/tasks')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{task.description}</h1>
                <p className="text-sm text-gray-600 font-mono">{task.taskId}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {canEdit && (
              <button
                onClick={() => setTaskEditModalOpen(true)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 transition-colors flex items-center space-x-2"
              >
                <Pencil className="h-4 w-4" />
                <span>Edit Task</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Task Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Info Card */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <CheckSquare className="h-5 w-5 text-blue-600" />
                <span>Task Information</span>
              </h2>

              <div className="space-y-4">
                {/* Status and Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    {canEdit ? (
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusUpdate(e.target.value)}
                        disabled={isUpdating}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      >
                        {taskStatusOptions.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    {canEdit ? (
                      <select
                        value={task.priority}
                        onChange={(e) => handlePriorityUpdate(e.target.value)}
                        disabled={isUpdating}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      >
                        {taskPriorityOptions.map(priority => (
                          <option key={priority} value={priority}>{priority}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    )}
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <div className="flex items-center space-x-2 text-gray-900">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{new Date(task.startDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <div className="flex items-center space-x-2 text-gray-900">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{new Date(task.endDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Hours */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Hours</label>
                    {canEdit && isEditingEstimatedHours ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={tempEstimatedHours}
                          onChange={(e) => setTempEstimatedHours(e.target.value)}
                          placeholder="hh:mm:ss"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          onClick={handleEstimatedHoursUpdate}
                          disabled={isUpdating}
                          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingEstimatedHours(false)
                            setTempEstimatedHours('')
                          }}
                          className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          if (canEdit) {
                            setIsEditingEstimatedHours(true)
                            setTempEstimatedHours(formatHoursToTime(task.estimatedHours))
                          }
                        }}
                        className={`flex items-center space-x-2 text-gray-900 ${canEdit ? 'cursor-pointer hover:bg-gray-50 p-2 rounded-lg' : ''}`}
                      >
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>{formatHoursToTime(task.estimatedHours)}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Actual Hours</label>
                    <div className="flex items-center space-x-2 text-gray-900">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>{formatHoursToTime(task.actualHours || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Assignee */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assigned To</label>
                  {canAssign && isEditingAssignee ? (
                    <div className="flex items-center space-x-2">
                      <select
                        value={task.assignedTo}
                        onChange={(e) => handleAssigneeUpdate(e.target.value)}
                        disabled={isUpdating}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {users.map(user => (
                          <option key={user.employeeId} value={user.employeeId}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setIsEditingAssignee(false)}
                        className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => canAssign && setIsEditingAssignee(true)}
                      className={`flex items-center space-x-2 text-gray-900 ${canAssign ? 'cursor-pointer hover:bg-gray-50 p-2 rounded-lg' : ''}`}
                    >
                      <UserIcon className="h-4 w-4 text-gray-400" />
                      <span><UserName employeeId={task.assignedTo} /></span>
                    </div>
                  )}
                </div>

                {/* Assigned By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assigned By</label>
                  <div className="flex items-center space-x-2 text-gray-900">
                    <UserCheck className="h-4 w-4 text-gray-400" />
                    <span><UserName employeeId={task.assignedBy} /></span>
                  </div>
                </div>

                {/* Support Team */}
                {task.support && task.support.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Support Team</label>
                    <div className="flex flex-wrap gap-2">
                      {task.support.map((employeeId) => (
                        <span key={employeeId} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                          <UserIcon className="h-3 w-3 mr-1" />
                          <UserName employeeId={employeeId} />
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Project */}
                {task.projectId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                    <div className="text-gray-900">
                      {projectName || task.projectId}
                    </div>
                  </div>
                )}

                {/* Task Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Task Type</label>
                    <span className="inline-flex px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                      {task.selectType}
                    </span>
                  </div>
                  {task.recursiveType && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Recurrence</label>
                      <span className="inline-flex px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                        {task.recursiveType}
                      </span>
                    </div>
                  )}
                </div>

                {/* Remarks */}
                {task.remarks && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{task.remarks}</p>
                  </div>
                )}

                {/* Difficulties */}
                {task.difficulties && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Difficulties</label>
                    <p className="text-gray-900 bg-yellow-50 p-3 rounded-lg border border-yellow-200">{task.difficulties}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Subtasks */}
            <TaskSubTaskManager taskId={task.taskId} canEdit={canEdit} />

            {/* Related Tasks */}
            {relatedTasksData.length > 0 && (
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Related Tasks</h2>
                <div className="space-y-3">
                  {relatedTasksData.map((relatedTask) => (
                    <div
                      key={relatedTask.taskId}
                      onClick={() => router.push(`/tasks/${relatedTask.taskId}`)}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-mono text-sm text-gray-600">{relatedTask.taskId}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(relatedTask.status)}`}>
                            {relatedTask.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900">{relatedTask.description}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-gray-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activity Timeline */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <UnifiedTimeline
                entityType="task"
                entityId={task.taskId}
                showCommentInput={canComment}
                sortOrder="desc"
                autoRefresh={false}
                showActivity={showActivity}
                showComments={showComments}
                onToggleActivity={() => setShowActivity(!showActivity)}
                onToggleComments={() => setShowComments(!showComments)}
                filterFn={(activity) => {
                  if ((showActivity && showComments) || (!showActivity && !showComments)) {
                    return true
                  }
                  if (showActivity && !showComments) {
                    return !activity.isComment
                  }
                  if (!showActivity && showComments) {
                    return activity.isComment
                  }
                  return true
                }}
              />
            </div>
          </div>

          {/* Right Column - Actions & Timer */}
          <div className="space-y-6">
            {/* Timer Card */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Timer className="h-5 w-5 text-blue-600" />
                <span>Timer</span>
              </h3>
              <TimerButton
                entityType="task"
                entityId={task.taskId}
                entityTitle={task.description}
                status={task.status}
              />
              {task.timerTotalTime && task.timerTotalTime > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Total Timer Time</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatMillisecondsToTime(task.timerTotalTime)}
                  </p>
                </div>
              )}
            </div>

            {/* Actions Card */}
            {canEdit && (
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setShowHoursModal(true)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Clock className="h-4 w-4" />
                    <span>Log Hours</span>
                  </button>
                </div>
              </div>
            )}

            {/* Metadata Card */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600">Created</p>
                  <p className="text-gray-900">{new Date(task.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Last Updated</p>
                  <p className="text-gray-900">{new Date(task.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Log Hours Modal */}
      {showHoursModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Log Hours Worked</h3>

            <div className="space-y-4">
              {task.timerTotalTime && task.timerTotalTime > 0 && (
                <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="useTimer"
                    checked={useTimerHours}
                    onChange={(e) => setUseTimerHours(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="useTimer" className="flex-1 text-sm text-gray-900">
                    Use timer hours: <span className="font-semibold">{formatMillisecondsToTime(task.timerTotalTime)}</span>
                  </label>
                </div>
              )}

              {!useTimerHours && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hours Worked (hh:mm:ss)
                  </label>
                  <input
                    type="text"
                    value={hoursWorked}
                    onChange={(e) => setHoursWorked(e.target.value)}
                    placeholder="02:30:00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Description (Optional)
                </label>
                <textarea
                  value={workDescription}
                  onChange={(e) => setWorkDescription(e.target.value)}
                  placeholder="Describe what you worked on..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowHoursModal(false)
                  setHoursWorked('')
                  setWorkDescription('')
                  setUseTimerHours(true)
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <LoadingButton
                onClick={handleLogHours}
                isLoading={isUpdating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Log Hours
              </LoadingButton>
            </div>
          </div>
        </div>
      )}

      {/* Task Edit Modal */}
      <TaskEditModal
        task={task}
        isOpen={taskEditModalOpen}
        onClose={() => setTaskEditModalOpen(false)}
        onUpdate={() => {
          setTaskEditModalOpen(false)
          loadTaskData()
        }}
      />
    </div>
  )
}



