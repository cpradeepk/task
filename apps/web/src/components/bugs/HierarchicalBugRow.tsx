'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bug } from '@/lib/types'
import { ChevronRight, ChevronDown } from 'lucide-react'

interface HierarchicalBugRowProps {
  bug: Bug
  level?: number
  getStatusColor: (status: string) => string
  getPriorityColor: (priority: string) => string
  getSeverityColor: (severity: string) => string
  getStatusIcon: (status: string) => React.ReactElement
  UserName: React.ComponentType<{ employeeId: string }>
  ProjectDisplay: React.ComponentType<{ projectId?: string | null }>
}

export default function HierarchicalBugRow({
  bug,
  level = 0,
  getStatusColor,
  getPriorityColor,
  getSeverityColor,
  getStatusIcon,
  UserName,
  ProjectDisplay
}: HierarchicalBugRowProps) {
  const router = useRouter()
  const [subtasks, setSubtasks] = useState<Bug[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoadingSubtasks, setIsLoadingSubtasks] = useState(false)
  const [hasSubtasks, setHasSubtasks] = useState(false)

  // Check if bug has subtasks
  useEffect(() => {
    const checkSubtasks = async () => {
      try {
        const response = await fetch(`/api/bugs/subtasks?parentDevId=${bug.bugId}`)
        const data = await response.json()
        if (data.success && data.data && data.data.length > 0) {
          setHasSubtasks(true)
        }
      } catch (error) {
        console.error('Failed to check subtasks:', error)
      }
    }
    checkSubtasks()
  }, [bug.bugId])

  // Load subtasks when expanded
  useEffect(() => {
    if (isExpanded && !isLoadingSubtasks && subtasks.length === 0) {
      loadSubtasks()
    }
  }, [isExpanded])

  const loadSubtasks = async () => {
    try {
      setIsLoadingSubtasks(true)
      const response = await fetch(`/api/bugs/subtasks?parentDevId=${bug.bugId}`)
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

  const handleBugClick = () => {
    router.push(`/bugs/${bug.bugId}`)
  }

  const indentStyle = level > 0 ? { marginLeft: `${level * 2}rem` } : {}

  return (
    <>
      <div
        style={indentStyle}
        className="rounded-xl p-6 border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 hover:border-gray-300"
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
                {bug.bugId}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(bug.priority)}`}>
                {bug.priority}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSeverityColor(bug.severity)}`}>
                {bug.severity}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1 ${getStatusColor(bug.status)}`}>
                {getStatusIcon(bug.status)}
                <span>{bug.status}</span>
              </span>
            </div>

            <div className="mb-2">
              <h3
                onClick={handleBugClick}
                className="text-lg font-semibold text-gray-900 hover:text-primary cursor-pointer transition-colors break-words overflow-wrap-anywhere"
              >
                {bug.title}
              </h3>
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
              {bug.assignedTo && (
                <div className="flex items-center space-x-1">
                  <span className="font-medium">Assigned to:</span>
                  <UserName employeeId={bug.assignedTo} />
                </div>
              )}
              <ProjectDisplay projectId={bug.projectId} />
            </div>
          </div>

          <button
            onClick={handleBugClick}
            className="ml-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            View Details
          </button>
        </div>
      </div>

      {/* Render subtasks */}
      {isExpanded && subtasks.length > 0 && (
        <div className="space-y-4 mt-4">
          {subtasks.map((subtask) => (
            <HierarchicalBugRow
              key={subtask.bugId}
              bug={subtask}
              level={level + 1}
              getStatusColor={getStatusColor}
              getPriorityColor={getPriorityColor}
              getSeverityColor={getSeverityColor}
              getStatusIcon={getStatusIcon}
              UserName={UserName}
              ProjectDisplay={ProjectDisplay}
            />
          ))}
        </div>
      )}
    </>
  )
}

