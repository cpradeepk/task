'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Eye, Share2, MoreVertical, Bookmark } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Comments from './Comments'

interface Topic {
  id: number
  topic_name: string
  icon: string | null
}

interface Reaction {
  emoji: string
  count: number
}

interface FeedPostProps {
  post: {
    post_id: string
    content_type: string
    title: string | null
    content: string | null
    link_url: string | null
    og_title: string | null
    og_description: string | null
    og_image: string | null
    file_url: string | null
    file_name: string | null
    youtube_url: string | null
    created_by: string
    created_at: string
    approved_at: string
    author_name: string
    author_avatar: string | null
    topics: Topic[]
    reactions: Reaction[]
    userReactions: string[]
    commentCount: number
    viewCount: number
  }
  onReact?: (postId: string, emoji: string) => void
  onComment?: (postId: string) => void
}

export default function FeedPost({ post, onReact, onComment }: FeedPostProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [localReactions, setLocalReactions] = useState(post.reactions)
  const [localUserReactions, setLocalUserReactions] = useState(post.userReactions)
  const [showComments, setShowComments] = useState(false)
  const [hasTrackedView, setHasTrackedView] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
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
      await fetch(`/api/feed/posts/${post.post_id}/views`, {
        method: 'POST'
      })
    } catch (error) {
      console.error('Error tracking view:', error)
    }
  }

  const handleSavePost = async () => {
    if (isSaving) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/feed/posts/${post.post_id}/save`, {
        method: 'POST'
      })

      const data = await response.json()
      if (data.success) {
        setIsSaved(data.action === 'saved')
      }
    } catch (error) {
      console.error('Error saving post:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReaction = async (emoji: string) => {
    try {
      const response = await fetch(`/api/feed/posts/${post.post_id}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      })

      const data = await response.json()
      if (data.success) {
        // Update local state optimistically
        if (data.action === 'added') {
          // Add reaction
          const existingReaction = localReactions.find(r => r.emoji === emoji)
          if (existingReaction) {
            setLocalReactions(localReactions.map(r =>
              r.emoji === emoji ? { ...r, count: r.count + 1 } : r
            ))
          } else {
            setLocalReactions([...localReactions, { emoji, count: 1 }])
          }
          setLocalUserReactions([...localUserReactions, emoji])
        } else {
          // Remove reaction
          setLocalReactions(localReactions.map(r =>
            r.emoji === emoji ? { ...r, count: r.count - 1 } : r
          ).filter(r => r.count > 0))
          setLocalUserReactions(localUserReactions.filter(e => e !== emoji))
        }
        onReact?.(post.post_id, emoji)
      }
    } catch (error) {
      console.error('Error toggling reaction:', error)
    }
    setShowReactionPicker(false)
  }

  const renderContent = () => {
    switch (post.content_type) {
      case 'text':
        return (
          <div className="prose max-w-none">
            {post.title && <h3 className="text-xl font-semibold mb-2">{post.title}</h3>}
            <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
          </div>
        )

      case 'link':
        return (
          <div>
            {post.title && <h3 className="text-xl font-semibold mb-2">{post.title}</h3>}
            {post.content && <p className="text-gray-700 mb-3 whitespace-pre-wrap">{post.content}</p>}
            <a
              href={post.link_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="block border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              {post.og_image && (
                <img src={post.og_image} alt={post.og_title || 'Link preview'} className="w-full h-48 object-cover" />
              )}
              <div className="p-4 bg-gray-50">
                <h4 className="font-semibold text-gray-900">{post.og_title || post.link_url}</h4>
                {post.og_description && <p className="text-sm text-gray-600 mt-1">{post.og_description}</p>}
                <p className="text-xs text-blue-600 mt-2">{new URL(post.link_url || '').hostname}</p>
              </div>
            </a>
          </div>
        )

      case 'image':
        return (
          <div>
            {post.title && <h3 className="text-xl font-semibold mb-2">{post.title}</h3>}
            {post.content && <p className="text-gray-700 mb-3 whitespace-pre-wrap">{post.content}</p>}
            <img src={post.file_url || ''} alt={post.file_name || 'Image'} className="w-full rounded-lg" />
          </div>
        )

      case 'youtube':
        return (
          <div>
            {post.title && <h3 className="text-xl font-semibold mb-2">{post.title}</h3>}
            {post.content && <p className="text-gray-700 mb-3 whitespace-pre-wrap">{post.content}</p>}
            <div className="aspect-video">
              <iframe
                src={post.youtube_url || ''}
                className="w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )

      case 'pdf':
        return (
          <div>
            {post.title && <h3 className="text-xl font-semibold mb-2">{post.title}</h3>}
            {post.content && <p className="text-gray-700 mb-3 whitespace-pre-wrap">{post.content}</p>}
            <a
              href={post.file_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-4 bg-gray-50 border rounded-lg hover:bg-gray-100"
            >
              <span className="text-2xl">📄</span>
              <div>
                <p className="font-medium">{post.file_name}</p>
                <p className="text-sm text-gray-500">PDF Document</p>
              </div>
            </a>
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
            {post.author_name?.charAt(0) || 'U'}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{post.author_name}</p>
            <p className="text-sm text-gray-500">
              {formatDistanceToNow(new Date(post.approved_at || post.created_at), { addSuffix: true })}
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
              {topic.icon} {topic.topic_name}
            </span>
          ))}
        </div>
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
                  {localReactions.slice(0, 3).map((r, i) => (
                    <span key={i} className="text-lg">{r.emoji}</span>
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
                {commonEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className={`text-2xl hover:scale-125 transition-transform ${
                      localUserReactions?.includes(emoji) ? 'scale-125' : ''
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Comments */}
          <button
            onClick={() => {
              setShowComments(!showComments)
              onComment?.(post.post_id)
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
        <button className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors">
          <Share2 className="w-5 h-5" />
          <span className="text-sm">Share</span>
        </button>
      </div>

      {/* Comments Section */}
      <Comments postId={post.post_id} isOpen={showComments} onClose={() => setShowComments(false)} />
    </div>
  )
}

