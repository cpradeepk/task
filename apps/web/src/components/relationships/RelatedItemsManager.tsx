'use client'

import { useState, useEffect } from 'react'
import { Link2, X, Plus, ExternalLink } from 'lucide-react'
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
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Add relationship form will be implemented here</p>
          <button
            onClick={() => setShowAddForm(false)}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
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

