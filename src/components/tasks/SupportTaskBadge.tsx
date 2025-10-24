'use client'

import { useState, useEffect } from 'react'
import { Users, ExternalLink } from 'lucide-react'
import SupportTaskService from '@/lib/supportTaskService'

interface SupportTaskBadgeProps {
  task: any
  currentUserId: string
  className?: string
}

export default function SupportTaskBadge({ task, currentUserId, className = '' }: SupportTaskBadgeProps) {
  const [supportCount, setSupportCount] = useState(0)
  const [isMainTask, setIsMainTask] = useState(false)
  const [mainTaskId, setMainTaskId] = useState<string | null>(null)

  useEffect(() => {
    checkTaskType()
  }, [task])

  const checkTaskType = async () => {
    try {
      const isSupportTask = SupportTaskService.isSupportTask(task)
      setIsMainTask(!isSupportTask)

      if (isSupportTask) {
        // This is a support task, find the main task
        const mainTask = await SupportTaskService.getMainTaskForSupportTask(task)
        setMainTaskId(mainTask?.taskId || null)
      } else {
        // This is a main task, count support tasks
        const summary = await SupportTaskService.getSupportTaskSummary(task.taskId)
        setSupportCount(summary.totalSupportTasks)
      }
    } catch (error) {
      console.error('Error checking task type:', error)
      // Set safe defaults on error
      setIsMainTask(false)
      setSupportCount(0)
      setMainTaskId(null)
    }
  }

  if (isMainTask && supportCount === 0) {
    return null
  }

  if (isMainTask) {
    // Show support count for main tasks
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ${className}`}>
        <Users className="h-3 w-3 mr-1" />
        {supportCount} Support
      </span>
    )
  } else {
    // Show main task link for support tasks
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 ${className}`}>
        <ExternalLink className="h-3 w-3 mr-1" />
        Supporting {mainTaskId}
      </span>
    )
  }
}
