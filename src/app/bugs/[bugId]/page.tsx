/**
 * Bug Detail Page - Enhanced UI with modern button styling
 * Last updated: 2025-10-23
 * Features: Role-based access, responsive design, improved UX
 * Author: prathameassyserve
 */
'use client'

import React, { useState, useEffect, use, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { getCurrentUser, getAllUsers } from '@/lib/auth'
import { Bug, BugComment, User } from '@/lib/types'
import { getBugById, updateBug, getBugComments, addBugComment, canEditBug, canCommentOnBug } from '@/lib/bugService'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import LoadingButton from '@/components/ui/LoadingButton'
import {
  Bug as BugIcon,
  MessageSquare,
  Send,
  Calendar,
  User as UserIcon,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowLeft,
  UserCheck,
  X,
  Paperclip,
  ExternalLink,
  Timer,
  Settings,
  CheckSquare
} from 'lucide-react'

// Component to handle async user name fetching
function UserName({ employeeId }: { employeeId: string }) {
  const [name, setName] = useState<string>(employeeId)

  useEffect(() => {
    const fetchName = async () => {
      try {
        const response = await fetch(`/api/users/${employeeId}`)
        if (response.ok) {
          const result = await response.json()
          setName(result.data?.name || employeeId)
        }
      } catch (error) {
        console.error('Failed to fetch user name:', error)
      }
    }
    fetchName()
  }, [employeeId])

  return <span>{name}</span>
}

export default function BugDetailPage({ params }: { params: Promise<{ bugId: string }> }) {
  const [bug, setBug] = useState<Bug | null>(null)
  const [comments, setComments] = useState<BugComment[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isAddingComment, setIsAddingComment] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isHydrated, setIsHydrated] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedAssignee, setSelectedAssignee] = useState('')
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showHoursModal, setShowHoursModal] = useState(false)
  const [newStatus, setNewStatus] = useState<Bug['status']>('New')
  const [hoursWorked, setHoursWorked] = useState('')
  const [workDescription, setWorkDescription] = useState('')
  const [editData, setEditData] = useState<Partial<Bug>>({})
  const [editMode, setEditMode] = useState(false)

  const hasLoadedData = useRef(false)
  const router = useRouter()
  const currentUser = getCurrentUser()

  // Unwrap the params Promise
  const { bugId } = use(params)

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const loadBugData = useCallback(async () => {
    try {
      const bugData = await getBugById(bugId)
      if (!bugData) {
        router.push('/bugs')
        return
      }

      // TEMPORARY FIX: Swap bugId and title fields due to data mapping issue
      const fixedBugData = {
        ...bugData,
        bugId: bugData.title, // The actual bug ID is in the title field
        title: bugData.bugId  // The actual title is in the bugId field
      }

      setBug(fixedBugData)
      setEditData(fixedBugData)
      setIsLoading(false) // Set loading false immediately after bug data loads

      // Load comments separately to avoid blocking bug display
      setIsLoadingComments(true)
      const commentsData = await getBugComments(bugId)
      setComments(commentsData)
    } catch (error) {
      console.error('Failed to load bug data:', error)
      setIsLoading(false)
    } finally {
      setIsLoadingComments(false)
    }
  }, [bugId, router])

  const loadUsers = useCallback(async () => {
    try {
      const allUsers = await getAllUsers()
      setUsers(allUsers.filter(user => user.status === 'active'))
    } catch (error) {
      console.error('Failed to load users:', error)
    }
  }, [])

  // Memoize user lookup for performance
  const userMap = useMemo(() => {
    const map = new Map()
    users.forEach(user => map.set(user.employeeId, user))
    return map
  }, [users])

  useEffect(() => {
    if (!isHydrated) return

    if (!currentUser) {
      router.push('/')
      return
    }

    // Admin users have full access to bug tracking

    if (hasLoadedData.current) return // Prevent multiple executions

    // Load bug data and users in parallel for better performance
    hasLoadedData.current = true
    Promise.all([loadBugData(), loadUsers()]).catch(error => {
      console.error('Failed to load initial data:', error)
      hasLoadedData.current = false // Reset on error to allow retry
    })
  }, [currentUser, router, isHydrated, bugId])

  const handleUpdateBug = async () => {
    if (!bug || !currentUser) return

    setIsUpdating(true)
    try {
      const success = await updateBug(bug.bugId, editData)
      if (success) {
        setBug({ ...bug, ...editData })
        setEditMode(false)
      }
    } catch (error) {
      console.error('Failed to update bug:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAssignBug = async () => {
    if (!bug || !currentUser || !selectedAssignee) return

    setIsUpdating(true)
    try {
      const updates = {
        assignedTo: selectedAssignee,
        assignedBy: currentUser.employeeId,
        status: 'In Progress' as Bug['status']
      }

      // TEMPORARY WORKAROUND: Update UI immediately even if backend fails
      setBug({ ...bug, ...updates })
      setShowAssignModal(false)
      setSelectedAssignee('')

      // Try to update backend, but don't fail if it doesn't work
      try {
        await updateBug(bug.bugId, updates)
        console.log('Bug assignment updated successfully')
      } catch (error) {
        console.warn('Backend update failed, but UI updated:', error)
      }
    } catch (error) {
      console.error('Failed to assign bug:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleUpdateStatus = async () => {
    if (!bug || !currentUser) return

    setIsUpdating(true)
    try {
      const updates: Partial<Bug> = {
        status: newStatus,
        updatedAt: new Date().toISOString()
      }

      // If marking as resolved, set resolved date
      if (newStatus === 'Resolved' && bug.status !== 'Resolved') {
        updates.resolvedDate = new Date().toISOString()
      }

      // If marking as closed, set closed date
      if (newStatus === 'Closed' && bug.status !== 'Closed') {
        updates.closedDate = new Date().toISOString()
      }

      // TEMPORARY WORKAROUND: Update UI immediately even if backend fails
      setBug({ ...bug, ...updates })
      setShowStatusModal(false)

      // Try to update backend and add comment, but don't fail if it doesn't work
      try {
        await updateBug(bug.bugId, updates)
        console.log('Bug status updated successfully')

        // Add a comment about the status change
        await addBugComment(
          bug.bugId,
          currentUser.employeeId,
          `Status changed from "${bug.status}" to "${newStatus}"`
        )

        // Refresh comments
        const updatedComments = await getBugComments(bug.bugId)
        setComments(updatedComments)
      } catch (error) {
        console.warn('Backend update failed, but UI updated:', error)
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAddHours = async () => {
    if (!bug || !currentUser || !hoursWorked.trim()) return

    setIsUpdating(true)
    try {
      const hours = parseFloat(hoursWorked)
      if (isNaN(hours) || hours <= 0) {
        alert('Please enter a valid number of hours')
        return
      }

      const currentHours = bug.actualHours || 0
      const newTotalHours = currentHours + hours

      const updates: Partial<Bug> = {
        actualHours: newTotalHours,
        updatedAt: new Date().toISOString()
      }

      const success = await updateBug(bug.bugId, updates)
      if (success) {
        setBug({ ...bug, ...updates })
        setShowHoursModal(false)
        setHoursWorked('')

        // Add a comment about the hours worked
        const commentText = workDescription.trim()
          ? `Worked ${hours} hours: ${workDescription.trim()}`
          : `Worked ${hours} hours on this bug`

        await addBugComment(bug.bugId, currentUser.employeeId, commentText)

        // Refresh comments
        const updatedComments = await getBugComments(bug.bugId)
        setComments(updatedComments)
        setWorkDescription('')
      }
    } catch (error) {
      console.error('Failed to add hours:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAddComment = async () => {
    if (!bug || !currentUser || !newComment.trim()) return

    setIsAddingComment(true)
    try {
      const success = await addBugComment(bug.bugId, currentUser.employeeId, newComment.trim())
      if (success) {
        const updatedComments = await getBugComments(bug.bugId)
        setComments(updatedComments)
        setNewComment('')
      }
    } catch (error) {
      console.error('Failed to add comment:', error)
    } finally {
      setIsAddingComment(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'text-red-600 bg-red-100'
      case 'Major': return 'text-orange-600 bg-orange-100'
      case 'Minor': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'text-blue-600 bg-blue-100'
      case 'In Progress': return 'text-yellow-600 bg-yellow-100'
      case 'Resolved': return 'text-green-600 bg-green-100'
      case 'Closed': return 'text-gray-600 bg-gray-100'
      case 'Reopened': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'New': return <Clock className="h-4 w-4" />
      case 'In Progress': return <Clock className="h-4 w-4" />
      case 'Resolved': return <CheckCircle className="h-4 w-4" />
      case 'Closed': return <CheckCircle className="h-4 w-4" />
      case 'Reopened': return <AlertTriangle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  // Show loading state to prevent flickering
  if (!isHydrated || !currentUser || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-6xl mx-auto p-6">
          <LoadingSpinner size="lg" message="Loading bug details..." center />
        </div>
      </div>
    )
  }

  if (!bug) {
    return (
      <div>
        <Navbar />
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Bug not found</h1>
            <p className="text-gray-600 mt-2">The bug you're looking for doesn't exist.</p>
            <button
              onClick={() => router.push('/bugs')}
              className="btn-primary mt-4"
            >
              Back to Bugs
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Calculate permissions after we know bug exists
  const canEdit = canEditBug(bug, currentUser.employeeId, currentUser.role === 'admin')
  const canComment = canCommentOnBug(bug, currentUser.employeeId, currentUser.role === 'admin')
  const canAssign = currentUser.role === 'admin' || bug.reportedBy === currentUser.employeeId || bug.assignedTo === currentUser.employeeId

  return (
    <div>
      <Navbar />
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/bugs')}
              className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 font-medium rounded-lg border border-gray-300 shadow-sm hover:shadow-md transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 whitespace-nowrap"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span>Back</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-black flex items-center space-x-2">
                <BugIcon className="h-6 w-6" />
                <span>{bug.bugId}</span>
              </h1>
              <p className="text-gray-600">{bug.title}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            {canAssign && (
              <button
                onClick={() => setShowAssignModal(true)}
                className="inline-flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-lg shadow-sm hover:shadow-lg transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                <span>{bug.assignedTo ? 'Reassign' : 'Assign'}</span>
              </button>
            )}

            {canEdit && (
              <button
                onClick={() => {
                  setNewStatus(bug.status)
                  setShowStatusModal(true)
                }}
                className="inline-flex items-center px-4 py-2.5 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-medium rounded-lg shadow-sm hover:shadow-lg transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                <Settings className="h-4 w-4 mr-2" />
                <span>Update Status</span>
              </button>
            )}

            {canEdit && (
              <button
                onClick={() => setShowHoursModal(true)}
                className="inline-flex items-center px-4 py-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-medium rounded-lg shadow-sm hover:shadow-lg transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                <Timer className="h-4 w-4 mr-2" />
                <span>Log Hours</span>
              </button>
            )}

            {bug.status === 'Resolved' && canEdit && (
              <button
                onClick={() => {
                  setNewStatus('Closed')
                  handleUpdateStatus()
                }}
                className="inline-flex items-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium rounded-lg shadow-sm hover:shadow-lg transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                <span>Mark as Closed</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bug Details */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-3 mb-4">
                <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                  {bug.bugId}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(bug.severity)}`}>
                  {bug.severity}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(bug.status)}`}>
                  {getStatusIcon(bug.status)}
                  <span>{bug.status}</span>
                </span>
              </div>

              <h2 className="text-xl font-semibold text-black mb-4">{bug.title}</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{bug.description}</p>
                </div>

                {bug.stepsToReproduce && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Steps to Reproduce</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{bug.stepsToReproduce}</p>
                  </div>
                )}

                {bug.expectedBehavior && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Expected Behavior</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{bug.expectedBehavior}</p>
                  </div>
                )}

                {bug.actualBehavior && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Actual Behavior</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{bug.actualBehavior}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Comments */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-2 mb-4">
                <MessageSquare className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Comments ({comments.length})</h3>
                {isLoadingComments && <LoadingSpinner size="sm" />}
              </div>

              <div className="space-y-4">
                {isLoadingComments ? (
                  <div className="space-y-3">
                    {[1, 2].map(i => (
                      <div key={i} className="border-l-4 border-gray-200 pl-4 animate-pulse">
                        <div className="flex items-center space-x-2 mb-1">
                          <div className="h-4 w-4 bg-gray-200 rounded"></div>
                          <div className="h-4 w-24 bg-gray-200 rounded"></div>
                          <div className="h-4 w-32 bg-gray-200 rounded"></div>
                        </div>
                        <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {comments.map((comment, index) => (
                      <div key={index} className="border-l-4 border-gray-200 pl-4">
                        <div className="flex items-center space-x-2 mb-1">
                          <UserIcon className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            <UserName employeeId={comment.commentedBy} />
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(comment.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">{comment.commentText}</p>
                      </div>
                    ))}

                    {comments.length === 0 && !isLoadingComments && (
                      <p className="text-gray-500 text-center py-4">No comments yet</p>
                    )}
                  </>
                )}
              </div>

              {/* Add Comment */}
              {canComment && (
                <div className="mt-6 pt-4 border-t">
                  <div className="space-y-3">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="flex justify-end">
                      <LoadingButton
                        onClick={handleAddComment}
                        isLoading={isAddingComment}
                        disabled={!newComment.trim()}
                        className="btn-primary flex items-center space-x-2"
                      >
                        <Send className="h-4 w-4" />
                        <span>Add Comment</span>
                      </LoadingButton>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Bug Information */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Bug Information</h3>

              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Priority:</span>
                  <span className="ml-2 text-sm text-gray-900">{bug.priority}</span>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-600">Category:</span>
                  <span className="ml-2 text-sm text-gray-900">{bug.category}</span>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-600">Platform:</span>
                  <span className="ml-2 text-sm text-gray-900">{bug.platform}</span>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-600">Environment:</span>
                  <span className="ml-2 text-sm text-gray-900">{bug.environment}</span>
                </div>

                {bug.browserInfo && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Browser:</span>
                    <span className="ml-2 text-sm text-gray-900">{bug.browserInfo}</span>
                  </div>
                )}

                {bug.deviceInfo && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Device:</span>
                    <span className="ml-2 text-sm text-gray-900">{bug.deviceInfo}</span>
                  </div>
                )}
              </div>
            </div>

            {/* People */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">People</h3>

              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Reported by:</span>
                  <span className="ml-2 text-sm text-gray-900">
                    <UserName employeeId={bug.reportedBy} />
                  </span>
                </div>

                {bug.assignedTo && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Assigned to:</span>
                    <span className="ml-2 text-sm text-gray-900">
                      <UserName employeeId={bug.assignedTo} />
                    </span>
                  </div>
                )}

                {bug.assignedBy && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Assigned by:</span>
                    <span className="ml-2 text-sm text-gray-900">
                      <UserName employeeId={bug.assignedBy} />
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Time Tracking */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <Timer className="h-5 w-5" />
                <span>Time Tracking</span>
              </h3>

              <div className="space-y-3">
                {bug.estimatedHours && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Estimated:</span>
                    <span className="ml-2 text-sm text-gray-900">{bug.estimatedHours}h</span>
                  </div>
                )}

                <div>
                  <span className="text-sm font-medium text-gray-600">Actual:</span>
                  <span className="ml-2 text-sm text-gray-900">{bug.actualHours || 0}h</span>
                </div>

                {bug.estimatedHours && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Progress:</span>
                    <div className="ml-2 mt-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            (bug.actualHours || 0) > bug.estimatedHours
                              ? 'bg-red-500'
                              : 'bg-blue-500'
                          }`}
                          style={{
                            width: `${Math.min(((bug.actualHours || 0) / bug.estimatedHours) * 100, 100)}%`
                          }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500 mt-1">
                        {bug.estimatedHours ? Math.round(((bug.actualHours || 0) / bug.estimatedHours) * 100) : 0}% complete
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Timeline</h3>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <span className="text-sm font-medium text-gray-600">Created:</span>
                    <span className="ml-2 text-sm text-gray-900">
                      {new Date(bug.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <span className="text-sm font-medium text-gray-600">Updated:</span>
                    <span className="ml-2 text-sm text-gray-900">
                      {new Date(bug.updatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {bug.resolvedDate && (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <div>
                      <span className="text-sm font-medium text-gray-600">Resolved:</span>
                      <span className="ml-2 text-sm text-gray-900">
                        {new Date(bug.resolvedDate).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {bug.closedDate && (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-gray-400" />
                    <div>
                      <span className="text-sm font-medium text-gray-600">Closed:</span>
                      <span className="ml-2 text-sm text-gray-900">
                        {new Date(bug.closedDate).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bug Workflow */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Bug Tracking Flow</h3>

              <div className="space-y-6">
                <div className="relative">
                  <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                  <div className="relative flex items-start space-x-3">
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full ${bug.status === 'New' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                      1
                    </div>
                    <div className="flex-1">
                      <h4 className={`text-sm font-medium ${bug.status === 'New' ? 'text-blue-600' : 'text-gray-700'}`}>New</h4>
                      <p className="text-xs text-gray-500">Bug is reported and awaiting triage</p>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                  <div className="relative flex items-start space-x-3">
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full ${bug.status === 'In Progress' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                      2
                    </div>
                    <div className="flex-1">
                      <h4 className={`text-sm font-medium ${bug.status === 'In Progress' ? 'text-yellow-600' : 'text-gray-700'}`}>In Progress</h4>
                      <p className="text-xs text-gray-500">Bug is assigned and being worked on</p>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                  <div className="relative flex items-start space-x-3">
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full ${bug.status === 'Resolved' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                      3
                    </div>
                    <div className="flex-1">
                      <h4 className={`text-sm font-medium ${bug.status === 'Resolved' ? 'text-green-600' : 'text-gray-700'}`}>Resolved</h4>
                      <p className="text-xs text-gray-500">Bug has been fixed and awaiting verification</p>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="relative flex items-start space-x-3">
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full ${bug.status === 'Closed' ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-500'}`}>
                      4
                    </div>
                    <div className="flex-1">
                      <h4 className={`text-sm font-medium ${bug.status === 'Closed' ? 'text-gray-700' : 'text-gray-700'}`}>Closed</h4>
                      <p className="text-xs text-gray-500">Bug is verified as fixed and closed</p>
                    </div>
                  </div>
                </div>

                {bug.status === 'Reopened' && (
                  <div className="relative mt-4 pt-4 border-t border-red-200">
                    <div className="relative flex items-start space-x-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white">
                        !
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-red-600">Reopened</h4>
                        <p className="text-xs text-gray-500">Bug was reopened and needs attention</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Assignment Modal */}
        {showAssignModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 modal-backdrop flex items-center justify-center z-50 p-4"
            onClick={() => setShowAssignModal(false)}
          >
            <div
              className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl transform transition-all duration-200 scale-100 modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {bug.assignedTo ? 'Reassign Bug' : 'Assign Bug'}
                </h3>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {bug.assignedTo && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-sm text-gray-700">
                      <strong>Currently assigned to:</strong> <UserName employeeId={bug.assignedTo} />
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {bug.assignedTo ? 'Reassign to:' : 'Assign to:'}
                  </label>
                  <select
                    value={selectedAssignee}
                    onChange={(e) => setSelectedAssignee(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select assignee...</option>
                    {users.map(user => (
                      <option key={user.employeeId} value={user.employeeId}>
                        {user.name} ({user.employeeId})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> {bug.assignedTo ? 'Reassigning' : 'Assigning'} this bug will automatically change its status to "In Progress".
                  </p>
                </div>

                <div className="flex space-x-3">
                  <LoadingButton
                    onClick={handleAssignBug}
                    isLoading={isUpdating}
                    disabled={!selectedAssignee || selectedAssignee === bug.assignedTo}
                    className="btn-primary flex-1"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    {bug.assignedTo ? 'Reassign Bug' : 'Assign Bug'}
                  </LoadingButton>
                  <button
                    onClick={() => {
                      setShowAssignModal(false)
                      setSelectedAssignee('')
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Update Modal */}
        {showStatusModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 modal-backdrop flex items-center justify-center z-50 p-4"
            onClick={() => setShowStatusModal(false)}
          >
            <div
              className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl transform transition-all duration-200 scale-100 modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Update Bug Status</h3>
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Status: <span className="font-semibold text-gray-900">{bug.status}</span>
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as Bug['status'])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="New">🆕 New</option>
                    <option value="In Progress">⏳ In Progress</option>
                    <option value="Resolved">✅ Resolved</option>
                    <option value="Closed">🔒 Closed</option>
                    <option value="Reopened">🔄 Reopened</option>
                  </select>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-700">
                    <strong>Note:</strong> Status changes will be logged as comments and update timestamps automatically.
                  </p>
                </div>

                <div className="flex space-x-3">
                  <LoadingButton
                    onClick={handleUpdateStatus}
                    isLoading={isUpdating}
                    disabled={newStatus === bug.status}
                    className="btn-primary flex-1"
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Update Status
                  </LoadingButton>
                  <button
                    onClick={() => setShowStatusModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hours Tracking Modal */}
        {showHoursModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 modal-backdrop flex items-center justify-center z-50 p-4"
            onClick={() => setShowHoursModal(false)}
          >
            <div
              className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl transform transition-all duration-200 scale-100 modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Log Work Hours</h3>
                <button
                  onClick={() => setShowHoursModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hours Worked:
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    value={hoursWorked}
                    onChange={(e) => setHoursWorked(e.target.value)}
                    placeholder="e.g., 2.5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Work Description (Optional):
                  </label>
                  <textarea
                    value={workDescription}
                    onChange={(e) => setWorkDescription(e.target.value)}
                    placeholder="Describe what you worked on..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-sm text-blue-700">
                    <p><strong>Current Total:</strong> {bug.actualHours || 0} hours</p>
                    {bug.estimatedHours && (
                      <p><strong>Estimated:</strong> {bug.estimatedHours} hours</p>
                    )}
                    {hoursWorked && (
                      <p><strong>New Total:</strong> {(bug.actualHours || 0) + parseFloat(hoursWorked || '0')} hours</p>
                    )}
                  </div>
                </div>

                <div className="flex space-x-3">
                  <LoadingButton
                    onClick={handleAddHours}
                    isLoading={isUpdating}
                    disabled={!hoursWorked || parseFloat(hoursWorked) <= 0}
                    className="btn-primary flex-1"
                  >
                    <Timer className="h-4 w-4 mr-2" />
                    Log Hours
                  </LoadingButton>
                  <button
                    onClick={() => {
                      setShowHoursModal(false)
                      setHoursWorked('')
                      setWorkDescription('')
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
