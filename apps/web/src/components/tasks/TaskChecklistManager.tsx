'use client'

import { useState } from 'react'
import TaskChecklistList from './TaskChecklistList'
import TaskChecklistForm from './TaskChecklistForm'
import { ChevronDown, ChevronRight, ListTodo } from 'lucide-react'

interface TaskChecklistManagerProps {
  taskId: string
  canEdit?: boolean
  showAssignee?: boolean
  defaultExpanded?: boolean
  compact?: boolean
}

export default function TaskChecklistManager({
  taskId,
  canEdit = false,
  showAssignee = true,
  defaultExpanded = true,
  compact = false
}: TaskChecklistManagerProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleUpdate = () => {
    // Trigger refresh of checklist
    setRefreshKey(prev => prev + 1)
  }

  if (compact) {
    return (
      <div className="space-y-3">
        <TaskChecklistList
          key={refreshKey}
          taskId={taskId}
          onUpdate={handleUpdate}
          editable={canEdit}
          showAssignee={showAssignee}
        />
        {canEdit && (
          <TaskChecklistForm
            taskId={taskId}
            onSuccess={handleUpdate}
            compact={true}
          />
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <ListTodo className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Checklists</h2>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-6 space-y-4 bg-white border-t border-gray-200">
          <TaskChecklistList
            key={refreshKey}
            taskId={taskId}
            onUpdate={handleUpdate}
            editable={canEdit}
            showAssignee={showAssignee}
          />

          {canEdit && (
            <div className="pt-4 border-t border-gray-200">
              <TaskChecklistForm
                taskId={taskId}
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

