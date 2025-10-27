'use client'

import { useState, useEffect } from 'react'
import { Task, Bug } from '@/lib/types'
import { formatDate, getStatusColor, getPriorityColor, isTaskOwner, isTaskSupporter } from '@/lib/data'
import { getUserNameByEmployeeId, getCurrentUser } from '@/lib/auth'
import { useSettings } from '@/contexts/SettingsContext'
import {
  Clock, Calendar, User, AlertCircle, Edit, Users, Crown, Heart,
  Bug as BugIcon, CheckSquare, Tag, FileText, AlertTriangle
} from 'lucide-react'
import TaskUpdateModal from '@/components/tasks/TaskUpdateModal'
import SupportTaskBadge from '@/components/tasks/SupportTaskBadge'

// Helper function to check if task is overdue
function isTaskOverdue(task: Task): boolean {
  const today = new Date()
  const endDate = new Date(task.endDate)
  return today > endDate && !['Done', 'Cancel', 'Stop'].includes(task.status)
}

// Component to handle async user name fetching
function UserName({ employeeId }: { employeeId: string }) {
  const [name, setName] = useState<string>(employeeId)

  useEffect(() => {
    getUserNameByEmployeeId(employeeId).then(setName)
  }, [employeeId])

  return <span>{name}</span>
}

// Component to handle async support team names
function SupportTeam({ supportIds }: { supportIds: string[] }) {
  const [names, setNames] = useState<string[]>(supportIds)

  useEffect(() => {
    Promise.all(supportIds.map(id => getUserNameByEmployeeId(id)))
      .then(setNames)
  }, [supportIds])

  return <span>{names.join(', ')}</span>
}

