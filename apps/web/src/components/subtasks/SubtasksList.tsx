'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Task, Bug } from '@/lib/types'
import { ChevronRight, ChevronDown, Plus, Circle, CheckCircle2 } from 'lucide-react'
import InlineSubtaskCreate from './InlineSubtaskCreate'

interface SubtasksListProps {
  parentId: string
  parentType: 'task' | 'bug'
  parentData: {
    projectId?: string | null
    subprojectId?: string | null
    department?: string | null
    assignedBy: string
    priority?: string
  }
}

export default function SubtasksList({ parentId, parentType, parentData }: SubtasksListProps) {
  const router = useRouter()
  const [subtasks, setSubtasks] = useState<(Task | Bug)[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)
  const [showInlineCreate, setShowInlineCreate] = useState(false)

  useEffect(() => {
    fetchSubtasks()
  }, [parentId, parentType])

  const fetchSubtasks = async () => {
    try {
      setLoading(true)
      const endpoint = parentType === 'task' 
        ? `/api/tasks/subtasks?parentTaskId=${parentId}`
        : `/api/bugs/subtasks?parentDevId=${parentId}`
      
      const response = await fetch(endpoint)
      const data = await response.json()
      
      if (data.success) {
        setSubtasks(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch subtasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'Yet to Start': 'text-gray-500',
      'In Progress': 'text-yellow-500',
      'Done': 'text-green-500',
      'Delayed': 'text-red-500',
      'Hold': 'text-orange-500',
      'Cancel': 'text-gray-400',
      'New': 'text-blue-500',
      'Resolved': 'text-green-500',
      'Closed': 'text-gray-500',
      'Reopened': 'text-orange-500'
    }
    return statusColors[status] || 'text-gray-500'
  }

  const getStatusIcon = (status: string) => {
    if (status === 'Done' || status === 'Resolved' || status === 'Closed') {
      return <CheckCircle2 className="h-4 w-4" />
    }
    return <Circle className="h-4 w-4" />
  }

  const handleSubtaskClick = (subtask: Task | Bug) => {
    if (parentType === 'task') {
      router.push(`/tasks/${(subtask as Task).taskId}`)
    } else {
      router.push(`/bugs/${(subtask as Bug).bugId}`)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div className="h-12 bg-gray-100 rounded mb-2"></div>
        <div className="h-12 bg-gray-100 rounded"></div>
      </div>
    )
  }

  if (subtasks.length === 0 && !showInlineCreate) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Subtasks</h3>
          <button
            onClick={() => setShowInlineCreate(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Subtask
          </button>
        </div>
        <p className="text-sm text-gray-500 text-center py-4">
          No subtasks yet. Click "Add Subtask" to create one.
        </p>
      </div>
    )
  }

  if (subtasks.length === 0 && showInlineCreate) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Subtasks</h3>
        </div>
        <InlineSubtaskCreate
          parentId={parentId}
          parentType={parentType}
          parentData={parentData}
          onCancel={() => setShowInlineCreate(false)}
          onSuccess={() => {
            setShowInlineCreate(false)
            fetchSubtasks()
          }}
        />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-lg font-semibold text-gray-900 hover:text-primary transition-colors"
        >
          {expanded ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
          Subtasks ({subtasks.length})
        </button>
        <button
          onClick={() => setShowInlineCreate(!showInlineCreate)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Subtask
        </button>
      </div>

      {/* Inline Create Form */}
      {expanded && showInlineCreate && (
        <div className="p-4 border-b border-gray-200">
          <InlineSubtaskCreate
            parentId={parentId}
            parentType={parentType}
            parentData={parentData}
            onCancel={() => setShowInlineCreate(false)}
            onSuccess={() => {
              setShowInlineCreate(false)
              fetchSubtasks()
            }}
          />
        </div>
      )}

      {/* Subtasks List */}
      {expanded && (
        <div className="divide-y divide-gray-100 p-2">
          {subtasks.map((subtask) => {
            const isTask = 'taskId' in subtask
            const id = isTask ? (subtask as Task).taskId : (subtask as Bug).bugId
            const name = isTask ? (subtask as Task).name : (subtask as Bug).title
            const status = subtask.status

            return (
              <div
                key={id}
                onClick={() => handleSubtaskClick(subtask)}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors group"
              >
                <div className={`${getStatusColor(status)}`}>
                  {getStatusIcon(status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-primary transition-colors truncate">
                    {name}
                  </p>
                  <p className="text-xs text-gray-500">{id}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  status === 'Done' || status === 'Resolved' || status === 'Closed'
                    ? 'bg-green-100 text-green-800'
                    : status === 'In Progress'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {status}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

