/**
 * Task Detail Page - Enhanced UI with modern button styling
 * Features: Role-based access, responsive design, improved UX, timer integration
 * Updated: GraphQL migration with REST fallback
 */
'use client'

import { useState, useEffect, use, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { getCurrentUser, getAllUsers } from '@/lib/auth'
import { Task, User } from '@/lib/types'
import { getTaskById, updateTask, canEditTask, canCommentOnTask } from '@/lib/taskService'
import UnifiedTimeline from '@/components/UnifiedTimeline'
import TaskEditModal from '@/components/tasks/TaskEditModal'
import TaskChecklistManager from '@/components/tasks/TaskChecklistManager'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import LoadingButton from '@/components/ui/LoadingButton'
import TimerButton from '@/components/TimerButton'
import AssigneeList from '@/components/tasks/AssigneeList'
import RelatedItemsManager from '@/components/relationships/RelatedItemsManager'
import SubtasksList from '@/components/subtasks/SubtasksList'
import AddSubtaskModal from '@/components/subtasks/AddSubtaskModal'
import SubtaskBreadcrumb from '@/components/subtasks/SubtaskBreadcrumb'
import { QUERIES } from '@/lib/graphql-queries'
import {
  MessageSquare,
  Calendar,
  User as UserIcon,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Timer,
  Pencil,
  Target
} from 'lucide-react'

// Helper function to execute GraphQL queries
async function executeGraphQLQuery(query: string, variables: any) {
  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  })

  const result = await response.json()
  if (result.errors) throw new Error(result.errors[0]?.message || 'GraphQL query failed')
  return result.data
}

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

  // Project name
  const [projectName, setProjectName] = useState<string>('')

  // Activity log filter state - default to showing only comments
  const [showActivity, setShowActivity] = useState(false)
  const [showComments, setShowComments] = useState(true)

  // Related tasks state
  const [relatedTasksData, setRelatedTasksData] = useState<Task[]>([])
  const [isLoadingRelatedTasks, setIsLoadingRelatedTasks] = useState(false)

  // Subtask modal state
  const [showAddSubtaskModal, setShowAddSubtaskModal] = useState(false)
  const [subtasksKey, setSubtasksKey] = useState(0) // For refreshing subtasks list

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
      let taskData: Task | null = null

      // Try GraphQL first
      try {
        console.log('🔵 [Task Detail] Attempting GraphQL query for task:', taskId)
        const data = await executeGraphQLQuery(QUERIES.GET_TASK, { taskId })
        taskData = data.tasks?.[0] || null
        console.log('✅ [Task Detail] GraphQL query successful')
      } catch (graphqlError) {
        console.warn('⚠️ [Task Detail] GraphQL failed, falling back to REST:', graphqlError)

        // Fallback to REST API
        taskData = await getTaskById(taskId)
        console.log('✅ [Task Detail] REST API successful')
      }

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

  // Load project name
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
      console.error('Failed to load project name:', error)
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
  const canAssign = isAdminOrTopManagement || task?.assignedBy === currentUser?.employeeId ||
    (task?.assignedTo && (Array.isArray(task.assignedTo) ? task.assignedTo.includes(currentUser?.employeeId || '') : task.assignedTo === currentUser?.employeeId))

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

  // Handle add hours (renamed from handleLogHours to match bug page)
  const handleAddHours = async () => {
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

      // If using timer hours, reset the timer
      const updates: any = {
        actualHours: newActualHours
      }

      if (useTimerHours && task.timerTotalTime) {
        updates.timerTotalTime = 0
        updates.timerState = 'stopped'
        updates.timerStartTime = null
        updates.timerPausedTime = null
        updates.timerSessions = '[]'
      }

      await updateTask(task.taskId, updates)

      // Log activity
      try {
        await fetch('/api/activity-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityType: 'task',
            entityId: task.taskId,
            actionType: 'time_logged',
            description: `Logged ${finalHours} hours${workDescription ? `: ${workDescription}` : ''}`,
            isComment: false
          })
        })
      } catch (error) {
        console.error('Failed to log activity:', error)
      }

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
        {/* Breadcrumb Navigation */}
        {task.parentTaskId && (
          <SubtaskBreadcrumb
            currentId={task.taskId}
            currentType="task"
            currentName={task.name}
          />
        )}

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center space-x-4 min-w-0 flex-1">
            <button
              onClick={() => router.push('/tasks')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="p-3 bg-blue-100 rounded-lg flex-shrink-0">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                  <span className="font-mono">{task.taskId}</span>
                  {projectName && (
                    <>
                      <span className="text-gray-400">-</span>
                      <span className="text-sm text-gray-700">{projectName}</span>
                    </>
                  )}
                </h1>
                <p className="text-lg text-gray-900 mt-1 break-words max-w-full overflow-hidden">{task.name || task.description}</p>
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
              <div className="flex items-center space-x-3 mb-4">
                {/* Status - Inline Dropdown */}
                {canEdit ? (
                  <div className="relative inline-block">
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusUpdate(e.target.value)}
                      disabled={isUpdating}
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)} hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer`}
                    >
                      {taskStatusOptions.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                )}

                {/* Priority - Inline Dropdown */}
                {canEdit ? (
                  <div className="relative inline-block">
                    <select
                      value={task.priority}
                      onChange={(e) => handlePriorityUpdate(e.target.value)}
                      disabled={isUpdating}
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)} hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer`}
                    >
                      {taskPriorityOptions.map(priority => (
                        <option key={priority} value={priority}>{priority}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                )}

                {/* Task Type */}
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                  {task.selectType}
                </span>

                {/* Recurrence Type */}
                {task.recursiveType && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {task.recursiveType}
                  </span>
                )}

                {/* Department */}
                {(task as any).department && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                    {(task as any).department}
                  </span>
                )}
              </div>

              {/* Task Name/Title with Edit Button */}
              <div className="mb-4">
                <button
                  onClick={() => setTaskEditModalOpen(true)}
                  className="text-xl font-semibold text-black hover:text-primary transition-colors cursor-pointer text-left w-full flex items-center space-x-2 group"
                >
                  <span>{task.name || task.description}</span>
                  <Pencil className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>

              {/* Task Description */}
              {task.description && task.name && (
                <div className="mb-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.description}</p>
                </div>
              )}

              <div className="space-y-4">
                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Start Date:</span>
                    <span className="ml-2 text-sm text-gray-900">{new Date(task.startDate).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">End Date:</span>
                    <span className="ml-2 text-sm text-gray-900">{new Date(task.endDate).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Project */}
                {task.projectId && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Project:</span>
                    <span className="ml-2 text-sm text-gray-900">{projectName || task.projectId}</span>
                  </div>
                )}

                {/* Remarks */}
                {task.remarks && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Remarks</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{task.remarks}</p>
                  </div>
                )}

                {/* Difficulties */}
                {task.difficulties && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Difficulties</h3>
                    <p className="text-gray-700 whitespace-pre-wrap bg-yellow-50 p-3 rounded-lg border border-yellow-200">{task.difficulties}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Subtasks */}
            <SubtasksList
              key={subtasksKey}
              parentId={task.taskId}
              parentType="task"
              onAddSubtask={() => setShowAddSubtaskModal(true)}
            />

            {/* Activity Timeline (includes comments and system activities) */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-2 mb-4">
                <MessageSquare className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Activity & Comments</h3>
              </div>

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
                  // If both toggles are ON or both are OFF, show all
                  if ((showActivity && showComments) || (!showActivity && !showComments)) {
                    return true
                  }
                  // If only Activity is ON, show only non-comments
                  if (showActivity && !showComments) {
                    return !activity.isComment
                  }
                  // If only Comments is ON, show only comments
                  if (!showActivity && showComments) {
                    return activity.isComment
                  }
                  return true
                }}
              />
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Time Tracking - Moved above subtasks */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <Timer className="h-5 w-5" />
                  <span>Time Tracking</span>
                </h3>

                {/* Log Hours Button - Disabled for Done/Cancel/Stop tasks */}
                {canEdit && task.status !== 'Done' && task.status !== 'Cancel' && task.status !== 'Stop' && (
                  <div className="relative">
                    <button
                      onClick={() => {
                        // If there are no timer hours, default to manual entry mode
                        if (!task?.timerTotalTime || task.timerTotalTime === 0) {
                          setUseTimerHours(false)
                        } else {
                          setUseTimerHours(true)
                        }
                        setShowHoursModal(!showHoursModal)
                      }}
                      className="inline-flex items-center px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white font-medium rounded shadow-sm hover:shadow transition-all focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <Timer className="h-3 w-3 mr-1" />
                      <span>Log Hours</span>
                    </button>

                    {/* Log Hours Dropdown */}
                    {showHoursModal && (
                      <>
                        {/* Backdrop to close dropdown when clicking outside */}
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowHoursModal(false)}
                        />

                        {/* Dropdown Content */}
                        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-4">
                          <div className="space-y-3">
                            {/* Timer Info */}
                            {task.timerTotalTime && task.timerTotalTime > 0 && (
                              <div className="bg-purple-50 border border-purple-200 rounded-lg p-2">
                                <div className="flex items-center space-x-2 mb-1">
                                  <Timer className="h-3 w-3 text-purple-600" />
                                  <span className="text-xs font-medium text-purple-900">Timer Data Available</span>
                                </div>
                                <p className="text-xs text-purple-700">
                                  <strong>Timer Hours:</strong> {formatMillisecondsToTime(task.timerTotalTime)}
                                </p>
                              </div>
                            )}

                            {/* Source Selection - Always show if timer hours exist */}
                            {task.timerTotalTime && task.timerTotalTime > 0 && (
                              <div className="space-y-1">
                                <label className="block text-xs font-medium text-gray-700">
                                  Hours Source:
                                </label>
                                <div className="flex space-x-3">
                                  <label className="flex items-center space-x-1 cursor-pointer">
                                    <input
                                      type="radio"
                                      checked={useTimerHours}
                                      onChange={() => setUseTimerHours(true)}
                                      className="text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className="text-xs text-gray-700">Use Timer</span>
                                  </label>
                                  <label className="flex items-center space-x-1 cursor-pointer">
                                    <input
                                      type="radio"
                                      checked={!useTimerHours}
                                      onChange={() => setUseTimerHours(false)}
                                      className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-xs text-gray-700">Manual</span>
                                  </label>
                                </div>
                              </div>
                            )}

                            {/* Manual Hours Input (hh:mm:ss format) - Show when no timer OR manual mode selected */}
                            {(!task.timerTotalTime || task.timerTotalTime === 0 || !useTimerHours) && (
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Hours Worked (hh:mm:ss):
                                </label>
                                <input
                                  type="text"
                                  value={hoursWorked}
                                  onChange={(e) => setHoursWorked(e.target.value)}
                                  placeholder="e.g., 02:30:00"
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                                />
                                <p className="mt-0.5 text-xs text-gray-500">Format: hh:mm:ss</p>
                              </div>
                            )}

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Work Description (Optional):
                              </label>
                              <textarea
                                value={workDescription}
                                onChange={(e) => setWorkDescription(e.target.value)}
                                placeholder="Describe what you worked on..."
                                rows={2}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>

                            {/* Summary */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                              <div className="text-xs text-blue-700 space-y-0.5">
                                <p><strong>Current:</strong> {formatHoursToTime(task.actualHours || 0)}</p>
                                {task.estimatedHours && (
                                  <p><strong>Estimated:</strong> {formatHoursToTime(task.estimatedHours)}</p>
                                )}
                                {useTimerHours && task.timerTotalTime && task.timerTotalTime > 0 ? (
                                  <p><strong>New Total:</strong> {formatHoursToTime((task.actualHours || 0) + (task.timerTotalTime / (1000 * 60 * 60)))}</p>
                                ) : (
                                  hoursWorked && isValidTimeFormat(hoursWorked) && (
                                    <p><strong>New Total:</strong> {formatHoursToTime((task.actualHours || 0) + timeToHours(hoursWorked))}</p>
                                  )
                                )}
                              </div>
                            </div>

                            {/* Warning if using timer hours */}
                            {useTimerHours && task.timerTotalTime && task.timerTotalTime > 0 && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                                <p className="text-xs text-yellow-800">
                                  ⚠️ Logging timer hours will reset the timer.
                                </p>
                              </div>
                            )}

                            <div className="flex space-x-2">
                              <LoadingButton
                                onClick={handleAddHours}
                                isLoading={isUpdating}
                                disabled={!useTimerHours && (!hoursWorked || !isValidTimeFormat(hoursWorked) || timeToHours(hoursWorked) <= 0)}
                                className="btn-primary flex-1 text-xs py-1.5"
                              >
                                <Timer className="h-3 w-3 mr-1" />
                                Log Hours
                              </LoadingButton>
                              <button
                                onClick={() => {
                                  setShowHoursModal(false)
                                  setHoursWorked('')
                                  setWorkDescription('')
                                  setUseTimerHours(true)
                                }}
                                className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {/* Estimated Hours - Inline Input (hh:mm:ss format) */}
                <div>
                  <span className="text-sm font-medium text-gray-600">Estimated:</span>
                  {canEdit ? (
                    isEditingEstimatedHours ? (
                      <div className="inline-flex items-center ml-2">
                        <input
                          type="text"
                          value={tempEstimatedHours}
                          onChange={(e) => setTempEstimatedHours(e.target.value)}
                          onBlur={handleEstimatedHoursUpdate}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleEstimatedHoursUpdate()
                            } else if (e.key === 'Escape') {
                              setIsEditingEstimatedHours(false)
                              setTempEstimatedHours('')
                            }
                          }}
                          autoFocus
                          disabled={isUpdating}
                          placeholder="hh:mm:ss"
                          className="w-28 text-sm border border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setTempEstimatedHours(task.estimatedHours ? formatHoursToTime(task.estimatedHours) : '00:00:00')
                          setIsEditingEstimatedHours(true)
                        }}
                        className="ml-2 text-sm text-gray-900 hover:text-blue-600 hover:underline font-mono"
                      >
                        {task.estimatedHours ? formatHoursToTime(task.estimatedHours) : 'Set hours'}
                      </button>
                    )
                  ) : (
                    <span className="ml-2 text-sm text-gray-900 font-mono">
                      {task.estimatedHours ? formatHoursToTime(task.estimatedHours) : 'Not set'}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-600">Actual:</span>
                    <span className="text-sm text-gray-900 font-mono">
                      {task.actualHours ? formatHoursToTime(task.actualHours) : '00:00:00'}
                    </span>
                  </div>

                  {/* Timer Play/Pause Button - Disabled for Done/Cancel/Stop */}
                  {canEdit && task.status !== 'Done' && task.status !== 'Cancel' && task.status !== 'Stop' && (
                    <TimerButton
                      entityType="task"
                      entityId={task.taskId}
                      entityTitle={task.name || task.description}
                      status={task.status}
                      size="md"
                      showLabel={false}
                    />
                  )}
                </div>

                {task.estimatedHours && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Progress:</span>
                    <div className="ml-2 mt-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            (task.actualHours || 0) > task.estimatedHours
                              ? 'bg-red-500'
                              : 'bg-blue-500'
                          }`}
                          style={{
                            width: `${Math.min(((task.actualHours || 0) / task.estimatedHours) * 100, 100)}%`
                          }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500 mt-1">
                        {task.estimatedHours ? Math.round(((task.actualHours || 0) / task.estimatedHours) * 100) : 0}% complete
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Task Checklists - Moved from bottom */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <TaskChecklistManager
                taskId={task.taskId}
                canEdit={canEdit}
              />
            </div>

            {/* Related Items */}
            <RelatedItemsManager
              itemId={task.taskId}
              itemType="task"
              canEdit={canEdit}
            />

            {/* People */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">People</h3>

              <div className="space-y-3">
                {/* Assigned To - Display multiple assignees */}
                <div>
                  <span className="text-sm font-medium text-gray-600">Assigned to:</span>
                  <span className="ml-2 text-sm text-gray-900">
                    <AssigneeList assignedTo={task.assignedTo} showIcon={true} maxDisplay={5} />
                  </span>
                  {canAssign && (
                    <button
                      onClick={() => setTaskEditModalOpen(true)}
                      className="ml-2 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Edit
                    </button>
                  )}
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-600">Assigned by:</span>
                  <span className="ml-2 text-sm text-gray-900">
                    <UserName employeeId={task.assignedBy} />
                  </span>
                </div>

                {/* Support Team */}
                {task.support && task.support.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Support Team:</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {task.support.map((employeeId) => (
                        <span key={employeeId} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                          <UserIcon className="h-3 w-3 mr-1" />
                          <UserName employeeId={employeeId} />
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Timeline</h3>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <span className="text-sm font-medium text-gray-600">Created:</span>
                    <span className="ml-2 text-sm text-gray-900">
                      {new Date(task.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <span className="text-sm font-medium text-gray-600">Updated:</span>
                    <span className="ml-2 text-sm text-gray-900">
                      {new Date(task.updatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Related Tasks */}
            {relatedTasksData.length > 0 && (
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                  <ExternalLink className="h-5 w-5" />
                  <span>Related Tasks</span>
                </h3>

                {isLoadingRelatedTasks ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Loading related tasks...</span>
                  </div>
                ) : relatedTasksData.length > 0 ? (
                  <div className="space-y-2">
                    {relatedTasksData.map((relatedTask) => (
                      <a
                        key={relatedTask.taskId}
                        href={`/tasks/${relatedTask.taskId}`}
                        className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-blue-600">{relatedTask.taskId}</span>
                              <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(relatedTask.status)}`}>
                                {relatedTask.status}
                              </span>
                              <span className={`px-2 py-0.5 text-xs rounded-full ${getPriorityColor(relatedTask.priority)}`}>
                                {relatedTask.priority}
                              </span>
                            </div>
                            <p className="text-sm text-gray-900 mt-1">{relatedTask.name || relatedTask.description}</p>
                          </div>
                          <ExternalLink className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No related tasks found</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>


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

      {/* Add Subtask Modal */}
      {showAddSubtaskModal && (
        <AddSubtaskModal
          parentId={task.taskId}
          parentType="task"
          parentName={task.name}
          onClose={() => setShowAddSubtaskModal(false)}
          onSuccess={() => {
            setShowAddSubtaskModal(false)
            setSubtasksKey(prev => prev + 1) // Refresh subtasks list
          }}
        />
      )}
    </div>
  )
}



