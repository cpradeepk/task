'use client'

import { useState, useEffect } from 'react'
import { User as UserIcon } from 'lucide-react'
import { getUserNameByEmployeeId } from '@/lib/auth'

interface AssigneeListProps {
  assignedTo: string | string[] // Support both old (string) and new (array) format
  className?: string
  showIcon?: boolean
  maxDisplay?: number // Maximum number of assignees to display before showing "+N more"
}

/**
 * Component to display task assignees
 * Supports both single assignee (string) and multiple assignees (array)
 * Handles backward compatibility with old data format
 */
export default function AssigneeList({ 
  assignedTo, 
  className = '', 
  showIcon = true,
  maxDisplay = 3 
}: AssigneeListProps) {
  const [assigneeNames, setAssigneeNames] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadAssigneeNames = async () => {
      setIsLoading(true)
      
      // Convert to array if it's a string (backward compatibility)
      const assigneeIds = Array.isArray(assignedTo) ? assignedTo : [assignedTo]
      
      // Fetch all assignee names
      const names = await Promise.all(
        assigneeIds.map(id => getUserNameByEmployeeId(id))
      )
      
      setAssigneeNames(names)
      setIsLoading(false)
    }

    loadAssigneeNames()
  }, [assignedTo])

  if (isLoading) {
    return <span className={className}>Loading...</span>
  }

  if (assigneeNames.length === 0) {
    return <span className={className}>Unassigned</span>
  }

  // Single assignee - display normally
  if (assigneeNames.length === 1) {
    return (
      <span className={className}>
        {showIcon && <UserIcon className="h-4 w-4 inline mr-1" />}
        {assigneeNames[0]}
      </span>
    )
  }

  // Multiple assignees - display with "+N more" if needed
  const displayNames = assigneeNames.slice(0, maxDisplay)
  const remainingCount = assigneeNames.length - maxDisplay

  return (
    <span className={className}>
      {showIcon && <UserIcon className="h-4 w-4 inline mr-1" />}
      {displayNames.join(', ')}
      {remainingCount > 0 && (
        <span className="text-gray-500"> +{remainingCount} more</span>
      )}
    </span>
  )
}

/**
 * Component to display assignees as badges/chips
 */
export function AssigneeBadges({ 
  assignedTo, 
  className = '' 
}: { 
  assignedTo: string | string[]
  className?: string 
}) {
  const [assigneeNames, setAssigneeNames] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadAssigneeNames = async () => {
      setIsLoading(true)
      
      // Convert to array if it's a string (backward compatibility)
      const assigneeIds = Array.isArray(assignedTo) ? assignedTo : [assignedTo]
      
      // Fetch all assignee names
      const names = await Promise.all(
        assigneeIds.map(id => getUserNameByEmployeeId(id))
      )
      
      setAssigneeNames(names)
      setIsLoading(false)
    }

    loadAssigneeNames()
  }, [assignedTo])

  if (isLoading) {
    return <span className={className}>Loading...</span>
  }

  if (assigneeNames.length === 0) {
    return <span className={className}>Unassigned</span>
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {assigneeNames.map((name, index) => (
        <span 
          key={index} 
          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
        >
          <UserIcon className="h-3 w-3 mr-1" />
          {name}
        </span>
      ))}
    </div>
  )
}

