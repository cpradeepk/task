'use client'

import { useState, useEffect, useCallback } from 'react'
import { ActivityLog } from '@/lib/db/activityLog'

interface UnifiedTimelineProps {
  entityType: 'task' | 'bug' | 'leave' | 'wfh'
  entityId: string
  showCommentInput?: boolean
  sortOrder?: 'asc' | 'desc'
  autoRefresh?: boolean
  refreshInterval?: number // in milliseconds
  filterFn?: (activity: ActivityLog) => boolean // Optional filter function
  showActivity?: boolean // Filter state for activity
  showComments?: boolean // Filter state for comments
  onToggleActivity?: () => void // Toggle activity filter
  onToggleComments?: () => void // Toggle comments filter
}

/**
 * UnifiedTimeline Component
 * Displays a unified timeline of system activities and user comments
 * 
 * @example
 * <UnifiedTimeline 
 *   entityType="task" 
 *   entityId="JSR-001"
 *   showCommentInput={true}
 *   sortOrder="desc"
 * />
 */
export default function UnifiedTimeline({
  entityType,
  entityId,
  showCommentInput = true,
  sortOrder = 'desc',
  autoRefresh = false,
  refreshInterval = 30000, // 30 seconds
  filterFn,
  showActivity = false,
  showComments = true,
  onToggleActivity,
  onToggleComments
}: UnifiedTimelineProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Apply filter if provided
  const filteredActivities = filterFn ? activities.filter(filterFn) : activities

  // Fetch activities
  const fetchActivities = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch(
        `/api/activity-log?entityType=${entityType}&entityId=${entityId}&sortOrder=${sortOrder}`,
        { credentials: 'include' }
      )
      const data = await response.json()

      if (data.success) {
        setActivities(data.data)
      } else {
        setError(data.error || 'Failed to load timeline')
      }
    } catch (err) {
      console.error('Error fetching activities:', err)
      setError('Failed to load timeline')
    } finally {
      setIsLoading(false)
    }
  }, [entityType, entityId, sortOrder])

  // Initial load
  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchActivities()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchActivities])

  // Submit comment
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!commentText.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/activity-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          entityType,
          entityId,
          actionType: 'comment',
          description: commentText.trim(),
          isComment: true
        })
      })

      const data = await response.json()

      if (data.success) {
        setCommentText('')
        await fetchActivities() // Refresh timeline
      } else {
        alert(data.error || 'Failed to add comment')
      }
    } catch (err) {
      console.error('Error adding comment:', err)
      alert('Failed to add comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete comment
  const handleDeleteComment = async (activityId: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      const response = await fetch(`/api/activity-log/${activityId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        await fetchActivities() // Refresh timeline
      } else {
        alert(data.error || 'Failed to delete comment')
      }
    } catch (err) {
      console.error('Error deleting comment:', err)
      alert('Failed to delete comment')
    }
  }

  // Format relative time
  const formatRelativeTime = (timestamp: string): string => {
    const now = new Date()

    // MySQL returns timestamps in UTC format like "2025-10-30 14:55:09"
    // We need to explicitly treat them as UTC, not local time
    // Add 'Z' suffix to indicate UTC if not already present
    const utcTimestamp = timestamp.includes('Z') || timestamp.includes('+')
      ? timestamp
      : timestamp.replace(' ', 'T') + 'Z'

    const then = new Date(utcTimestamp)
    const diffMs = now.getTime() - then.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSecs < 60) return 'just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

    return then.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: now.getFullYear() !== then.getFullYear() ? 'numeric' : undefined
    })
  }

  // Get icon for activity type
  const getActivityIcon = (actionType: string): string => {
    const icons: Record<string, string> = {
      comment: '💬',
      status_change: '🔄',
      field_update: '✏️',
      assignment_change: '👥',
      time_logged: '⏱️',
      timer_started: '▶️',
      timer_stopped: '⏹️',
      timer_paused: '⏸️',
      created: '✨',
      deleted: '🗑️',
      priority_change: '🎯',
      estimated_hours_change: '📊'
    }
    return icons[actionType] || '📝'
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Comment Input */}
      {showCommentInput && (
        <form onSubmit={handleSubmitComment} className="bg-white rounded-lg border border-gray-200 p-4">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            disabled={isSubmitting}
          />
          <div className="flex justify-between items-center mt-2">
            {/* Filter Toggles - Left aligned */}
            {onToggleActivity && onToggleComments && (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onToggleActivity}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    showActivity
                      ? 'bg-orange-500 text-white hover:bg-orange-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Activity
                </button>
                <button
                  type="button"
                  onClick={onToggleComments}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    showComments
                      ? 'bg-orange-500 text-white hover:bg-orange-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Comments
                </button>
              </div>
            )}

            {/* Post Comment Button - Right aligned */}
            <button
              type="submit"
              disabled={isSubmitting || !commentText.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </form>
      )}

      {/* Timeline */}
      <div className="space-y-3">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {activities.length === 0 ? 'No activity yet. Be the first to comment!' : 'No activities match the current filter.'}
          </div>
        ) : (
          filteredActivities.map((activity) => (
            <div
              key={activity.id}
              className={`rounded-lg border p-4 ${
                activity.isComment
                  ? 'bg-white border-gray-200'
                  : 'bg-gray-50 border-gray-100'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Icon/Avatar */}
                <div className="flex-shrink-0">
                  {activity.isComment ? (
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                      {activity.userName?.charAt(0).toUpperCase() || '?'}
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xl">
                      {getActivityIcon(activity.actionType)}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">
                      {activity.isComment ? activity.userName : 'System'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatRelativeTime(activity.createdAt)}
                    </span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap break-words">
                    {activity.description}
                  </p>
                </div>

                {/* Delete button for comments */}
                {activity.isComment && (
                  <button
                    onClick={() => handleDeleteComment(activity.id)}
                    className="flex-shrink-0 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete comment"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

