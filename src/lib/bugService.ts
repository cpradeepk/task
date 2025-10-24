// Client-side Bug service functions
'use client'

import { Bug, BugComment, BugFormData } from './types'
import { cache, CACHE_KEYS } from './cache'

/**
 * Get all bugs with optional filters
 */
export async function getAllBugs(filters?: {
  assignedTo?: string
  reportedBy?: string
  status?: string
  severity?: string
  category?: string
}): Promise<Bug[]> {
  try {
    // Create cache key based on filters
    const filterKey = filters ? JSON.stringify(filters) : 'all'
    const cacheKey = `${CACHE_KEYS.BUGS}_${filterKey}`

    // Check cache first (only for unfiltered requests to avoid complexity)
    if (!filters || Object.keys(filters).length === 0) {
      const cachedBugs = cache.get<Bug[]>(cacheKey)
      if (cachedBugs) {
        console.log('Returning cached bugs data')
        return cachedBugs
      }
    }

    const params = new URLSearchParams()
    if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo)
    if (filters?.reportedBy) params.append('reportedBy', filters.reportedBy)
    if (filters?.status) params.append('status', filters.status)
    if (filters?.severity) params.append('severity', filters.severity)
    if (filters?.category) params.append('category', filters.category)

    const response = await fetch(`/api/bugs?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout and retry logic
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })

    if (!response.ok) {
      // If we have cached data, return it instead of throwing error
      if (!filters || Object.keys(filters).length === 0) {
        const cachedBugs = cache.get<Bug[]>(cacheKey)
        if (cachedBugs) {
          console.log('API failed, returning cached bugs data')
          return cachedBugs
        }
      }

      if (response.status === 500) {
        throw new Error('Server error - this might be due to quota limits. Please try again in a few minutes.')
      } else if (response.status === 404) {
        throw new Error('Bug service not found')
      } else {
        throw new Error(`Failed to fetch bugs (${response.status})`)
      }
    }

    const result = await response.json()
    const bugs = result.data || []

    // Cache the result (only for unfiltered requests)
    if (!filters || Object.keys(filters).length === 0) {
      cache.set(cacheKey, bugs, 2) // Cache for 2 minutes
    }

    return bugs
  } catch (error) {
    console.error('Failed to get bugs:', error)

    // Try to return cached data as fallback
    if (!filters || Object.keys(filters).length === 0) {
      const cacheKey = `${CACHE_KEYS.BUGS}_all`
      const cachedBugs = cache.get<Bug[]>(cacheKey)
      if (cachedBugs) {
        console.log('Error occurred, returning cached bugs data as fallback')
        return cachedBugs
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
 * Get bug by ID
 */
export async function getBugById(bugId: string): Promise<Bug | null> {
  try {
    const response = await fetch(`/api/bugs/${bugId}`)
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error('Failed to fetch bug')
    }

    const result = await response.json()
    return result.data
  } catch (error) {
    console.error(`Failed to get bug ${bugId}:`, error)
    return null
  }
}

/**
 * Create new bug
 */
export async function createBug(bugData: BugFormData): Promise<string | null> {
  try {
    const response = await fetch('/api/bugs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bugData)
    })

    if (!response.ok) {
      throw new Error('Failed to create bug')
    }

    const result = await response.json()
    return result.data
  } catch (error) {
    console.error('Failed to create bug:', error)
    return null
  }
}

/**
 * Update bug
 */
export async function updateBug(bugId: string, updates: Partial<Bug>): Promise<boolean> {
  try {
    const response = await fetch(`/api/bugs/${bugId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates)
    })

    return response.ok
  } catch (error) {
    console.error(`Failed to update bug ${bugId}:`, error)
    return false
  }
}

/**
 * Delete bug
 */
export async function deleteBug(bugId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/bugs/${bugId}`, {
      method: 'DELETE'
    })

    return response.ok
  } catch (error) {
    console.error(`Failed to delete bug ${bugId}:`, error)
    return false
  }
}

/**
 * Get comments for a bug
 */
export async function getBugComments(bugId: string): Promise<BugComment[]> {
  try {
    const response = await fetch(`/api/bugs/${bugId}/comments`)
    if (!response.ok) {
      throw new Error('Failed to fetch comments')
    }

    const result = await response.json()
    return result.data || []
  } catch (error) {
    console.error(`Failed to get comments for bug ${bugId}:`, error)
    return []
  }
}

/**
 * Add comment to bug
 */
export async function addBugComment(bugId: string, commentedBy: string, commentText: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/bugs/${bugId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ commentedBy, commentText })
    })

    return response.ok
  } catch (error) {
    console.error(`Failed to add comment to bug ${bugId}:`, error)
    return false
  }
}

/**
 * Get bugs assigned to user
 */
export async function getMyAssignedBugs(employeeId: string): Promise<Bug[]> {
  return getAllBugs({ assignedTo: employeeId })
}

/**
 * Get bugs reported by user
 */
export async function getMyReportedBugs(employeeId: string): Promise<Bug[]> {
  return getAllBugs({ reportedBy: employeeId })
}

/**
 * Check if user can edit bug
 */
export function canEditBug(bug: Bug, currentUserId: string, isAdmin: boolean): boolean {
  return isAdmin || bug.reportedBy === currentUserId || bug.assignedTo === currentUserId
}

/**
 * Check if user can comment on bug
 */
export function canCommentOnBug(bug: Bug, currentUserId: string, isAdmin: boolean): boolean {
  return isAdmin || bug.reportedBy === currentUserId || bug.assignedTo === currentUserId
}

/**
 * Get bug statistics
 */
export async function getBugStatistics(): Promise<{
  total: number
  byStatus: Record<string, number>
  bySeverity: Record<string, number>
  byCategory: Record<string, number>
  byPlatform: Record<string, number>
}> {
  try {
    const bugs = await getAllBugs()
    
    const stats = {
      total: bugs.length,
      byStatus: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      byPlatform: {} as Record<string, number>
    }

    bugs.forEach(bug => {
      // Count by status
      stats.byStatus[bug.status] = (stats.byStatus[bug.status] || 0) + 1
      
      // Count by severity
      stats.bySeverity[bug.severity] = (stats.bySeverity[bug.severity] || 0) + 1
      
      // Count by category
      stats.byCategory[bug.category] = (stats.byCategory[bug.category] || 0) + 1
      
      // Count by platform
      stats.byPlatform[bug.platform] = (stats.byPlatform[bug.platform] || 0) + 1
    })

    return stats
  } catch (error) {
    console.error('Failed to get bug statistics:', error)
    return {
      total: 0,
      byStatus: {},
      bySeverity: {},
      byCategory: {},
      byPlatform: {}
    }
  }
}

/**
 * Calculate average resolution time
 */
export async function getAverageResolutionTime(): Promise<number> {
  try {
    const bugs = await getAllBugs({ status: 'Resolved' })
    
    const resolutionTimes = bugs
      .filter(bug => bug.resolvedDate && bug.createdAt)
      .map(bug => {
        const created = new Date(bug.createdAt).getTime()
        const resolved = new Date(bug.resolvedDate!).getTime()
        return resolved - created
      })

    if (resolutionTimes.length === 0) return 0

    const averageMs = resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
    return Math.round(averageMs / (1000 * 60 * 60 * 24)) // Convert to days
  } catch (error) {
    console.error('Failed to calculate average resolution time:', error)
    return 0
  }
}
