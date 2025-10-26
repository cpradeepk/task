'use client'

/**
 * UnifiedWorkItems Component
 * 
 * Displays tasks and bugs in a unified view with tabs and filters
 * Supports filtering by type (all/tasks/bugs), project, and status
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { WorkItem } from '@/lib/types'
import WorkItemFilters, { FilterState } from '@/components/WorkItemFilters'
import { Bug, CheckSquare, Calendar, AlertCircle } from 'lucide-react'

interface UnifiedWorkItemsProps {
  employeeId: string
}

export default function UnifiedWorkItems({ employeeId }: UnifiedWorkItemsProps) {
  const router = useRouter()
  const [workItems, setWorkItems] = useState<WorkItem[]>([])
  const [filteredItems, setFilteredItems] = useState<WorkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    type: 'all',
    projectId: null,
    status: null
  })

  useEffect(() => {
    fetchWorkItems()
  }, [employeeId])

  useEffect(() => {
    applyFilters()
  }, [workItems, filters])

  const fetchWorkItems = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/work-items/user/${employeeId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch work items')
      }

      const data = await response.json()
      setWorkItems(data)
    } catch (err) {
      console.error('Error fetching work items:', err)
      setError('Failed to load work items')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = useCallback(() => {
    let filtered = [...workItems]

    // Filter by type
    if (filters.type !== 'all') {
      filtered = filtered.filter(item => item.type === filters.type)
    }

    // Filter by project
    if (filters.projectId) {
      filtered = filtered.filter(item => item.projectId === filters.projectId)
    }

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(item => item.status === filters.status)
    }

    setFilteredItems(filtered)
  }, [workItems, filters])

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters)
  }

  const handleItemClick = (item: WorkItem) => {
    if (item.type === 'task') {
      router.push(`/tasks/${item.id}`)
    } else {
      router.push(`/bugs/${item.id}`)
    }
  }

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'New': 'bg-blue-100 text-blue-800',
      'In Progress': 'bg-yellow-100 text-yellow-800',
      'Completed': 'bg-green-100 text-green-800',
      'On Hold': 'bg-gray-100 text-gray-800',
      'Resolved': 'bg-green-100 text-green-800',
      'Closed': 'bg-gray-100 text-gray-800',
      'Reopened': 'bg-red-100 text-red-800'
    }
    return statusColors[status] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityColor = (priority: string) => {
    const priorityColors: Record<string, string> = {
      'High': 'text-red-600',
      'U&I': 'text-red-600',
      'Medium': 'text-yellow-600',
      'NU&I': 'text-yellow-600',
      'Low': 'text-green-600',
      'U&NI': 'text-blue-600',
      'NU&NI': 'text-gray-600'
    }
    return priorityColors[priority] || 'text-gray-600'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading work items...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-800">{error}</p>
          <button
            onClick={fetchWorkItems}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <WorkItemFilters onFilterChange={handleFilterChange} />

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{filteredItems.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <CheckSquare className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tasks</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredItems.filter(item => item.type === 'task').length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckSquare className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Bugs</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredItems.filter(item => item.type === 'bug').length}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <Bug className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Work Items List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {filters.type === 'all' ? 'All Work Items' : filters.type === 'task' ? 'Tasks' : 'Bugs'}
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({filteredItems.length})
            </span>
          </h3>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <CheckSquare className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-600">
              {filters.type !== 'all' || filters.projectId || filters.status
                ? 'Try adjusting your filters'
                : 'No work items assigned to you yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredItems.map(item => (
              <div
                key={`${item.type}-${item.id}`}
                onClick={() => handleItemClick(item)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {item.type === 'task' ? (
                        <CheckSquare className="h-5 w-5 text-green-600" />
                      ) : (
                        <Bug className="h-5 w-5 text-red-600" />
                      )}
                      <h4 className="font-medium text-gray-900">{item.title}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600 ml-8">
                      <span className={`font-medium ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </span>
                      {item.projectName && (
                        <span className="flex items-center gap-1">
                          📁 {item.projectName}
                        </span>
                      )}
                      {item.dueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(item.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {item.severity && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded">
                          {item.severity}
                        </span>
                      )}
                    </div>
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

