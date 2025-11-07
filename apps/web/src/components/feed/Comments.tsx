'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Send, Reply } from 'lucide-react'

interface Comment {
  comment_id: string
  post_id: string
  parent_comment_id: string | null
  content: string
  created_by: string
  created_at: string
  author_name: string
  author_avatar: string | null
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
      const response = await fetch(`/api/feed/posts/${postId}/comments`)
      const data = await response.json()
      if (data.success) {
        setComments(data.data)
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/feed/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment })
      })

      const data = await response.json()
      if (data.success) {
        setNewComment('')
        fetchComments()
      } else {
        alert('Failed to add comment: ' + data.error)
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      alert('Failed to add comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddReply = async (parentCommentId: string) => {
    if (!replyContent.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/feed/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent, parentCommentId })
      })

      const data = await response.json()
      if (data.success) {
        setReplyContent('')
        setReplyingTo(null)
        fetchComments()
      } else {
        alert('Failed to add reply: ' + data.error)
      }
    } catch (error) {
      console.error('Error adding reply:', error)
      alert('Failed to add reply')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderComment = (comment: Comment, depth: number = 0) => (
    <div key={comment.comment_id} className={`${depth > 0 ? 'ml-8 mt-3' : 'mt-4'}`}>
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold flex-shrink-0">
          {comment.author_name?.charAt(0) || 'U'}
        </div>
        <div className="flex-1">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-sm text-gray-900">{comment.author_name}</p>
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </p>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
          </div>
          <button
            onClick={() => setReplyingTo(comment.comment_id)}
            className="text-xs text-blue-600 hover:text-blue-800 mt-1 flex items-center gap-1"
          >
            <Reply className="w-3 h-3" />
            Reply
          </button>

          {/* Reply Input */}
          {replyingTo === comment.comment_id && (
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
                    handleAddReply(comment.comment_id)
                  }
                }}
              />
              <button
                onClick={() => handleAddReply(comment.comment_id)}
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