// Helper functions for bug styling
const getBugSeverityColor = (severity: string) => {
  switch (severity) {
    case 'Critical': return 'bg-red-100 text-red-800 border-red-200'
    case 'Major': return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'Minor': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getBugStatusColor = (status: string) => {
  switch (status) {
    case 'New': return 'bg-yellow-100 text-yellow-800'
    case 'In Progress': return 'bg-blue-100 text-blue-800'
    case 'Resolved': return 'bg-green-100 text-green-800'
    case 'Closed': return 'bg-gray-100 text-gray-800'
    case 'Reopened': return 'bg-purple-100 text-purple-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

interface UnifiedWorkItemsListProps {
  tasks: Task[]
  bugs: Bug[]
  title: string
  showAssignee?: boolean
  allowEdit?: boolean
  onTaskUpdate?: () => void
}

export default function UnifiedWorkItemsList({
  tasks,
  bugs,
  title,
  showAssignee = false,
  allowEdit = false,
  onTaskUpdate
}: UnifiedWorkItemsListProps) {
  const [typeFilter, setTypeFilter] = useState<string>('all') // all, tasks, bugs
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const currentUser = getCurrentUser()
  const { settings, isLoading: isLoadingSettings } = useSettings()

  if (!currentUser) {
    return <div>Loading...</div>
  }

  // Get status options from settings context
  const taskStatusOptions = settings?.task_status || []
  const bugStatusOptions = settings?.bug_status || []

  // Combine tasks and bugs into unified list
  const workItems = [
    ...tasks.map(task => ({ ...task, itemType: 'task' as const })),
    ...bugs.map(bug => ({ ...bug, itemType: 'bug' as const }))
  ]

  // Filter work items
  const filteredItems = workItems.filter(item => {
    // Type filter
    if (typeFilter === 'tasks' && item.itemType !== 'task') return false
    if (typeFilter === 'bugs' && item.itemType !== 'bug') return false

    // Status filter
    if (statusFilter !== 'all' && item.status !== statusFilter) return false

    return true
  })

  // Sort by creation date
  const sortedItems = filteredItems.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime()
    const dateB = new Date(b.createdAt).getTime()
    return dateB - dateA
  })

  // Get all unique statuses from both tasks and bugs
  const allStatuses = Array.from(new Set([...taskStatusOptions, ...bugStatusOptions]))

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    ...allStatuses.map(status => ({
      value: status,
      label: status === 'Done' ? 'Completed' : status === 'Hold' ? 'On Hold' : status
    }))
  ]

  return (
    <div className="card">
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-black">
            {title} ({filteredItems.length})
          </h3>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Type Filter - Button Group */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <span className="text-sm font-medium text-black">Type:</span>
            <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  typeFilter === 'all'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                All Items ({workItems.length})
              </button>
              <button
                onClick={() => setTypeFilter('tasks')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  typeFilter === 'tasks'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Tasks ({tasks.length})
              </button>
              <button
                onClick={() => setTypeFilter('bugs')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  typeFilter === 'bugs'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Bugs ({bugs.length})
              </button>
            </div>
          </div>

          {/* Status Filter - Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="status-filter" className="text-sm font-medium text-black">
              Status:
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field w-auto min-w-[150px]"
              disabled={isLoadingSettings}
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No items found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedItems.map((item) => {
            if (item.itemType === 'task') {
              const task = item as Task & { itemType: 'task' }
              const isOwner = isTaskOwner(task, currentUser.employeeId)
              const isSupporter = isTaskSupporter(task, currentUser.employeeId)

              return (
                <div
                  key={`task-${task.id}`}
                  className={`border rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow ${
                    isOwner ? 'border-primary-300 bg-primary-50' :
                    isSupporter ? 'border-blue-300 bg-blue-50' :
                    'border-gray-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <CheckSquare className="h-4 w-4 text-primary" />
                        <span className="font-mono text-sm text-primary font-medium">
                          {task.taskId}
                        </span>

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

                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        {isTaskOverdue(task) && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-200 text-red-800">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Overdue
                          </span>
                        )}

                        <SupportTaskBadge
                          task={task}
                          currentUserId={currentUser.employeeId}
                        />
                      </div>

                      <h4 className="font-medium text-black mb-2 text-sm sm:text-base break-words">
                        {task.description}
                      </h4>

                      {task.subTask && (
                        <div className="mb-2 p-2 bg-blue-50 rounded text-xs sm:text-sm break-words">
                          <span className="font-medium text-blue-800">SubTask:</span>
                          <span className="text-blue-700 ml-1">{task.subTask}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                        {showAssignee && (
                          <div className="flex items-center space-x-1">
                            <User className="h-4 w-4" />
                            <span>Assigned to: <UserName employeeId={task.assignedTo} /></span>
                          </div>
                        )}

                        {task.assignedBy && task.assignedBy !== task.assignedTo && (
                          <div className="flex items-center space-x-1">
                            <User className="h-4 w-4 text-blue-500" />
                            <span>Assigned by: <UserName employeeId={task.assignedBy} /></span>
                          </div>
                        )}

                        {task.support && task.support.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span>Support: <SupportTeam supportIds={task.support} /></span>
                          </div>
                        )}

                        <div className="flex items-center space-x-1">
                          <Calendar className={`h-4 w-4 ${isTaskOverdue(task) ? 'text-red-500' : ''}`} />
                          <span className={isTaskOverdue(task) ? 'text-red-600 font-medium' : ''}>
                            {formatDate(task.startDate)} - {formatDate(task.endDate)}
                            {isTaskOverdue(task) && ' (Overdue)'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>
                            {task.actualHours || 0}h / {task.estimatedHours}h
                          </span>
                        </div>
                      </div>
                    </div>

                    {allowEdit && (
                      <button
                        onClick={() => {
                          setSelectedTask(task)
                          setIsModalOpen(true)
                        }}
                        className="sm:ml-4 p-2 text-primary hover:bg-primary-50 rounded-lg transition-colors flex-shrink-0"
                        title="Update task"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            } else {
              // Bug item
              const bug = item as Bug & { itemType: 'bug' }

              return (
                <div
                  key={`bug-${bug.bugId}`}
                  className={`border rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow bg-white ${getBugSeverityColor(bug.severity)}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <BugIcon className="h-4 w-4 text-red-600" />
                        <span className="font-mono text-sm text-primary font-medium">
                          {bug.bugId}
                        </span>

                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBugSeverityColor(bug.severity)}`}>
                          {bug.severity === 'Critical' && '🔴 '}
                          {bug.severity === 'Major' && '🟠 '}
                          {bug.severity === 'Minor' && '🟡 '}
                          {bug.severity}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBugStatusColor(bug.status)}`}>
                          {bug.status === 'New' && '🆕 '}
                          {bug.status === 'In Progress' && '⏳ '}
                          {bug.status === 'Resolved' && '✅ '}
                          {bug.status === 'Closed' && '🔒 '}
                          {bug.status === 'Reopened' && '🔄 '}
                          {bug.status}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {bug.priority}
                        </span>
                      </div>

                      <h4 className="font-medium text-black mb-1 text-sm sm:text-base break-words">
                        {bug.title}
                      </h4>

                      {bug.description && (
                        <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2 break-words">
                          {bug.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Tag className="h-4 w-4" />
                          <span>Category: {bug.category}</span>
                        </div>

                        {bug.assignedTo && (
                          <div className="flex items-center space-x-1">
                            <User className="h-4 w-4" />
                            <span>Assigned to: <UserName employeeId={bug.assignedTo} /></span>
                          </div>
                        )}

                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4 text-blue-500" />
                          <span>Reported by: <UserName employeeId={bug.reportedBy} /></span>
                        </div>

                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>Created: {new Date(bug.createdAt).toLocaleDateString()}</span>
                        </div>

                        {bug.platform && (
                          <div className="flex items-center space-x-1">
                            <FileText className="h-4 w-4" />
                            <span>Platform: {bug.platform}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            }
          })}
        </div>
      )}

      {/* Task Update Modal */}
      {selectedTask && (
        <TaskUpdateModal
          task={selectedTask}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedTask(null)
          }}
          onUpdate={() => {
            setIsModalOpen(false)
            setSelectedTask(null)
            if (onTaskUpdate) {
              onTaskUpdate()
            }
          }}
        />
      )}
    </div>
  )
}

