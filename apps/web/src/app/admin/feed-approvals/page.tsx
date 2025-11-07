'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { User } from '@/lib/types'
import ConditionalNavbar from '@/components/layout/ConditionalNavbar'
import { Check, X, Eye } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function FeedApprovalsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingPosts, setPendingPosts] = useState<any[]>([])
  const [selectedPost, setSelectedPost] = useState<any>(null)
  const [rejectReason, setRejectReason] = useState('')
  const router = useRouter()

  useEffect(() => {
    const user = getCurrentUser()
    if (!user) {
      router.push('/')
      return
    }
    if (!['admin', 'management', 'top_management'].includes(user.role)) {
      router.push('/feed')
      return
    }
    setCurrentUser(user)
    setIsLoading(false)
    fetchPendingPosts()
  }, [router])

  const fetchPendingPosts = async () => {
    try {
      const response = await fetch('/api/feed/posts?status=pending_approval')
      const data = await response.json()
      if (data.success) {
        setPendingPosts(data.data)
      }
    } catch (error) {
      console.error('Error fetching pending posts:', error)
    }
  }

  const handleApprove = async (postId: string) => {
    if (!confirm('Approve this post?')) return

    try {
      const response = await fetch(`/api/feed/posts/${postId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      })

      const data = await response.json()
      if (data.success) {
        alert('Post approved successfully')
        fetchPendingPosts()
        setSelectedPost(null)
      } else {
        alert('Failed to approve post: ' + data.error)
      }
    } catch (error) {
      console.error('Error approving post:', error)
      alert('Failed to approve post')
    }
  }

  const handleReject = async (postId: string) => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }

    try {
      const response = await fetch(`/api/feed/posts/${postId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason: rejectReason })
      })

      const data = await response.json()
      if (data.success) {
        alert('Post rejected')
        fetchPendingPosts()
        setSelectedPost(null)
        setRejectReason('')
      } else {
        alert('Failed to reject post: ' + data.error)
      }
    } catch (error) {
      console.error('Error rejecting post:', error)
      alert('Failed to reject post')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner h-32 w-32"></div>
      </div>
    )
  }

  if (!currentUser) {
    return null
  }

  return (
    <>
      <ConditionalNavbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Feed Post Approvals</h1>
            <p className="mt-1 text-sm text-gray-600">
              Review and approve pending feed posts
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {pendingPosts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="text-lg font-medium">No pending posts</p>
                <p className="text-sm mt-1">All posts have been reviewed</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Author
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title/Content
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Topics
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingPosts.map((post) => (
                      <tr key={post.post_id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{post.author_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                            {post.content_type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {post.title || post.content?.substring(0, 50) || 'No content'}
                            {(post.content?.length > 50 || !post.title) && '...'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {post.topics?.map((topic: any) => (
                              <span key={topic.id} className="px-2 py-1 text-xs bg-gray-100 rounded">
                                {topic.icon} {topic.topic_name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedPost(post)}
                              className="text-blue-600 hover:text-blue-800"
                              title="View details"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleApprove(post.post_id)}
                              className="text-green-600 hover:text-green-800"
                              title="Approve"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedPost(post)
                                setRejectReason('')
                              }}
                              className="text-red-600 hover:text-red-800"
                              title="Reject"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Post Details</h2>
              <button
                onClick={() => {
                  setSelectedPost(null)
                  setRejectReason('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-500">Author</p>
                <p className="font-medium">{selectedPost.author_name}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Content Type</p>
                <p className="font-medium">{selectedPost.content_type}</p>
              </div>

              {selectedPost.title && (
                <div>
                  <p className="text-sm text-gray-500">Title</p>
                  <p className="font-medium">{selectedPost.title}</p>
                </div>
              )}

              {selectedPost.content && (
                <div>
                  <p className="text-sm text-gray-500">Content</p>
                  <p className="whitespace-pre-wrap">{selectedPost.content}</p>
                </div>
              )}

              {selectedPost.link_url && (
                <div>
                  <p className="text-sm text-gray-500">Link URL</p>
                  <a
                    href={selectedPost.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {selectedPost.link_url}
                  </a>
                </div>
              )}

              {selectedPost.file_url && (
                <div>
                  <p className="text-sm text-gray-500">File</p>
                  <a
                    href={selectedPost.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {selectedPost.file_name || 'View file'}
                  </a>
                </div>
              )}

              {selectedPost.youtube_url && (
                <div>
                  <p className="text-sm text-gray-500">YouTube URL</p>
                  <a
                    href={selectedPost.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {selectedPost.youtube_url}
                  </a>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500">Topics</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedPost.topics?.map((topic: any) => (
                    <span key={topic.id} className="px-2 py-1 text-sm bg-blue-50 text-blue-700 rounded">
                      {topic.icon} {topic.topic_name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Reject Reason Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason (if rejecting)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setSelectedPost(null)
                  setRejectReason('')
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(selectedPost.post_id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Reject
              </button>
              <button
                onClick={() => handleApprove(selectedPost.post_id)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

