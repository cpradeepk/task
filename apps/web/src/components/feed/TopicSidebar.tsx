'use client'

import { useEffect, useState, useRef } from 'react'
import { Hash, Lock, Bookmark } from 'lucide-react'
import { QUERIES } from '@/lib/graphql-queries'

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

interface Topic {
  id: string
  topicName: string
  description: string | null
  icon: string | null
  displayOrder: number
  isPersonal: boolean
  isSaved: boolean
  ownerUserId: string | null
  postCount?: number
}

interface TopicSidebarProps {
  selectedTopicId: string | null
  onSelectTopic: (topicId: string | null) => void
}

export default function TopicSidebar({ selectedTopicId, onSelectTopic }: TopicSidebarProps) {
  const [topics, setTopics] = useState<Topic[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const hasFetchedTopics = useRef(false)

  useEffect(() => {
    console.log('🔵 [TopicSidebar] useEffect triggered - hasFetchedTopics:', hasFetchedTopics.current)
    // Prevent duplicate fetches in React Strict Mode
    if (!hasFetchedTopics.current) {
      console.log('✅ [TopicSidebar] First fetch - calling fetchTopics()')
      hasFetchedTopics.current = true
      fetchTopics()
    } else {
      console.log('⏭️  [TopicSidebar] Skipping fetchTopics - already fetched')
    }
  }, [])

  const fetchTopics = async () => {
    try {
      console.log('🔵 [TopicSidebar] Fetching topics via GraphQL...')
      const data = await executeGraphQLQuery(QUERIES.GET_FEED_TOPICS, {
        includePersonal: true
      })
      setTopics(data.feedTopics)
      console.log('✅ [TopicSidebar] Topics fetched successfully:', data.feedTopics.length)
    } catch (error) {
      console.error('❌ [TopicSidebar] Error fetching topics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getTopicIcon = (topic: Topic) => {
    if (topic.isPersonal) {
      return <Lock className="w-4 h-4 text-gray-500" />
    }
    if (topic.isSaved) {
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
          {topics.reduce((sum, t) => sum + (t.postCount || 0), 0)}
        </span>
      </button>

      <div className="border-t pt-2 mt-2">
        {/* Public Topics */}
        <div className="space-y-1">
          {topics
            .filter((t) => !t.isPersonal && !t.isSaved)
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
                  <span className="text-sm">{topic.topicName}</span>
                </div>
                {typeof topic.postCount === 'number' && topic.postCount > 0 ? (
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                    {topic.postCount}
                  </span>
                ) : null}
              </button>
            ))}
        </div>

        {/* Personal Topics */}
        {topics.some((t) => t.isPersonal || t.isSaved) && (
          <>
            <div className="border-t my-2 pt-2">
              <p className="text-xs font-semibold text-gray-500 uppercase px-3 mb-1">Personal</p>
            </div>
            <div className="space-y-1">
              {topics
                .filter((t) => t.isPersonal || t.isSaved)
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
                      <span className="text-sm">{topic.topicName}</span>
                    </div>
                    {typeof topic.postCount === 'number' && topic.postCount > 0 ? (
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                        {topic.postCount}
                      </span>
                    ) : null}
                  </button>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

