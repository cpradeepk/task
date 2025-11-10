'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ActivityLog } from '@/lib/db/activityLog'
import { Upload, X, Image as ImageIcon, Video, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import RichTextEditor from './RichTextEditor'
import DOMPurify from 'dompurify'
import CollapsibleText from './CollapsibleText'

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
  showPrompts?: boolean // Filter state for prompts
  onToggleActivity?: (exclusive?: boolean) => void // Toggle activity filter (exclusive mode on single-click)
  onToggleComments?: (exclusive?: boolean) => void // Toggle comments filter (exclusive mode on single-click)
  onTogglePrompts?: (exclusive?: boolean) => void // Toggle prompts filter (exclusive mode on single-click)
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
  showPrompts = false,
  onToggleActivity,
  onToggleComments,
  onTogglePrompts
}: UnifiedTimelineProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Collapsible text settings (default values, can be fetched from settings API)
  const [collapsibleSettings, setCollapsibleSettings] = useState({
    maxCharacters: 300,
    maxLines: 5,
    persistState: false
  })

  // Track click timing for double-click detection
  const clickTimerRef = useRef<{ [key: string]: NodeJS.Timeout | null }>({
    activity: null,
    comments: null,
    prompts: null
  })

  // Apply filter if provided
  const filteredActivities = filterFn ? activities.filter(filterFn) : activities

  // Determine if we should show "Post Prompt" button
  // Only show "Post Prompt" when Prompts is the ONLY active filter
  const isPromptMode = showPrompts && !showActivity && !showComments

  // Fetch activities
  const fetchActivities = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch(
        `/api/activity-log?entityType=${entityType}&entityId=${entityId}&sortOrder=${sortOrder}`,
        {
          credentials: 'include',
          cache: 'no-store' // Prevent caching to ensure fresh data
        }
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

  // Fetch collapsible text settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings?keys=collapsible_text_thresholds,collapsible_text_persist_state', {
          credentials: 'include',
          cache: 'no-store'
        })
        const data = await response.json()

        if (data.success && data.data) {
          const thresholds = data.data.collapsible_text_thresholds?.activity_description ||
                           data.data.collapsible_text_thresholds?.default ||
                           { maxCharacters: 300, maxLines: 5 }

          const persistState = data.data.collapsible_text_persist_state?.activity_description ||
                              data.data.collapsible_text_persist_state?.default ||
                              false

          setCollapsibleSettings({
            maxCharacters: thresholds.maxCharacters,
            maxLines: thresholds.maxLines,
            persistState
          })
        }
      } catch (error) {
        console.error('Failed to fetch collapsible text settings:', error)
        // Use default values on error
      }
    }

    fetchSettings()
  }, [])

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

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newFiles = Array.from(files).filter(file => {
      // Get file extension
      const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0]

      // Validate file type - check by extension for better compatibility
      const isValidExtension = ext && [
        '.png', '.jpg', '.jpeg', '.gif', '.webp',  // Images
        '.mp4', '.mov', '.avi', '.webm',           // Videos
        '.txt', '.md', '.prd',                     // Documents
        '.json', '.js', '.jsx', '.ts', '.tsx', '.sql'  // Code files
      ].includes(ext)

      const allowedMimeTypes = [
        // Images
        'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp',
        // Videos
        'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm',
        // Documents
        'text/plain', 'text/markdown', 'application/octet-stream',
        // Code files
        'application/json', 'text/javascript', 'application/javascript',
        'text/jsx', 'text/typescript', 'text/tsx',
        // SQL
        'application/sql', 'text/x-sql'
      ]

      if (!isValidExtension && !allowedMimeTypes.includes(file.type)) {
        alert(`${file.name}: Invalid file type. Supported: images, videos, documents (.md, .txt, .prd), code files (.js, .jsx, .ts, .tsx, .json, .sql)`)
        return false
      }

      // Validate file size (10MB)
      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        alert(`${file.name}: File size exceeds 10MB limit.`)
        return false
      }

      return true
    })

    setUploadedFiles(prev => [...prev, ...newFiles])
  }

  // Remove file
  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Submit comment
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!commentText.trim()) return

    setIsSubmitting(true)
    try {
      let attachmentUrls: string[] = []

      // Upload files if any
      if (uploadedFiles.length > 0) {
        setIsUploading(true)
        try {
          // Step 1: Get presigned URLs
          const presignedResponse = await fetch('/api/upload/presigned-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              uploadType: 'comment',
              files: uploadedFiles.map(f => ({
                name: f.name,
                type: f.type,
                size: f.size
              }))
            })
          })

          const presignedResult = await presignedResponse.json()

          if (!presignedResult.success) {
            throw new Error(presignedResult.error || 'Failed to get upload URLs')
          }

          // Step 2: Upload files directly to S3
          const uploadPromises = presignedResult.uploads.map(async (upload: any, index: number) => {
            const file = uploadedFiles[index]

            const s3Response = await fetch(upload.uploadUrl, {
              method: 'PUT',
              body: file,
              headers: {
                'Content-Type': file.type
              }
            })

            if (!s3Response.ok) {
              throw new Error(`Failed to upload ${file.name} to S3`)
            }

            return upload.fileUrl
          })

          attachmentUrls = await Promise.all(uploadPromises)
        } catch (uploadError) {
          setIsUploading(false)
          throw uploadError
        }

        setIsUploading(false)
      }

      // Determine if we're posting a prompt or comment based on active filters
      const isPostingPrompt = isPromptMode

      const response = await fetch('/api/activity-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          entityType,
          entityId,
          actionType: isPostingPrompt ? 'prompt' : 'comment',
          description: commentText.trim(),
          isComment: !isPostingPrompt, // false for prompts, true for comments
          attachments: attachmentUrls.length > 0 ? attachmentUrls.join(', ') : undefined
        })
      })

      const data = await response.json()

      if (data.success) {
        setCommentText('')
        setUploadedFiles([])
        await fetchActivities() // Refresh timeline
      } else {
        alert(data.error || `Failed to add ${isPostingPrompt ? 'prompt' : 'comment'}`)
      }
    } catch (err) {
      console.error(`Error adding ${isPromptMode ? 'prompt' : 'comment'}:`, err)
      alert(`Failed to add ${isPromptMode ? 'prompt' : 'comment'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete comment or prompt
  const handleDeleteComment = async (activityId: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const response = await fetch(`/api/activity-log/${activityId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        await fetchActivities() // Refresh timeline
      } else {
        alert(data.error || 'Failed to delete item')
      }
    } catch (err) {
      console.error('Error deleting item:', err)
      alert('Failed to delete item')
    }
  }

  // Handle filter button clicks with single-click (exclusive) and double-click (additive) support
  const handleFilterClick = (filterType: 'activity' | 'comments' | 'prompts') => {
    const clickTimer = clickTimerRef.current[filterType]

    if (clickTimer) {
      // Double-click detected - toggle additively
      clearTimeout(clickTimer)
      clickTimerRef.current[filterType] = null

      // Call the toggle handler with exclusive=false for additive mode
      if (filterType === 'activity' && onToggleActivity) {
        onToggleActivity(false)
      } else if (filterType === 'comments' && onToggleComments) {
        onToggleComments(false)
      } else if (filterType === 'prompts' && onTogglePrompts) {
        onTogglePrompts(false)
      }
    } else {
      // Single-click - wait to see if it's a double-click
      clickTimerRef.current[filterType] = setTimeout(() => {
        clickTimerRef.current[filterType] = null

        // Call the toggle handler with exclusive=true for exclusive mode
        if (filterType === 'activity' && onToggleActivity) {
          onToggleActivity(true)
        } else if (filterType === 'comments' && onToggleComments) {
          onToggleComments(true)
        } else if (filterType === 'prompts' && onTogglePrompts) {
          onTogglePrompts(true)
        }
      }, 250) // 250ms delay to detect double-click
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
          <RichTextEditor
            content={commentText}
            onChange={setCommentText}
            placeholder={isPromptMode ? "Write an AI prompt..." : "Add a comment..."}
            minHeight="100px"
          />

          {/* File Upload Section */}
          {uploadedFiles.length > 0 && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="relative group rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                  <div className="aspect-square bg-gray-100 flex items-center justify-center p-2">
                    {file.type.startsWith('image/') ? (
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                    ) : file.type.startsWith('video/') ? (
                      <Video className="h-8 w-8 text-gray-400" />
                    ) : (
                      <FileText className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs text-gray-600 truncate">{file.name}</p>
                    <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center mt-2">
            <div className="flex items-center space-x-2">
              {/* Filter Toggles - Single-click for exclusive, Double-click for additive */}
              {onToggleActivity && onToggleComments && (
                <>
                  <button
                    type="button"
                    onClick={() => handleFilterClick('activity')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      showActivity
                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title="Single-click: Show only Activity | Double-click: Toggle Activity"
                  >
                    Activity
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFilterClick('comments')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      showComments
                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title="Single-click: Show only Comments | Double-click: Toggle Comments"
                  >
                    Comments
                  </button>
                  {onTogglePrompts && (
                    <button
                      type="button"
                      onClick={() => handleFilterClick('prompts')}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        showPrompts
                          ? 'bg-orange-500 text-white hover:bg-orange-600'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title="Single-click: Show only Prompts | Double-click: Toggle Prompts"
                    >
                      Prompts
                    </button>
                  )}
                </>
              )}

              {/* File Upload Button */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".png,.jpg,.jpeg,.gif,.webp,.mp4,.mov,.avi,.webm,.txt,.md,.prd,.json,.js,.jsx,.ts,.tsx,.sql"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting || isUploading}
                className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
              >
                <Upload className="h-4 w-4" />
                <span>Attach</span>
              </button>
            </div>

            {/* Post Comment/Prompt Button - Right aligned, text changes based on active filter */}
            <button
              type="submit"
              disabled={isSubmitting || isUploading || !commentText.trim()}
              className={`px-4 py-2 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors ${
                isPromptMode
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
              title={isPromptMode ? 'Post as AI Prompt' : 'Post as Comment'}
            >
              {isUploading ? 'Uploading...' : isSubmitting ? 'Posting...' : isPromptMode ? 'Post Prompt' : 'Post Comment'}
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
                  {/* Render HTML content safely or plain text with collapsible functionality */}
                  {activity.description && (
                    activity.isComment || activity.actionType === 'prompt' ? (
                      // For comments and prompts, use CollapsibleText with custom button render
                      <CollapsibleText
                        content={activity.description}
                        maxCharacters={collapsibleSettings.maxCharacters}
                        maxLines={collapsibleSettings.maxLines}
                        textClassName="text-gray-700"
                        buttonPosition="right"
                        showGradient={true}
                        gradientColor="white"
                        persistState={collapsibleSettings.persistState}
                        storageKey={collapsibleSettings.persistState ? `activity-${activity.id}-expanded` : undefined}
                        renderHtml={/<[a-z][\s\S]*>/i.test(activity.description)}
                        renderButton={({ isExpanded, needsCollapse, toggleExpanded }) => (
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">
                                {activity.userName || 'Unknown User'}
                              </span>
                              <span className="text-sm text-gray-500">
                                {formatRelativeTime(activity.createdAt)}
                              </span>
                            </div>
                            {needsCollapse && (
                              <button
                                onClick={toggleExpanded}
                                className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary-dark transition-colors flex-shrink-0"
                                aria-label={isExpanded ? 'Show less' : 'Show more'}
                              >
                                {isExpanded ? (
                                  <>
                                    <span>Show less</span>
                                    <ChevronUp className="h-4 w-4" />
                                  </>
                                ) : (
                                  <>
                                    <span>Show more</span>
                                    <ChevronDown className="h-4 w-4" />
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      />
                    ) : (
                      // For system activities, render as before (no collapse)
                      <>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">
                            {activity.userName || 'Unknown User'}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatRelativeTime(activity.createdAt)}
                          </span>
                        </div>
                        {/<[a-z][\s\S]*>/i.test(activity.description) ? (
                          <div
                            className="prose prose-sm max-w-none text-gray-700"
                            dangerouslySetInnerHTML={{
                              __html: DOMPurify.sanitize(activity.description)
                            }}
                          />
                        ) : (
                          <p className="text-gray-700 whitespace-pre-wrap break-words">
                            {activity.description}
                          </p>
                        )}
                      </>
                    )
                  )}

                  {/* Attachments */}
                  {activity.attachments && (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {activity.attachments.split(', ').map((url, index) => {
                        const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                        const isVideo = url.match(/\.(mp4|mov|avi|webm)$/i)

                        return (
                          <a
                            key={index}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                          >
                            {isImage ? (
                              <img
                                src={url}
                                alt={`Attachment ${index + 1}`}
                                className="w-full h-32 object-cover"
                              />
                            ) : isVideo ? (
                              <div className="relative w-full h-32 bg-gray-100 flex items-center justify-center">
                                <Video className="h-12 w-12 text-gray-400" />
                              </div>
                            ) : (
                              <div className="relative w-full h-32 bg-gray-100 flex items-center justify-center">
                                <FileText className="h-12 w-12 text-gray-400" />
                              </div>
                            )}
                          </a>
                        )
                      })}
                    </div>
                  )}
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

