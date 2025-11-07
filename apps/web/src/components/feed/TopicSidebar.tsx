'use client'

import { useEffect, useState } from 'react'
import { Hash, Lock, Bookmark } from 'lucide-react'

interface Topic {
  id: number
  topic_name: string
  description: string | null
  icon: string | null
  display_order: number
  is_personal: number
  is_saved: number
  owner_user_id: string | null
  postCount: number
}

interface TopicSidebarProps {
  selectedTopicId: number | null
  onSelectTopic: (topicId: number | null) => void
}

export default function TopicSidebar({ selectedTopicId, onSelectTopic }: TopicSidebarProps) {
  const [topics, setTopics] = useState<Topic[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchTopics()
  }, [])

  const fetchTopics = async () => {
    try {
      const response = await fetch('/api/feed/topics?includePersonal=true')
      const data = await response.json()
      if (data.success) {
        setTopics(data.data)
      }
    } catch (error) {
      console.error('Error fetching topics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getTopicIcon = (topic: Topic) => {
    if (topic.is_personal === 1) {
      return <Lock className="w-4 h-4 text-gray-500" />
    }
    if (topic.is_saved === 1) {
      return <Bookmark className="w-4 h-4 text-yellow-500" />
    }
    if (topic.icon) {
      return <span className="text-lg">{topic.icon}</span>
    }
    return <Hash className="w-4 h-4 text-gray-500" />
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h2 className="text-lg font-semibold mb-4">Topics</h2>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 sticky top-20">
      <h2 className="text-lg font-semibold mb-4 text-gray-900">Topics</h2>
      
      {/* All Posts */}
      <button
        onClick={() => onSelectTopic(null)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg mb-2 transition-colors ${
          selectedTopicId === null
            ? 'bg-blue-50 text-blue-700 font-medium'
            : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4" />
          <span>All Posts</span>
        </div>
        <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
          {topics.reduce((sum, t) => sum + t.postCount, 0)}
        </span>
      </button>

      <div className="border-t pt-2 mt-2">
        {/* Public Topics */}
        <div className="space-y-1">
          {topics
            .filter((t) => !t.is_personal && !t.is_saved)
            .map((topic) => (
              <button
                key={topic.id}
                onClick={() => onSelectTopic(topic.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  selectedTopicId === topic.id
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {getTopicIcon(topic)}
                  <span className="text-sm">{topic.topic_name}</span>
                </div>
                {topic.postCount > 0 && (
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                    {topic.postCount}
                  </span>
                )}
              </button>
            ))}
        </div>

        {/* Personal Topics */}
        {topics.some((t) => t.is_personal || t.is_saved) && (
          <>
            <div className="border-t my-2 pt-2">
              <p className="text-xs font-semibold text-gray-500 uppercase px-3 mb-1">Personal</p>
            </div>
            <div className="space-y-1">
              {topics
                .filter((t) => t.is_personal || t.is_saved)
                .map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => onSelectTopic(topic.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                      selectedTopicId === topic.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {getTopicIcon(topic)}
                      <span className="text-sm">{topic.topic_name}</span>
                    </div>
                    {topic.postCount > 0 && (
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                        {topic.postCount}
                      </span>
                    )}
                  </button>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

