'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { getCurrentUser } from '@/lib/auth'
import { hasTabAccess } from '@/lib/permissions'
import { Plus, Edit2, Trash2, Save, X, GripVertical } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface Topic {
  id: number
  topic_name: string
  description: string | null
  icon: string | null
  display_order: number
  postCount: number
  created_at: string
}

export default function FeedTopicsAdminPage() {
  const [isHydrated, setIsHydrated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [topics, setTopics] = useState<Topic[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ topic_name: '', description: '', icon: '', display_order: 0 })
  const [isCreating, setIsCreating] = useState(false)
  const [createForm, setCreateForm] = useState({ topic_name: '', description: '', icon: '', display_order: 0 })
  const router = useRouter()
  const currentUser = getCurrentUser()

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    // Check if user is logged in
    if (!currentUser) {
      router.push('/')
      return
    }

    // Permission gate
    if (!hasTabAccess(currentUser, 'feed_topics')) {
      router.push('/dashboard')
      return
    }

    setIsLoading(false)
    fetchTopics()
  }, [currentUser, router, isHydrated])

  const fetchTopics = async () => {
    try {
      const response = await fetch('/api/feed/topics?includePersonal=false')
      const data = await response.json()
      if (data.success) {
        setTopics(data.data)
      }
    } catch (error) {
      console.error('Error fetching topics:', error)
    }
  }

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/feed/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm)
      })
      const data = await response.json()
      if (data.success) {
        setIsCreating(false)
        setCreateForm({ topic_name: '', description: '', icon: '', display_order: 0 })
        fetchTopics()
      } else {
        alert(data.error || 'Failed to create topic')
      }
    } catch (error) {
      console.error('Error creating topic:', error)
      alert('Failed to create topic')
    }
  }

  const handleUpdate = async (topicId: number) => {
    try {
      const response = await fetch(`/api/feed/topics/${topicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })
      const data = await response.json()
      if (data.success) {
        setEditingId(null)
        fetchTopics()
      } else {
        alert(data.error || 'Failed to update topic')
      }
    } catch (error) {
      console.error('Error updating topic:', error)
      alert('Failed to update topic')
    }
  }

  const handleDelete = async (topicId: number, topicName: string) => {
    if (!confirm(`Are you sure you want to delete "${topicName}"?`)) return

    try {
      const response = await fetch(`/api/feed/topics/${topicId}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (data.success) {
        fetchTopics()
      } else {
        alert(data.error || 'Failed to delete topic')
      }
    } catch (error) {
      console.error('Error deleting topic:', error)
      alert('Failed to delete topic')
    }
  }

  const startEdit = (topic: Topic) => {
    setEditingId(topic.id)
    setEditForm({
      topic_name: topic.topic_name,
      description: topic.description || '',
      icon: topic.icon || '',
      display_order: topic.display_order
    })
  }

  if (!isHydrated || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <LoadingSpinner size="lg" message="Loading topics..." />
        </div>
      </div>
    )
  }

  if (!currentUser || !hasTabAccess(currentUser, 'feed_topics')) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Manage Feed Topics</h1>
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Topic
            </button>
          </div>

          {/* Create Form */}
          {isCreating && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold mb-3">Create New Topic</h3>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <input
                  type="text"
                  placeholder="Topic Name *"
                  value={createForm.topic_name}
                  onChange={(e) => setCreateForm({ ...createForm, topic_name: e.target.value })}
                  className="px-3 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Icon (emoji or icon name)"
                  value={createForm.icon}
                  onChange={(e) => setCreateForm({ ...createForm, icon: e.target.value })}
                  className="px-3 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="px-3 py-2 border rounded-lg col-span-2"
                />
                <input
                  type="number"
                  placeholder="Display Order"
                  value={createForm.display_order}
                  onChange={(e) => setCreateForm({ ...createForm, display_order: parseInt(e.target.value) })}
                  className="px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={!createForm.topic_name}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Create
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false)
                    setCreateForm({ topic_name: '', description: '', icon: '', display_order: 0 })
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Topics Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Icon</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Topic Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Posts</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topics.map((topic) => (
                  <tr key={topic.id} className="hover:bg-gray-50">
                    {editingId === topic.id ? (
                      <>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={editForm.display_order}
                            onChange={(e) => setEditForm({ ...editForm, display_order: parseInt(e.target.value) })}
                            className="w-20 px-2 py-1 border rounded"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={editForm.icon}
                            onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                            className="w-20 px-2 py-1 border rounded"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={editForm.topic_name}
                            onChange={(e) => setEditForm({ ...editForm, topic_name: e.target.value })}
                            className="w-full px-2 py-1 border rounded"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            className="w-full px-2 py-1 border rounded"
                          />
                        </td>
                        <td className="px-4 py-3 text-gray-500">{topic.postCount}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdate(topic.id)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-gray-700">{topic.display_order}</td>
                        <td className="px-4 py-3 text-2xl">{topic.icon || '📌'}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{topic.topic_name}</td>
                        <td className="px-4 py-3 text-gray-600">{topic.description || '-'}</td>
                        <td className="px-4 py-3 text-gray-500">{topic.postCount}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(topic)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(topic.id, topic.topic_name)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {topics.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No topics found. Click "Add Topic" to create one.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

