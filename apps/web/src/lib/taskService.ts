// Client-side Task service functions
'use client'

import { Task } from './types'
import { cache, CACHE_KEYS } from './cache'

/**
 * Get all tasks with optional filters
 */
export async function getAllTasks(filters?: {
  assignedTo?: string
  assignedBy?: string
  status?: string
  priority?: string
}): Promise<Task[]> {
  try {
    // Create cache key based on filters
    const filterKey = filters ? JSON.stringify(filters) : 'all'
    const cacheKey = `${CACHE_KEYS.TASKS}_${filterKey}`

    // Check cache first (only for unfiltered requests to avoid complexity)
    if (!filters || Object.keys(filters).length === 0) {
      const cachedTasks = cache.get<Task[]>(cacheKey)
      if (cachedTasks) {
        console.log('Returning cached tasks data')
        return cachedTasks
      }
    }

    const params = new URLSearchParams()
    if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo)
    if (filters?.assignedBy) params.append('assignedBy', filters.assignedBy)
    if (filters?.status) params.append('status', filters.status)
    if (filters?.priority) params.append('priority', filters.priority)

    const response = await fetch(`/api/tasks?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })

    if (!response.ok) {
      // If we have cached data, return it instead of throwing error
      if (!filters || Object.keys(filters).length === 0) {
        const cachedTasks = cache.get<Task[]>(cacheKey)
        if (cachedTasks) {
          console.log('API failed, returning cached tasks data')
          return cachedTasks
        }
      }

      if (response.status === 500) {
        throw new Error('Server error - this might be due to quota limits. Please try again in a few minutes.')
      } else if (response.status === 404) {
        throw new Error('Task service not found')
      } else {
        throw new Error(`Failed to fetch tasks (${response.status})`)
      }
    }

    const result = await response.json()
    const tasks = result.data || []

    // Cache the result (only for unfiltered requests)
    if (!filters || Object.keys(filters).length === 0) {
      cache.set(cacheKey, tasks, 2) // Cache for 2 minutes
    }

    return tasks
  } catch (error) {
    console.error('Failed to get tasks:', error)

    // Try to return cached data as fallback
    if (!filters || Object.keys(filters).length === 0) {
      const cacheKey = `${CACHE_KEYS.TASKS}_all`
      const cachedTasks = cache.get<Task[]>(cacheKey)
      if (cachedTasks) {
        console.log('Error occurred, returning cached tasks data as fallback')
        return cachedTasks
      }
    }

    // Re-throw the error so the component can handle it
    if (error instanceof Error) {
      throw error
    } else {
      throw new Error('Network error - please check your connection and try again')
    }
  }
}

/**
 * Get task by ID
 */
export async function getTaskById(taskId: string): Promise<Task | null> {
  try {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`Failed to fetch task (${response.status})`)
    }

    const result = await response.json()
    return result.data || null
  } catch (error) {
    console.error('Failed to get task by ID:', error)
    if (error instanceof Error) {
      throw error
    } else {
      throw new Error('Network error - please check your connection and try again')
    }
  }
}

/**
 * Create a new task
 */
export async function createTask(taskData: Partial<Task>): Promise<Task> {
  try {
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskData),
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Failed to create task (${response.status})`)
    }

    const result = await response.json()

    // Invalidate cache
    cache.delete(`${CACHE_KEYS.TASKS}_all`)

    return result.data
  } catch (error) {
    console.error('Failed to create task:', error)
    if (error instanceof Error) {
      throw error
    } else {
      throw new Error('Network error - please check your connection and try again')
    }
  }
}

/**
 * Update a task
 */
export async function updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
  try {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Failed to update task (${response.status})`)
    }

    const result = await response.json()

    // Invalidate cache
    cache.delete(`${CACHE_KEYS.TASKS}_all`)

    return result.data
  } catch (error) {
    console.error('Failed to update task:', error)
    if (error instanceof Error) {
      throw error
    } else {
      throw new Error('Network error - please check your connection and try again')
    }
  }
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string): Promise<void> {
  try {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Failed to delete task (${response.status})`)
    }

    // Invalidate cache
    cache.delete(`${CACHE_KEYS.TASKS}_all`)
  } catch (error) {
    console.error('Failed to delete task:', error)
    if (error instanceof Error) {
      throw error
    } else {
      throw new Error('Network error - please check your connection and try again')
    }
  }
}

/**
 * Check if user can edit a task
 */
export function canEditTask(task: Task, employeeId: string, isAdminOrTopManagement: boolean): boolean {
  if (isAdminOrTopManagement) return true
  if (task.assignedTo === employeeId) return true
  if (task.assignedBy === employeeId) return true
  if (task.support && task.support.includes(employeeId)) return true
  return false
}

/**
 * Check if user can comment on a task
 */
export function canCommentOnTask(task: Task, employeeId: string, isAdminOrTopManagement: boolean): boolean {
  if (isAdminOrTopManagement) return true
  if (task.assignedTo === employeeId) return true
  if (task.assignedBy === employeeId) return true
  if (task.support && task.support.includes(employeeId)) return true
  return false
}

/**
 * Get task statistics
 */
export async function getTaskStatistics(): Promise<{
  total: number
  byStatus: Record<string, number>
  byPriority: Record<string, number>
}> {
  try {
    const tasks = await getAllTasks()
    
    const stats = {
      total: tasks.length,
      byStatus: {} as Record<string, number>,
      byPriority: {} as Record<string, number>
    }
    
    tasks.forEach(task => {
      stats.byStatus[task.status] = (stats.byStatus[task.status] || 0) + 1
      stats.byPriority[task.priority] = (stats.byPriority[task.priority] || 0) + 1
    })
    
    return stats
  } catch (error) {
    console.error('Failed to get task statistics:', error)
    throw error
  }
}

/**
 * Get average completion time for tasks
 */
export async function getAverageCompletionTime(): Promise<number> {
  try {
    const tasks = await getAllTasks()
    const completedTasks = tasks.filter(task => task.status === 'Done')

    if (completedTasks.length === 0) return 0

    const totalTime = completedTasks.reduce((sum, task) => {
      const start = new Date(task.startDate).getTime()
      const end = new Date(task.updatedAt).getTime()
      return sum + (end - start)
    }, 0)

    // Return average in days
    return totalTime / completedTasks.length / (1000 * 60 * 60 * 24)
  } catch (error) {
    console.error('Failed to get average completion time:', error)
    return 0
  }
}

