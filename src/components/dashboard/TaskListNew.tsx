'use client'

import { useState, useEffect } from 'react'
import { Task } from '@/lib/types'
import { formatDate, getStatusColor, getPriorityColor, isTaskOwner, isTaskSupporter } from '@/lib/data'
import { getUserNameByEmployeeId, getCurrentUser } from '@/lib/auth'
import { Clock, Calendar, User, AlertCircle, Edit, Users, Crown, Heart, Plus } from 'lucide-react'
import TaskUpdateModal from '@/components/tasks/TaskUpdateModal'
import SupportTaskIndicator from '@/components/tasks/SupportTaskIndicator'
import SupportTaskBadge from '@/components/tasks/SupportTaskBadge'
import SupportTaskService from '@/lib/supportTaskService'

// Helper function to check if task is overdue
function isTaskOverdue(task: Task): boolean {
  const today = new Date()
  const endDate = new Date(task.endDate)
  // Task is only overdue when today is AFTER the end date, not on the end date
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

interface TaskListProps {
  tasks: Task[]
  title: string
  showAssignee?: boolean
  allowEdit?: boolean
  onTaskUpdate?: () => void
}

export default function TaskList({
  tasks,
  title,
  showAssignee = false,
  allowEdit = false,
  onTaskUpdate
}: TaskListProps) {
  const [filter, setFilter] = useState<string>('all')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const currentUser = getCurrentUser()
  if (!currentUser) {
    return <div>Loading...</div>
  }

  console.log('TaskList Debug:', {
    allowEdit,
    currentUser: currentUser.employeeId,
    tasksCount: tasks.length
  })

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true
    return task.status === filter
  })

  const statusOptions = [
    { value: 'all', label: 'All Tasks' },
    { value: 'Yet to Start', label: 'Yet to Start' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Done', label: 'Completed' },
    { value: 'Delayed', label: 'Delayed' },
    { value: 'Hold', label: 'On Hold' }
  ]

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h3 className="text-lg font-semibold text-black mb-4 sm:mb-0">
          {title} ({filteredTasks.length})
        </h3>

        <div className="flex items-center space-x-2">
          <label htmlFor="status-filter" className="text-sm font-medium text-black">
            Filter:
          </label>
          <select
            id="status-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input-field w-auto"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No tasks found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => {
            const isOwner = isTaskOwner(task, currentUser.employeeId)
            const isSupporter = isTaskSupporter(task, currentUser.employeeId)

            return (
              <div
                key={task.id}
                className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                  isOwner ? 'border-primary-300 bg-primary-50' :
                  isSupporter ? 'border-blue-300 bg-blue-50' :
                  'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-mono text-sm text-primary font-medium">
                        {task.taskId}
                      </span>

                      {/* Task ownership indicator */}
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

                      {/* Support Task Badge */}
                      <SupportTaskBadge
                        task={task}
                        currentUserId={currentUser.employeeId}
                      />
                    </div>

                    <h4 className="font-medium text-black mb-2">
                      {task.description}
                    </h4>



                    {task.subTask && (
                      <div className="mb-2 p-2 bg-blue-50 rounded text-sm">
                        <span className="font-medium text-blue-800">SubTask:</span>
                        <span className="text-blue-700 ml-1">{task.subTask}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
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

                    {task.remarks && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-black">
                        <strong>Remarks:</strong> {task.remarks}
                      </div>
                    )}

                    {task.difficulties && (
                      <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                        <strong>Difficulties:</strong> {task.difficulties}
                      </div>
                    )}

                    {/* Hours Worked */}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          Hours Worked: <span className="font-medium text-black">{task.actualHours || 0}h</span>
                        </span>
                      </div>
                      {(isTaskOwner(task, currentUser.employeeId) || isTaskSupporter(task, currentUser.employeeId)) && (
                        <button
                          onClick={() => {
                            // This will be handled by the task update modal
                            setSelectedTask(task)
                            setIsModalOpen(true)
                          }}
                          className="text-xs bg-primary text-white px-2 py-1 rounded hover:bg-primary-dark transition-colors flex items-center space-x-1"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Add Hours</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {allowEdit && (
                    <button
                      onClick={() => {
                        console.log('Edit button clicked for task:', task.taskId)
                        setSelectedTask(task)
                        setIsModalOpen(true)
                      }}
                      className="ml-4 p-2 text-gray-600 hover:text-primary hover:bg-primary-50 rounded-lg transition-colors"
                      title="Edit Task"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <TaskUpdateModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedTask(null)
        }}
        onUpdate={() => {
          if (onTaskUpdate) onTaskUpdate()
        }}
      />
    </div>
  )
}
