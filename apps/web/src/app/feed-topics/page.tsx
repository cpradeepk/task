'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { hasTabAccess } from '@/lib/permissions'
import { User } from '@/lib/types'
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
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

interface Topic {
  id: string
  topicName: string
  description: string | null
  icon: string | null
  displayOrder: number
  isPersonal: boolean
  createdBy: string
  createdAt: string
}

export default function FeedTopicsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [topics, setTopics] = useState<Topic[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    topicName: '',
    description: '',
    icon: '',
    displayOrder: 0
  })
  const router = useRouter()

  useEffect(() => {
    const user = getCurrentUser()
    if (!user) {
      router.push('/')
      return
    }
    
    // Permission gate
    if (!hasTabAccess(user, 'feed_topics')) {
      router.push('/dashboard')
      return
    }
    
    setCurrentUser(user)
    setIsLoading(false)
    fetchTopics()
  }, [router])

  const fetchTopics = async () => {
    try {
      console.log('🔵 [FeedTopics] Fetching topics via GraphQL...')
      const data = await executeGraphQLQuery(QUERIES.GET_FEED_TOPICS, {
        includePersonal: false // Exclude personal topics
      })
      
      // Filter out Personal Notes and Saved Posts
      const filteredTopics = data.feedTopics.filter((topic: Topic) => 
        !topic.isPersonal && 
        topic.topicName !== 'Personal Notes' && 
        topic.topicName !== 'Saved Posts'
      )
      
      setTopics(filteredTopics)
      console.log('✅ [FeedTopics] Topics fetched successfully:', filteredTopics.length)
    } catch (error) {
      console.error('❌ [FeedTopics] Error fetching topics:', error)
      alert('Failed to fetch topics')
    }
  }

  const handleCreate = async () => {
    if (!formData.topicName.trim()) {
      alert('Topic name is required')
      return
    }

    try {
      console.log('🔵 [FeedTopics] Creating topic via GraphQL...')
      await executeGraphQLMutation(MUTATIONS.CREATE_FEED_TOPIC, {
        input: {
          topicName: formData.topicName,
          description: formData.description || null,
          icon: formData.icon || null,
          displayOrder: formData.displayOrder || topics.length + 1
        }
      })

      console.log('✅ [FeedTopics] Topic created successfully')
      setIsCreating(false)
      setFormData({ topicName: '', description: '', icon: '', displayOrder: 0 })
      fetchTopics()
    } catch (error: any) {
      console.error('❌ [FeedTopics] Error creating topic:', error)

      // Check for duplicate topic name error
      if (error?.message?.includes('duplicate key value violates unique constraint') ||
          error?.message?.includes('feed_topics_public_name_unique')) {
        alert(`A topic with the name "${formData.topicName}" already exists. Please choose a different name.`)
      } else {
        alert('Failed to create topic: ' + (error?.message || 'Unknown error'))
      }
    }
  }

  const handleDelete = async (topicId: string) => {
    if (!confirm('Are you sure you want to delete this topic?')) {
      return
    }

    try {
      console.log('🔵 [FeedTopics] Deleting topic via REST...')
      const response = await fetch(`/api/feed/topics/${topicId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete topic')
      }

      console.log('✅ [FeedTopics] Topic deleted successfully')
      fetchTopics()
    } catch (error) {
      console.error('❌ [FeedTopics] Error deleting topic:', error)
      alert('Failed to delete topic')
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
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Page Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Feed Topics Management</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage feed topics (excludes Personal Notes and Saved Posts)
              </p>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary text-black rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="h-5 w-5" />
              <span className="font-medium">Create Topic</span>
            </button>
          </div>

          {/* Create Form */}
          {isCreating && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Topic</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Topic Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.topicName}
                    onChange={(e) => setFormData({ ...formData, topicName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., Technology, Design, Marketing"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Icon (Emoji)
                  </label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., 💻, 🎨, 📱"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={3}
                    placeholder="Brief description of this topic"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={() => {
                    setIsCreating(false)
                    setFormData({ topicName: '', description: '', icon: '', displayOrder: 0 })
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <X className="h-4 w-4 inline mr-2" />
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 bg-primary text-black rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Save className="h-4 w-4 inline mr-2" />
                  Create Topic
                </button>
              </div>
            </div>
          )}

          {/* Topics List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Icon
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Topic Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Display Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created At
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topics.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        No topics found. Create your first topic!
                      </td>
                    </tr>
                  ) : (
                    topics.map((topic) => (
                      <tr key={topic.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-2xl">
                          {topic.icon || '📁'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{topic.topicName}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500">{topic.description || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{topic.displayOrder}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {new Date(topic.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleDelete(topic.id)}
                            className="text-red-600 hover:text-red-900 ml-4"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}


