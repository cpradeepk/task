'use client'

import { useState } from 'react'
import ChecklistList from './ChecklistList'
import ChecklistForm from './ChecklistForm'
import { ChevronDown, ChevronRight, ListTodo } from 'lucide-react'

interface ChecklistManagerProps {
  parentTaskId: string
  createdBy: string
  editable?: boolean
  showAssignee?: boolean
  defaultExpanded?: boolean
  compact?: boolean
}

export default function ChecklistManager({
  parentTaskId,
  createdBy,
  editable = false,
  showAssignee = true,
  defaultExpanded = true,
  compact = false
}: ChecklistManagerProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleUpdate = () => {
    // Trigger refresh of checklist
    setRefreshKey(prev => prev + 1)
  }

  if (compact) {
    return (
      <div className="space-y-3">
        <ChecklistList
          key={refreshKey}
          parentTaskId={parentTaskId}
          onUpdate={handleUpdate}
          editable={editable}
          showAssignee={showAssignee}
        />
        {editable && (
          <ChecklistForm
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
          <span className="font-medium text-gray-900">Checklists</span>
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
          <ChecklistList
            key={refreshKey}
            parentTaskId={parentTaskId}
            onUpdate={handleUpdate}
            editable={editable}
            showAssignee={showAssignee}
          />

          {editable && (
            <div className="pt-4 border-t border-gray-200">
              <ChecklistForm
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

