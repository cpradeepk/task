/**
 * Deleted Items Page - Admin Only
 * Shows all soft-deleted items (Projects, Tasks, Subtasks, Bugs)
 * Allows restoring or permanently deleting items
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { getCurrentUser, getUserNameByEmployeeId } from '@/lib/auth'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  CheckSquare,
  Bug as BugIcon,
  FolderOpen,
  ListTodo,
  Calendar,
  User as UserIcon,
  Filter
} from 'lucide-react'
import { formatDate } from '@/lib/data'

interface DeletedItem {
  id: number | string
  itemType: 'project' | 'task' | 'subtask' | 'bug'
  deletedAt: string
  deletedBy: string
  // Project fields
  projectId?: string
  projectName?: string
  // Task fields
  taskId?: string
  description?: string
  assignedTo?: string
  status?: string
  priority?: string
  // Subtask fields
  parentTaskId?: string
  // Bug fields
  bugId?: string
  title?: string
  severity?: string
}

interface DeletedItemCounts {
  total: number
  projects: number
  tasks: number
  subtasks: number
  bugs: number
}

// Component to display user name
function UserName({ employeeId }: { employeeId: string }) {
  const [name, setName] = useState<string>(employeeId)

  useEffect(() => {
    getUserNameByEmployeeId(employeeId).then(setName)
  }, [employeeId])

  return <span>{name}</span>
}

export default function DeletedItemsPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([])
  const [counts, setCounts] = useState<DeletedItemCounts>({
    total: 0,
    projects: 0,
    tasks: 0,
    subtasks: 0,
    bugs: 0
  })
  const [filterType, setFilterType] = useState<'all' | 'project' | 'task' | 'subtask' | 'bug'>('all')
  const [isRestoring, setIsRestoring] = useState<number | string | null>(null)
  const [isDeleting, setIsDeleting] = useState<number | string | null>(null)

  useEffect(() => {
    const user = getCurrentUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Only admin can access this page
    if (user.role !== 'admin') {
      router.push('/dashboard')
      return
    }

    setCurrentUser(user)
    loadDeletedItems()
  }, [router])

  const loadDeletedItems = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/deleted-items')
      const data = await response.json()

      if (data.success) {
        setDeletedItems(data.data)
        setCounts(data.count)
      }
    } catch (error) {
      console.error('Failed to load deleted items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (item: DeletedItem) => {
    if (!confirm(`Are you sure you want to restore this ${item.itemType}?`)) {
      return
    }

    try {
      setIsRestoring(item.id)
      const response = await fetch('/api/deleted-items/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: item.itemType,
          id: item.id
        })
      })

      const data = await response.json()

      if (data.success) {
        await loadDeletedItems()
      } else {
        alert('Failed to restore item: ' + data.error)
      }
    } catch (error) {
      console.error('Failed to restore item:', error)
      alert('Failed to restore item')
    } finally {
      setIsRestoring(null)
    }
  }

  const handlePermanentDelete = async (item: DeletedItem) => {
    if (!confirm(`⚠️ PERMANENT DELETE\n\nAre you sure you want to PERMANENTLY delete this ${item.itemType}?\n\nThis action CANNOT be undone!`)) {
      return
    }

    try {
      setIsDeleting(item.id)
      const response = await fetch('/api/deleted-items/permanent-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: item.itemType,
          id: item.id
        })
      })

      const data = await response.json()

      if (data.success) {
        await loadDeletedItems()
      } else {
        alert('Failed to delete item: ' + data.error)
      }
    } catch (error) {
      console.error('Failed to delete item:', error)
      alert('Failed to delete item')
    } finally {
      setIsDeleting(null)
    }
  }

  const getItemIcon = (itemType: string) => {
    switch (itemType) {
      case 'project':
        return <FolderOpen className="h-5 w-5 text-blue-500" />
      case 'task':
        return <CheckSquare className="h-5 w-5 text-green-500" />
      case 'subtask':
        return <ListTodo className="h-5 w-5 text-purple-500" />
      case 'bug':
        return <BugIcon className="h-5 w-5 text-red-500" />
      default:
        return null
    }
  }

  const getItemTitle = (item: DeletedItem) => {
    switch (item.itemType) {
      case 'project':
        return `${item.projectId} - ${item.projectName}`
      case 'task':
        return `${item.taskId} - ${item.description}`
      case 'subtask':
        return `Subtask for ${item.parentTaskId}: ${item.description}`
      case 'bug':
        return `${item.bugId} - ${item.title}`
      default:
        return 'Unknown Item'
    }
  }

  const filteredItems = filterType === 'all' 
    ? deletedItems 
    : deletedItems.filter(item => item.itemType === filterType)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <Trash2 className="h-8 w-8 text-red-500" />
            <h1 className="text-3xl font-bold text-gray-900">Deleted Items</h1>
          </div>
          <p className="text-gray-600">
            View and restore soft-deleted items across the system
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            All Items ({counts.total})
          </button>
          <button
            onClick={() => setFilterType('project')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterType === 'project'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Projects ({counts.projects})
          </button>
          <button
            onClick={() => setFilterType('task')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterType === 'task'
                ? 'bg-green-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Tasks ({counts.tasks})
          </button>
          <button
            onClick={() => setFilterType('subtask')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterType === 'subtask'
                ? 'bg-purple-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Subtasks ({counts.subtasks})
          </button>
          <button
            onClick={() => setFilterType('bug')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterType === 'bug'
                ? 'bg-red-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Bugs ({counts.bugs})
          </button>
        </div>

        {/* Deleted Items List */}
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Trash2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No deleted items found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div
                key={`${item.itemType}-${item.id}`}
                className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getItemIcon(item.itemType)}
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 uppercase">
                        {item.itemType}
                      </span>
                    </div>

                    <h3 className="font-medium text-gray-900 mb-2">
                      {getItemTitle(item)}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Deleted: {formatDate(item.deletedAt)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <UserIcon className="h-4 w-4" />
                        <span>By: <UserName employeeId={item.deletedBy} /></span>
                      </div>
                      {item.assignedTo && (
                        <div className="flex items-center space-x-1">
                          <UserIcon className="h-4 w-4 text-blue-500" />
                          <span>Assigned to: <UserName employeeId={item.assignedTo} /></span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleRestore(item)}
                      disabled={isRestoring === item.id}
                      className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                      title="Restore item"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span className="text-sm">
                        {isRestoring === item.id ? 'Restoring...' : 'Restore'}
                      </span>
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(item)}
                      disabled={isDeleting === item.id}
                      className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                      title="Permanently delete item"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="text-sm">
                        {isDeleting === item.id ? 'Deleting...' : 'Delete'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

