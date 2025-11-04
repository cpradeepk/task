'use client'

import { useState, useEffect } from 'react'
import { Link2, X, Plus, ExternalLink, Search } from 'lucide-react'
import Link from 'next/link'

interface Relationship {
  id: number
  relationshipType: string
  targetType: 'task' | 'development'
  task_id?: string
  bug_id?: string
  name: string
  description: string
  status: string
  priority: string
}

interface RelatedItemsManagerProps {
  itemId: string
  itemType: 'task' | 'development'
  canEdit?: boolean
}

export default function RelatedItemsManager({ itemId, itemType, canEdit = false }: RelatedItemsManagerProps) {
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  // Add relationship form state
  const [targetType, setTargetType] = useState<'task' | 'development'>('task')
  const [relationshipType, setRelationshipType] = useState('relates_to')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedTarget, setSelectedTarget] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadRelationships()
  }, [itemId, itemType])

  const loadRelationships = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/relationships?id=${itemId}&type=${itemType}`)
      const data = await response.json()

      if (data.success) {
        setRelationships(data.data)
      } else {
        setError(data.error || 'Failed to load relationships')
      }
    } catch (err) {
      setError('Failed to load relationships')
    } finally {
      setIsLoading(false)
    }
  }

  // Search for tasks/bugs to link
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const endpoint = targetType === 'task' ? '/api/tasks' : '/api/bugs'
      const response = await fetch(`${endpoint}?search=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()

      if (data.success) {
        // Filter out current item and already related items
        const filtered = data.data.filter((item: any) => {
          const itemIdField = targetType === 'task' ? 'taskId' : 'bugId'
          const currentItemId = item[itemIdField]

          // Exclude current item
          if (currentItemId === itemId) return false

          // Exclude already related items
          const isAlreadyRelated = relationships.some(rel => {
            if (targetType === 'task') {
              return rel.task_id === currentItemId
            } else {
              return rel.bug_id === currentItemId
            }
          })

          return !isAlreadyRelated
        })

        setSearchResults(filtered)
      }
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setIsSearching(false)
    }
  }

  // Add new relationship
  const handleAddRelationship = async () => {
    if (!selectedTarget) return

    setIsSubmitting(true)
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
      const targetId = targetType === 'task' ? selectedTarget.taskId : selectedTarget.bugId

      const response = await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: itemId,
          sourceType: itemType,
          targetId,
          targetType,
          relationshipType,
          createdBy: currentUser.employeeId || 'unknown'
        })
      })

      const data = await response.json()

      if (data.success) {
        // Reset form
        setShowAddForm(false)
        setSearchQuery('')
        setSearchResults([])
        setSelectedTarget(null)
        setRelationshipType('relates_to')

        // Reload relationships
        loadRelationships()
      } else {
        alert(data.error || 'Failed to add relationship')
      }
    } catch (err) {
      alert('Failed to add relationship')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (relationshipId: number, relType: string) => {
    if (!confirm('Are you sure you want to remove this relationship?')) return

    try {
      // Determine table type based on relationship
      let tableType = 'task'
      if (itemType === 'development') {
        tableType = 'development'
      } else if (relType === 'development') {
        tableType = 'task-development'
      }

      const response = await fetch(`/api/relationships/${relationshipId}?type=${tableType}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        loadRelationships()
      } else {
        alert(data.error || 'Failed to delete relationship')
      }
    } catch (err) {
      alert('Failed to delete relationship')
    }
  }

  // Group relationships by type
  const groupedRelationships = relationships.reduce((acc, rel) => {
    const type = rel.relationshipType
    if (!acc[type]) acc[type] = []
    acc[type].push(rel)
    return acc
  }, {} as Record<string, Relationship[]>)

  const relationshipLabels: Record<string, string> = {
    'blocks': 'Blocks',
    'is_blocked_by': 'Blocked by',
    'relates_to': 'Related to',
    'duplicates': 'Duplicates'
  }

  const relationshipColors: Record<string, string> = {
    'blocks': 'bg-red-100 text-red-800 border-red-200',
    'is_blocked_by': 'bg-orange-100 text-orange-800 border-orange-200',
    'relates_to': 'bg-blue-100 text-blue-800 border-blue-200',
    'duplicates': 'bg-purple-100 text-purple-800 border-purple-200'
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Link2 className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Related Items</h3>
        </div>
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Link2 className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Related Items</h3>
          {relationships.length > 0 && (
            <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-medium">
              {relationships.length}
            </span>
          )}
        </div>
        {canEdit && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
          >
            <Plus className="h-4 w-4" />
            <span>Add Relationship</span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {showAddForm && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
          <h4 className="font-medium text-gray-900">Add Related Item</h4>

          {/* Target Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link to:
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="task"
                  checked={targetType === 'task'}
                  onChange={(e) => {
                    setTargetType('task')
                    setSearchQuery('')
                    setSearchResults([])
                    setSelectedTarget(null)
                  }}
                  className="mr-2"
                />
                <span className="text-sm">Task</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="development"
                  checked={targetType === 'development'}
                  onChange={(e) => {
                    setTargetType('development')
                    setSearchQuery('')
                    setSearchResults([])
                    setSelectedTarget(null)
                  }}
                  className="mr-2"
                />
                <span className="text-sm">Development/Bug</span>
              </label>
            </div>
          </div>

          {/* Relationship Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Relationship Type:
            </label>
            <select
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="relates_to">Relates to</option>
              <option value="blocks">Blocks</option>
              <option value="is_blocked_by">Is blocked by</option>
              <option value="duplicates">Duplicates</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search {targetType === 'task' ? 'Tasks' : 'Bugs'}:
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={`Search by ID or ${targetType === 'task' ? 'name' : 'title'}...`}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Search className="h-4 w-4" />
                <span>{isSearching ? 'Searching...' : 'Search'}</span>
              </button>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
              {searchResults.map((item) => {
                const itemId = targetType === 'task' ? item.taskId : item.bugId
                const itemName = targetType === 'task' ? (item.name || item.description) : item.title
                const isSelected = selectedTarget && (targetType === 'task' ? selectedTarget.taskId : selectedTarget.bugId) === itemId

                return (
                  <div
                    key={itemId}
                    onClick={() => setSelectedTarget(item)}
                    className={`p-3 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0 ${
                      isSelected ? 'bg-blue-100' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm font-medium text-blue-600">{itemId}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            item.status === 'Open' ? 'bg-blue-100 text-blue-800' :
                            item.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                            item.status === 'Resolved' || item.status === 'Done' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1 line-clamp-1">{itemName}</p>
                      </div>
                      {isSelected && (
                        <div className="ml-2 text-blue-600">
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              onClick={() => {
                setShowAddForm(false)
                setSearchQuery('')
                setSearchResults([])
                setSelectedTarget(null)
                setRelationshipType('relates_to')
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAddRelationship}
              disabled={!selectedTarget || isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Adding...' : 'Add Relationship'}
            </button>
          </div>
        </div>
      )}

      {relationships.length === 0 ? (
        <p className="text-sm text-gray-500">No related items</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedRelationships).map(([relType, items]) => (
            <div key={relType}>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                {relationshipLabels[relType] || relType}
              </h4>
              <div className="space-y-2">
                {items.map((rel) => {
                  const targetId = rel.targetType === 'task' ? rel.task_id : rel.bug_id
                  const targetUrl = rel.targetType === 'task' ? `/tasks/${targetId}` : `/bugs/${targetId}`

                  return (
                    <div
                      key={rel.id}
                      className={`flex items-start justify-between p-3 rounded-lg border ${relationshipColors[relType] || 'bg-gray-100 text-gray-800 border-gray-200'}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Link
                            href={targetUrl}
                            className="text-sm font-medium hover:underline flex items-center space-x-1"
                          >
                            <span>{targetId}</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                          <span className="text-xs px-2 py-0.5 bg-white bg-opacity-50 rounded">
                            {rel.targetType === 'task' ? 'Task' : 'Development'}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{rel.name}</p>
                        <div className="flex items-center space-x-3 mt-1 text-xs">
                          <span className="font-medium">Status: {rel.status}</span>
                          <span className="font-medium">Priority: {rel.priority}</span>
                        </div>
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => handleDelete(rel.id, rel.targetType)}
                          className="ml-2 p-1 hover:bg-white hover:bg-opacity-50 rounded"
                          title="Remove relationship"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

