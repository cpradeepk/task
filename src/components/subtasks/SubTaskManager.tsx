'use client'

import { useState } from 'react'
import SubTaskList from './SubTaskList'
import SubTaskForm from './SubTaskForm'
import { ChevronDown, ChevronRight, ListTodo } from 'lucide-react'

interface SubTaskManagerProps {
  parentTaskId: string
  createdBy: string
  editable?: boolean
  showAssignee?: boolean
  defaultExpanded?: boolean
  compact?: boolean
}

export default function SubTaskManager({
  parentTaskId,
  createdBy,
  editable = false,
  showAssignee = true,
  defaultExpanded = true,
  compact = false
}: SubTaskManagerProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleUpdate = () => {
    // Trigger refresh of subtask list
    setRefreshKey(prev => prev + 1)
  }

  if (compact) {
    return (
      <div className="space-y-3">
        <SubTaskList
          key={refreshKey}
          parentTaskId={parentTaskId}
          onUpdate={handleUpdate}
          editable={editable}
          showAssignee={showAssignee}
        />
        {editable && (
          <SubTaskForm
            parentTaskId={parentTaskId}
            createdBy={createdBy}
            onSuccess={handleUpdate}
            compact={true}
          />
        )}
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <ListTodo className="h-5 w-5 text-gray-600" />
          <span className="font-medium text-gray-900">Subtasks</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-gray-600" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-600" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-4 bg-white">
          <SubTaskList
            key={refreshKey}
            parentTaskId={parentTaskId}
            onUpdate={handleUpdate}
            editable={editable}
            showAssignee={showAssignee}
          />
          
          {editable && (
            <div className="pt-4 border-t border-gray-200">
              <SubTaskForm
                parentTaskId={parentTaskId}
                createdBy={createdBy}
                onSuccess={handleUpdate}
                compact={false}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

