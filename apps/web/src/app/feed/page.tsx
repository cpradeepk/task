'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { User } from '@/lib/types'
import { Plus, Search, X, Filter, TrendingUp, MessageSquare, Eye, Clock } from 'lucide-react'
import ConditionalNavbar from '@/components/layout/ConditionalNavbar'
import TopicSidebar from '@/components/feed/TopicSidebar'
import FeedPost from '@/components/feed/FeedPost'
import PostCreator from '@/components/feed/PostCreator'

export default function FeedPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [isLoadingPosts, setIsLoadingPosts] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isPostCreatorOpen, setIsPostCreatorOpen] = useState(false)
  const [sortBy, setSortBy] = useState<'latest' | 'reactions' | 'comments' | 'views'>('latest')
  const [showFilters, setShowFilters] = useState(false)
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('')
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const user = getCurrentUser()
    if (!user) {
      router.push('/')
      return
    }
    setCurrentUser(user)
    setIsLoading(false)
    // Initialize personal topics
    initPersonalTopics()
  }, [router])

  useEffect(() => {
    if (currentUser) {
      setOffset(0)
      fetchPosts(true)
    }
  }, [currentUser, selectedTopicId, searchQuery, sortBy, contentTypeFilter])

  const initPersonalTopics = async () => {
    try {
      await fetch('/api/feed/topics/init-personal', {
        method: 'POST'
      })
    } catch (error) {
      console.error('Error initializing personal topics:', error)
    }
  }

  const fetchPosts = async (reset: boolean = false) => {
    setIsLoadingPosts(true)
    try {
      const currentOffset = reset ? 0 : offset
      const params = new URLSearchParams()
      if (selectedTopicId) params.append('topicId', selectedTopicId.toString())
      if (searchQuery) params.append('search', searchQuery)
      if (sortBy) params.append('sortBy', sortBy)
      if (contentTypeFilter) params.append('contentType', contentTypeFilter)
      params.append('limit', '20')
      params.append('offset', currentOffset.toString())

      const response = await fetch(`/api/feed/posts?${params}`)
      const data = await response.json()
      if (data.success) {
        if (reset) {
          setPosts(data.data)
          setOffset(20)
        } else {
          setPosts([...posts, ...data.data])
          setOffset(currentOffset + 20)
        }
        setHasMore(data.data.length === 20)
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setIsLoadingPosts(false)
    }
  }

  const loadMore = () => {
    if (!isLoadingPosts && hasMore) {
      fetchPosts(false)
    }
  }

  const handleReact = async (postId: string, emoji: string) => {
    // TODO: Implement reaction API call
    console.log('React:', postId, emoji)
  }

  const handleComment = (postId: string) => {
    // TODO: Implement comment functionality
    console.log('Comment:', postId)
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
      <PostCreator
        isOpen={isPostCreatorOpen}
        onClose={() => setIsPostCreatorOpen(false)}
        onPostCreated={fetchPosts}
      />
      <div className="min-h-screen bg-gray-50">
        {/* Main Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Page Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Feed</h1>
              <p className="mt-1 text-sm text-gray-600">
                Share and discover content with your team
              </p>
            </div>
            <button
              className="flex items-center space-x-2 px-4 py-2 bg-primary text-black rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
              onClick={() => setIsPostCreatorOpen(true)}
            >
              <Plus className="h-5 w-5" />
              <span className="font-medium">Create Post</span>
            </button>
          </div>

          {/* 3-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Sidebar - Topics */}
            <div className="lg:col-span-3">
              <TopicSidebar
                selectedTopicId={selectedTopicId}
                onSelectTopic={setSelectedTopicId}
              />
            </div>

            {/* Center - Feed Posts */}
            <div className="lg:col-span-6">
              {/* Search & Filter Bar */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4 sticky top-20 z-10">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search posts, authors, topics..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 py-2 text-sm border rounded-lg transition-colors flex items-center gap-2 ${
                      showFilters ? 'bg-blue-50 text-blue-700 border-blue-300' : 'text-gray-600 hover:text-gray-900 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                  </button>
                </div>

                {/* Sort & Filter Options */}
                {showFilters && (
                  <div className="pt-3 border-t border-gray-200 space-y-3">
                    {/* Sort By */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">Sort By</label>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => setSortBy('latest')}
                          className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 transition-colors ${
                            sortBy === 'latest' ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <Clock className="w-4 h-4" />
                          Latest
                        </button>
                        <button
                          onClick={() => setSortBy('reactions')}
                          className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 transition-colors ${
                            sortBy === 'reactions' ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <TrendingUp className="w-4 h-4" />
                          Most Reactions
                        </button>
                        <button
                          onClick={() => setSortBy('comments')}
                          className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 transition-colors ${
                            sortBy === 'comments' ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <MessageSquare className="w-4 h-4" />
                          Most Comments
                        </button>
                        <button
                          onClick={() => setSortBy('views')}
                          className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 transition-colors ${
                            sortBy === 'views' ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <Eye className="w-4 h-4" />
                          Most Views
                        </button>
                      </div>
                    </div>

                    {/* Content Type Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">Content Type</label>
                      <select
                        value={contentTypeFilter}
                        onChange={(e) => setContentTypeFilter(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">All Types</option>
                        <option value="text">Text</option>
                        <option value="link">Link</option>
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                        <option value="pdf">PDF</option>
                        <option value="youtube">YouTube</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Posts Container */}
              <div className="space-y-4">
                {isLoadingPosts ? (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="text-center text-gray-500">
                      <p>Loading posts...</p>
                    </div>
                  </div>
                ) : posts.length > 0 ? (
                  posts.map((post) => (
                    <FeedPost
                      key={post.post_id}
                      post={post}
                      onReact={handleReact}
                      onComment={handleComment}
                    />
                  ))
                ) : (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="text-center text-gray-500">
                      <p className="text-lg font-medium">No posts yet</p>
                      <p className="text-sm mt-1">Be the first to share something!</p>
                    </div>
                  </div>
                )}

                {/* Load More Button */}
                {!isLoadingPosts && posts.length > 0 && hasMore && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={loadMore}
                      className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      Load More Posts
                    </button>
                  </div>
                )}

                {/* Loading More Indicator */}
                {isLoadingPosts && posts.length > 0 && (
                  <div className="flex justify-center mt-6">
                    <div className="loading-spinner h-8 w-8"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar - Future Expansion */}
            <div className="lg:col-span-3 hidden lg:block">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-20">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity</h2>
                <div className="text-sm text-gray-500">
                  <p>Coming soon...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

