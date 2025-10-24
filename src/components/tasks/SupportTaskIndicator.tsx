'use client'

import { useState, useEffect } from 'react'
import { Users, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import SupportTaskService from '@/lib/supportTaskService'

interface SupportTaskIndicatorProps {
  taskId: string
  isMainTask?: boolean
  className?: string
}

interface SupportSummary {
  totalSupportTasks: number
  completedSupportTasks: number
  totalSupportHours: number
  supportMembers: Array<{
    employeeId: string
    name: string
    taskId: string
    status: string
    hours: number
  }>
}

export default function SupportTaskIndicator({ 
  taskId, 
  isMainTask = true, 
  className = '' 
}: SupportTaskIndicatorProps) {
  const [supportSummary, setSupportSummary] = useState<SupportSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (isMainTask) {
      loadSupportSummary()
    }
  }, [taskId, isMainTask])

  const loadSupportSummary = async () => {
    try {
      setIsLoading(true)
      const summary = await SupportTaskService.getSupportTaskSummary(taskId)
      setSupportSummary(summary)
    } catch (error) {
      console.error('Failed to load support summary:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isMainTask || isLoading || !supportSummary || supportSummary.totalSupportTasks === 0) {
    return null
  }

  const completionPercentage = supportSummary.totalSupportTasks > 0 
    ? Math.round((supportSummary.completedSupportTasks / supportSummary.totalSupportTasks) * 100)
    : 0

  return (
    <div className={`${className}`}>
      {/* Support Summary Badge */}
      <div 
        className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
        onClick={() => setShowDetails(!showDetails)}
      >
        <Users className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-blue-800">
          {supportSummary.totalSupportTasks} Support Tasks
        </span>
        <div className="flex items-center space-x-1">
          <CheckCircle className="h-3 w-3 text-green-600" />
          <span className="text-xs text-blue-700">{completionPercentage}%</span>
        </div>
      </div>

      {/* Detailed Support Information */}
      {showDetails && (
        <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-800">Support Team Progress</h4>
            <div className="flex items-center space-x-4 text-xs text-gray-600">
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{supportSummary.totalSupportHours}h total</span>
              </div>
              <div className="flex items-center space-x-1">
                <CheckCircle className="h-3 w-3" />
                <span>{supportSummary.completedSupportTasks}/{supportSummary.totalSupportTasks} done</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Overall Progress</span>
              <span>{completionPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Support Members List */}
          <div className="space-y-2">
            {supportSummary.supportMembers.map((member, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {member.status === 'Done' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : member.status === 'In Progress' ? (
                      <Clock className="h-4 w-4 text-blue-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.taskId}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-800">{member.hours}h</p>
                  <p className={`text-xs px-2 py-1 rounded-full ${
                    member.status === 'Done' 
                      ? 'bg-green-100 text-green-800'
                      : member.status === 'In Progress'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {member.status}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              💡 Support team members have their own tasks to track hours and progress independently.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
