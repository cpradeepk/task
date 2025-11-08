'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Send, Reply } from 'lucide-react'
import { QUERIES, MUTATIONS } from '@/lib/graphql-queries'

// Helper function to execute GraphQL queries
async function executeGraphQLQuery(query: string, variables: any = {}) {
  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  })

  const result = await response.json()
  if (result.errors) {
    console.error('GraphQL errors:', result.errors)
    throw new Error(result.errors[0]?.message || 'GraphQL query failed')
  }
  return result.data
}

// Helper function to execute GraphQL mutations
async function executeGraphQLMutation(mutation: string, variables: any = {}) {
  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: mutation, variables })
  })

  const result = await response.json()
  if (result.errors) {
    console.error('GraphQL errors:', result.errors)
    throw new Error(result.errors[0]?.message || 'GraphQL mutation failed')
  }
  return result.data
}

interface Comment {
  commentId: string
  postId: string
  parentCommentId: string | null
  content: string
  createdBy: string
  createdAt: string
  author: {
    employeeId: string
    name: string
    email?: string
  }
  replies: Comment[]
}

interface CommentsProps {
  postId: string
  isOpen: boolean
  onClose: () => void
}

export default function Comments({ postId, isOpen, onClose }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchComments()
    }
  }, [isOpen, postId])

  const fetchComments = async () => {
    setIsLoading(true)
    try {
      console.log('🔵 [Comments] Fetching comments via GraphQL...')
      const data = await executeGraphQLQuery(QUERIES.GET_FEED_COMMENTS, {
        postId
      })
      setComments(data.feedComments)
      console.log('✅ [Comments] Comments fetched successfully:', data.feedComments.length)
    } catch (error) {
      console.error('❌ [Comments] Error fetching comments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    setIsSubmitting(true)
    try {
      console.log('🔵 [Comments] Creating comment via GraphQL...')
      const data = await executeGraphQLMutation(MUTATIONS.CREATE_FEED_COMMENT, {
        postId,
        content: newComment,
        parentCommentId: null
      })

      console.log('✅ [Comments] Comment created successfully:', data.createFeedComment.commentId)
      setNewComment('')
      fetchComments()
    } catch (error) {
      console.error('❌ [Comments] Error adding comment:', error)
      alert('Failed to add comment: ' + (error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddReply = async (parentCommentId: string) => {
    if (!replyContent.trim()) return

    setIsSubmitting(true)
    try {
      console.log('🔵 [Comments] Creating reply via GraphQL...')
      const data = await executeGraphQLMutation(MUTATIONS.CREATE_FEED_COMMENT, {
        postId,
        content: replyContent,
        parentCommentId
      })

      console.log('✅ [Comments] Reply created successfully:', data.createFeedComment.commentId)
      setReplyContent('')
      setReplyingTo(null)
      fetchComments()
    } catch (error) {
      console.error('❌ [Comments] Error adding reply:', error)
      alert('Failed to add reply: ' + (error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderComment = (comment: Comment, depth: number = 0) => (
    <div key={comment.commentId} className={`${depth > 0 ? 'ml-8 mt-3' : 'mt-4'}`}>
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold flex-shrink-0">
          {comment.author?.name?.charAt(0) || 'U'}
        </div>
        <div className="flex-1">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-sm text-gray-900">{comment.author?.name}</p>
              <p className="text-xs text-gray-500">
                {comment.createdAt && !isNaN(new Date(comment.createdAt).getTime())
                  ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })
                  : 'Unknown date'}
              </p>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
          </div>
          <button
            onClick={() => setReplyingTo(comment.commentId)}
            className="text-xs text-blue-600 hover:text-blue-800 mt-1 flex items-center gap-1"
          >
            <Reply className="w-3 h-3" />
            Reply
          </button>

          {/* Reply Input */}
          {replyingTo === comment.commentId && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleAddReply(comment.commentId)
                  }
                }}
              />
              <button
                onClick={() => handleAddReply(comment.commentId)}
                disabled={isSubmitting || !replyContent.trim()}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Nested Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2">
              {comment.replies.map((reply) => renderComment(reply, depth + 1))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (!isOpen) return null

  return (
    <div className="border-t pt-4 mt-4">
      <h3 className="font-semibold text-gray-900 mb-4">
        Comments ({comments.reduce((sum, c) => sum + 1 + c.replies.length, 0)})
      </h3>

      {/* Add Comment Input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleAddComment()
            }
          }}
        />
        <button
          onClick={handleAddComment}
          disabled={isSubmitting || !newComment.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {/* Comments List */}
      {isLoading ? (
        <p className="text-sm text-gray-500">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-500">No comments yet. Be the first to comment!</p>
      ) : (
        <div className="space-y-2">
          {comments.map((comment) => renderComment(comment))}
        </div>
      )}
    </div>
  )
}

