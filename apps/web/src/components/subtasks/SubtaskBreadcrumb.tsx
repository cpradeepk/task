'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { Task, Bug } from '@/lib/types'

interface SubtaskBreadcrumbProps {
  currentId: string
  currentType: 'task' | 'bug'
  currentName: string
}

interface BreadcrumbItem {
  id: string
  name: string
  type: 'task' | 'bug'
}

export default function SubtaskBreadcrumb({ currentId, currentType, currentName }: SubtaskBreadcrumbProps) {
  const router = useRouter()
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    buildBreadcrumbs()
  }, [currentId, currentType])

  const buildBreadcrumbs = async () => {
    try {
      setLoading(true)
      const items: BreadcrumbItem[] = []
      let currentItem = { id: currentId, type: currentType, name: currentName }

      // Traverse up the parent chain
      while (currentItem) {
        items.unshift({
          id: currentItem.id,
          name: currentItem.name,
          type: currentItem.type
        })

        // Fetch parent
        const endpoint = currentItem.type === 'task' 
          ? `/api/tasks/${currentItem.id}`
          : `/api/bugs/${currentItem.id}`
        
        const response = await fetch(endpoint)
        const data = await response.json()

        if (data.success && data.data) {
          const item = data.data as Task | Bug
          const parentId = currentItem.type === 'task' 
            ? (item as Task).parentTaskId
            : (item as Bug).parentDevId

          if (parentId) {
            // Fetch parent details
            const parentEndpoint = currentItem.type === 'task'
              ? `/api/tasks/${parentId}`
              : `/api/bugs/${parentId}`
            
            const parentResponse = await fetch(parentEndpoint)
            const parentData = await parentResponse.json()

            if (parentData.success && parentData.data) {
              const parentItem = parentData.data as Task | Bug
              currentItem = {
                id: parentId,
                type: currentItem.type,
                name: currentItem.type === 'task' 
                  ? (parentItem as Task).name
                  : (parentItem as Bug).title
              }
            } else {
              break
            }
          } else {
            break
          }
        } else {
          break
        }
      }

      setBreadcrumbs(items)
    } catch (error) {
      console.error('Failed to build breadcrumbs:', error)
      // Fallback to just current item
      setBreadcrumbs([{ id: currentId, name: currentName, type: currentType }])
    } finally {
      setLoading(false)
    }
  }

  const handleBreadcrumbClick = (item: BreadcrumbItem) => {
    if (item.type === 'task') {
      router.push(`/tasks/${item.id}`)
    } else {
      router.push(`/bugs/${item.id}`)
    }
  }

  const handleHomeClick = () => {
    if (currentType === 'task') {
      router.push('/tasks')
    } else {
      router.push('/bugs')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 mb-4 animate-pulse">
        <div className="h-4 w-4 bg-gray-200 rounded"></div>
        <div className="h-4 w-32 bg-gray-200 rounded"></div>
      </div>
    )
  }

  // Don't show breadcrumbs if there's only one item (no parent)
  if (breadcrumbs.length <= 1) {
    return null
  }

  return (
    <nav className="flex items-center gap-2 mb-4 text-sm">
      {/* Home icon */}
      <button
        onClick={handleHomeClick}
        className="text-gray-500 hover:text-primary transition-colors"
        title={`Back to ${currentType === 'task' ? 'Tasks' : 'Bugs'}`}
      >
        <Home className="h-4 w-4" />
      </button>

      {/* Breadcrumb items */}
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1

        return (
          <div key={item.id} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-gray-400" />
            {isLast ? (
              <span className="text-gray-900 font-medium truncate max-w-xs">
                {item.name}
              </span>
            ) : (
              <button
                onClick={() => handleBreadcrumbClick(item)}
                className="text-primary hover:underline truncate max-w-xs"
              >
                {item.name}
              </button>
            )}
          </div>
        )
      })}
    </nav>
  )
}

