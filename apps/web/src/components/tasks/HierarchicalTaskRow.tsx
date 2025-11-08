'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Task } from '@/lib/types'
import { ChevronRight, ChevronDown, Circle, CheckCircle2 } from 'lucide-react'
import AssigneeList from './AssigneeList'
import SupportTeam from './SupportTeam'
import TimerButton from '@/components/TimerButton'

interface HierarchicalTaskRowProps {
  task: Task
  currentUserId: string
  level?: number
  getStatusColor: (status: string) => string
  getPriorityColor: (priority: string) => string
  getStatusIcon: (status: string) => React.ReactElement
  ProjectDisplay: React.ComponentType<{ project?: { projectId: string; projectName: string; description?: string } | null }>
}

export default function HierarchicalTaskRow({
  task,
  currentUserId,
  level = 0,
  getStatusColor,
  getPriorityColor,
  getStatusIcon,
  ProjectDisplay
}: HierarchicalTaskRowProps) {
  const router = useRouter()
  const [subtasks, setSubtasks] = useState<Task[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoadingSubtasks, setIsLoadingSubtasks] = useState(false)
  const [hasSubtasks, setHasSubtasks] = useState(false)

  // Check if current user is in support array
  const isSupportTask = task.support && Array.isArray(task.support) && task.support.includes(currentUserId)

  // Check if task has subtasks
  useEffect(() => {
    const checkSubtasks = async () => {
      try {
        const response = await fetch(`/api/tasks/subtasks?parentTaskId=${task.taskId}`)
        const data = await response.json()
        if (data.success && data.data && data.data.length > 0) {
          setHasSubtasks(true)
        }
      } catch (error) {
        console.error('Failed to check subtasks:', error)
      }
    }
    checkSubtasks()
  }, [task.taskId])

  // Load subtasks when expanded
  useEffect(() => {
    if (isExpanded && !isLoadingSubtasks && subtasks.length === 0) {
      loadSubtasks()
    }
  }, [isExpanded])

  const loadSubtasks = async () => {
    try {
      setIsLoadingSubtasks(true)
      const response = await fetch(`/api/tasks/subtasks?parentTaskId=${task.taskId}`)
      const data = await response.json()
      if (data.success) {
        setSubtasks(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load subtasks:', error)
    } finally {
      setIsLoadingSubtasks(false)
    }
  }

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  const handleTaskClick = () => {
    router.push(`/tasks/${task.taskId}`)
  }

  const indentClass = level > 0 ? `ml-${level * 8}` : ''
  const indentStyle = level > 0 ? { marginLeft: `${level * 2}rem` } : {}

  return (
    <>
      <div
        style={indentStyle}
        className={`rounded-xl p-6 border shadow-sm hover:shadow-md transition-all duration-200 ${
          isSupportTask
            ? 'bg-amber-50 border-amber-200 hover:border-amber-300'
            : 'bg-white border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              {/* Expand/Collapse Icon */}
              {hasSubtasks && (
                <button
                  onClick={handleToggleExpand}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-600" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-600" />
                  )}
                </button>
              )}
              
              <span className="font-mono text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-lg font-medium">
                {task.taskId}
              </span>
              {isSupportTask && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                  Support
                </span>
              )}
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1 ${getStatusColor(task.status)}`}>
                {getStatusIcon(task.status)}
                <span>{task.status}</span>
              </span>
            </div>

            <div className="mb-2">
              <h3
                onClick={handleTaskClick}
                className="text-lg font-semibold text-gray-900 hover:text-primary cursor-pointer transition-colors break-words overflow-wrap-anywhere"
              >
                {task.name}
              </h3>
            </div>

            <div className="flex flex-col space-y-1 text-sm text-gray-600 mb-3">
              <div className="flex items-center space-x-4">
                <AssigneeList assignedTo={task.assignedTo} />
                <ProjectDisplay project={(task as any).project} />
              </div>
              {task.support && task.support.length > 0 && (
                <div className="flex items-center">
                  <span className="text-gray-500 mr-1">Support:</span>
                  <SupportTeam supportIds={task.support} showIcon={false} />
                </div>
              )}
            </div>
          </div>

          <div className="ml-4 flex items-center space-x-2">
            {/* Timer Button - Hidden for Done/Cancel/Stop statuses */}
            {task.status !== 'Done' && task.status !== 'Cancel' && task.status !== 'Stop' && (
              <TimerButton
                entityType="task"
                entityId={task.taskId}
                entityTitle={task.name || task.description}
                status={task.status}
                size="md"
                showLabel={false}
              />
            )}

            <button
              onClick={handleTaskClick}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              View Details
            </button>
          </div>
        </div>
      </div>

      {/* Render subtasks */}
      {isExpanded && subtasks.length > 0 && (
        <div className="space-y-4 mt-4">
          {subtasks.map((subtask) => (
            <HierarchicalTaskRow
              key={subtask.taskId}
              task={subtask}
              currentUserId={currentUserId}
              level={level + 1}
              getStatusColor={getStatusColor}
              getPriorityColor={getPriorityColor}
              getStatusIcon={getStatusIcon}
              ProjectDisplay={ProjectDisplay}
            />
          ))}
        </div>
      )}
    </>
  )
}

