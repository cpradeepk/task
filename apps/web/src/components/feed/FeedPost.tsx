'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Eye, Share2, MoreVertical, Bookmark } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Comments from './Comments'
import { MUTATIONS } from '@/lib/graphql-queries'

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

interface Author {
  employeeId: string
  name: string
  email?: string
}

interface Topic {
  id: string
  topicName: string
  icon: string | null
}

interface Reaction {
  emoji: string
  count: number
  hasUserReacted: boolean
}

interface FeedPostProps {
  post: {
    postId: string
    contentType: string
    content: string
    linkUrl?: string | null
    linkTitle?: string | null
    linkDescription?: string | null
    linkImage?: string | null
    mediaUrls?: string[] | null
    createdAt: string
    updatedAt?: string | null
    status: string
    author: Author
    topics: Topic[]
    reactions: Reaction[]
    viewCount: number
    commentCount: number
    isSaved: boolean
    hasUserReacted: boolean
  }
  onReact?: (postId: string, emoji: string) => void
  onComment?: (postId: string) => void
}

export default function FeedPost({ post, onReact, onComment }: FeedPostProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [localReactions, setLocalReactions] = useState(post.reactions)
  const [showComments, setShowComments] = useState(false)
  const [hasTrackedView, setHasTrackedView] = useState(false)
  const [isSaved, setIsSaved] = useState(post.isSaved)
  const [isSaving, setIsSaving] = useState(false)

  const commonEmojis = ['👍', '❤️', '😂', '🎉', '🤔', '👏']

  // Track view when post is rendered
  useEffect(() => {
    if (!hasTrackedView) {
      trackView()
      setHasTrackedView(true)
    }
  }, [])

  const trackView = async () => {
    try {
      console.log('🔵 [FeedPost] Tracking view via GraphQL...')
      await executeGraphQLMutation(MUTATIONS.TRACK_FEED_VIEW, {
        postId: post.postId
      })
      console.log('✅ [FeedPost] View tracked successfully')
    } catch (error) {
      console.error('❌ [FeedPost] Error tracking view:', error)
    }
  }

  const handleSavePost = async () => {
    if (isSaving) return

    setIsSaving(true)
    try {
      console.log('🔵 [FeedPost] Toggling save via GraphQL...')
      const data = await executeGraphQLMutation(MUTATIONS.TOGGLE_FEED_SAVE, {
        postId: post.postId
      })
      // Toggle the saved state based on the action returned
      const newSavedState = data.toggleFeedSave.action === 'saved'
      setIsSaved(newSavedState)
      console.log('✅ [FeedPost] Save toggled successfully:', data.toggleFeedSave.action)
    } catch (error) {
      console.error('❌ [FeedPost] Error saving post:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSharePost = async () => {
    try {
      const postUrl = `${window.location.origin}/feed?post=${post.postId}`
      await navigator.clipboard.writeText(postUrl)
      alert('Post link copied to clipboard!')
    } catch (error) {
      console.error('❌ [FeedPost] Error copying link:', error)
      alert('Failed to copy link to clipboard')
    }
  }

  const handleReaction = async (emoji: string) => {
    try {
      console.log('🔵 [FeedPost] Toggling reaction via GraphQL...', emoji)
      const data = await executeGraphQLMutation(MUTATIONS.TOGGLE_FEED_REACTION, {
        postId: post.postId,
        emoji
      })

      // Update local state optimistically
      if (data.toggleFeedReaction.added) {
        // Add reaction
        const existingReaction = localReactions.find(r => r.emoji === emoji)
        if (existingReaction) {
          setLocalReactions(localReactions.map(r =>
            r.emoji === emoji ? { ...r, count: r.count + 1, hasUserReacted: true } : r
          ))
        } else {
          setLocalReactions([...localReactions, { emoji, count: 1, hasUserReacted: true }])
        }
      } else {
        // Remove reaction
        setLocalReactions(localReactions.map(r =>
          r.emoji === emoji ? { ...r, count: r.count - 1, hasUserReacted: false } : r
        ).filter(r => r.count > 0))
      }

      console.log('✅ [FeedPost] Reaction toggled successfully:', data.toggleFeedReaction)
      onReact?.(post.postId, emoji)
    } catch (error) {
      console.error('❌ [FeedPost] Error toggling reaction:', error)
    }
    setShowReactionPicker(false)
  }

  const renderContent = () => {
    switch (post.contentType) {
      case 'text':
        return (
          <div className="prose max-w-none">
            <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
          </div>
        )

      case 'link':
        return (
          <div>
            {post.content && <p className="text-gray-700 mb-3 whitespace-pre-wrap">{post.content}</p>}
            <a
              href={post.linkUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="block border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              {post.linkImage && (
                <img src={post.linkImage} alt={post.linkTitle || 'Link preview'} className="w-full h-48 object-cover" />
              )}
              <div className="p-4 bg-gray-50">
                <h4 className="font-semibold text-gray-900">{post.linkTitle || post.linkUrl}</h4>
                {post.linkDescription && <p className="text-sm text-gray-600 mt-1">{post.linkDescription}</p>}
                <p className="text-xs text-blue-600 mt-2">{post.linkUrl ? new URL(post.linkUrl).hostname : ''}</p>
              </div>
            </a>
          </div>
        )

      case 'image':
        return (
          <div>
            {post.content && <p className="text-gray-700 mb-3 whitespace-pre-wrap">{post.content}</p>}
            {post.mediaUrls && post.mediaUrls.length > 0 && (
              <img src={post.mediaUrls[0]} alt="Image" className="w-full rounded-lg" />
            )}
          </div>
        )

      case 'video':
        return (
          <div>
            {post.content && <p className="text-gray-700 mb-3 whitespace-pre-wrap">{post.content}</p>}
            {post.mediaUrls && post.mediaUrls.length > 0 && (
              <video src={post.mediaUrls[0]} controls className="w-full rounded-lg" />
            )}
          </div>
        )

      case 'youtube':
        let embedUrl = post.linkUrl || ''
        if (embedUrl && !embedUrl.includes('youtube.com/embed/')) {
          const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
          const match = embedUrl.match(regExp)
          if (match && match[2].length === 11) {
            embedUrl = `https://www.youtube.com/embed/${match[2]}`
          }
        }
        return (
          <div>
            {post.content && <p className="text-gray-700 mb-3 whitespace-pre-wrap">{post.content}</p>}
            {post.linkUrl && (
              <div className="space-y-2">
                <div className="aspect-video">
                  <iframe
                    src={embedUrl}
                    className="w-full h-full rounded-lg"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <a href={post.linkUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
                  Watch on YouTube
                </a>
              </div>
            )}
          </div>
        )

      case 'pdf':
        return (
          <div>
            {post.content && <p className="text-gray-700 mb-3 whitespace-pre-wrap">{post.content}</p>}
            {post.mediaUrls && post.mediaUrls.length > 0 && (
              <a
                href={post.mediaUrls[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-4 bg-gray-50 border rounded-lg hover:bg-gray-100"
              >
                <span className="text-2xl">📄</span>
                <div>
                  <p className="font-medium">PDF Document</p>
                  <p className="text-sm text-gray-500">Click to view</p>
                </div>
              </a>
            )}
          </div>
        )

      default:
        return <p className="text-gray-500">Unsupported content type</p>
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Post Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
            {post.author.name?.charAt(0) || 'U'}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{post.author.name}</p>
            <p className="text-sm text-gray-500">
              {post.createdAt && !isNaN(new Date(post.createdAt).getTime())
                ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })
                : 'Unknown date'}
            </p>
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Topics */}
      {post.topics && post.topics.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {post.topics.map((topic) => (
            <span key={topic.id} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
              {topic.icon} {topic.topicName}
            </span>
          ))}
        </div>
      )}

      {/* Post Title */}
      {post.contentType !== 'link' && post.linkTitle && (
        <h3 className="text-lg font-bold text-gray-900 mb-2">{post.linkTitle}</h3>
      )}

      {/* Post Content */}
      <div className="mb-4">{renderContent()}</div>

      {/* Reactions Bar */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-4">
          {/* Reactions */}
          <div className="relative">
            <button
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              {localReactions && localReactions.length > 0 ? (
                <div className="flex items-center gap-1">
                  {localReactions.slice(0, 3).map((r) => (
                    <span key={r.emoji} className="text-lg">{r.emoji}</span>
                  ))}
                  <span className="text-sm font-medium">
                    {localReactions.reduce((sum, r) => sum + r.count, 0)}
                  </span>
                </div>
              ) : (
                <span className="text-sm">React</span>
              )}
            </button>

            {/* Reaction Picker */}
            {showReactionPicker && (
              <div className="absolute bottom-full left-0 mb-2 bg-white border rounded-lg shadow-lg p-2 flex gap-1 z-10">
                {commonEmojis.map((emoji) => {
                  const reaction = localReactions.find(r => r.emoji === emoji)
                  const hasReacted = reaction?.hasUserReacted || false
                  return (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(emoji)}
                      className={`text-2xl hover:scale-125 transition-transform ${
                        hasReacted ? 'scale-125' : ''
                      }`}
                    >
                      {emoji}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Comments */}
          <button
            onClick={() => {
              setShowComments(!showComments)
              onComment?.(post.postId)
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm">{post.commentCount > 0 ? post.commentCount : 'Comment'}</span>
          </button>

          {/* Views */}
          <div className="flex items-center gap-2 text-gray-500">
            <Eye className="w-5 h-5" />
            <span className="text-sm">{post.viewCount}</span>
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSavePost}
          disabled={isSaving}
          className={`flex items-center gap-2 transition-colors ${
            isSaved
              ? 'text-yellow-600 hover:text-yellow-700'
              : 'text-gray-600 hover:text-yellow-600'
          }`}
        >
          <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
          <span className="text-sm">{isSaved ? 'Saved' : 'Save'}</span>
        </button>

        {/* Share */}
        <button
          onClick={handleSharePost}
          className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
        >
          <Share2 className="w-5 h-5" />
          <span className="text-sm">Share</span>
        </button>
      </div>

      {/* Comments Section */}
      <Comments postId={post.postId} isOpen={showComments} onClose={() => setShowComments(false)} />
    </div>
  )
}

