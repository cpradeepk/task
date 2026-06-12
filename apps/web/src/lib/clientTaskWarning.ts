'use client'

import { Task } from './types'
import { DateUtils } from './dateUtils'

/**
 * Client-side Task Warning Service
 * Uses API calls instead of direct Google Sheets access
 */
export class ClientTaskWarningService {
  /**
   * Check if user has active tasks for today (Client-side version using API)
   */
  static async checkUserHasTasks(employeeId: string, preloadedTasks?: Task[]): Promise<boolean> {
    try {
      // Prefer preloaded tasks from parent/dashboard to avoid extra network calls
      let tasks: Task[] | null = null
      if (Array.isArray(preloadedTasks)) {
        tasks = preloadedTasks
      } else if (typeof window !== 'undefined' && 
                 (window as any).__DASHBOARD_DATA?.employeeId === employeeId && 
                 (window as any).__DASHBOARD_DATA?.tasks) {
        tasks = (window as any).__DASHBOARD_DATA.tasks as Task[]
      }

      if (!tasks) {
        // Fallback: unified dashboard endpoint (server-side cached)
        const resp = await fetch(`/api/dashboard-data?employeeId=${employeeId}&role=employee&includeUsers=false`)
        if (!resp.ok) throw new Error('Failed to fetch dashboard data')
        const json = await resp.json()
        tasks = (json?.data?.tasks || []) as Task[]
      }

      const today = DateUtils.getTodayString()

      // Check for active tasks (not completed, cancelled, or stopped)
      const activeTasks = tasks.filter((task: Task) => {
        const isActive = !['Done', 'Cancel', 'Stop'].includes(task.status)
        const isToday = task.startDate <= today && task.endDate >= today
        return isActive && isToday
      })

      return activeTasks.length > 0
    } catch (error) {
      console.error('Error checking user tasks:', error)
      return false
    }
  }

  /**
   * Process task warning for user (Client-side version)
   */
  static async processTaskWarning(employeeId: string, preloadedTasks?: Task[]): Promise<{
    hasWarning: boolean
    warningCount: number
    message?: string
  }> {
    try {
      // Skip warning check on holidays
      if (!DateUtils.isTodayWorkingDay()) {
        return { hasWarning: false, warningCount: 0 }
      }

      const hasTasks = await this.checkUserHasTasks(employeeId, preloadedTasks)

      if (!hasTasks) {
        // First increment the warning count
        const incrementResponse = await fetch(`/api/users/${employeeId}/warning/increment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (incrementResponse.ok) {
          // Get updated user data after incrementing
          const userResponse = await fetch(`/api/users/${employeeId}`)
          if (userResponse.ok) {
            const result = await userResponse.json()
            const user = result.data

            if (user) {
              const message = `⚠️ Warning: You don't have any active tasks for today. Current warning count: ${user.warningCount || 0}.`
              return {
                hasWarning: true,
                warningCount: user.warningCount || 0,
                message
              }
            }
          }
        } else {
          // If increment fails, get current user data and show warning with current count
          const userResponse = await fetch(`/api/users/${employeeId}`)
          if (userResponse.ok) {
            const result = await userResponse.json()
            const user = result.data

            if (user) {
              const newCount = (user.warningCount || 0) + 1
              const message = `⚠️ Warning: You don't have any active tasks for today. Current warning count: ${newCount}.`
              return {
                hasWarning: true,
                warningCount: newCount,
                message
              }
            }
          }
        }

        // Fallback if API calls fail
        return {
          hasWarning: true,
          warningCount: 1,
          message: '⚠️ Warning: You don\'t have any active tasks for today. Current warning count: 1.'
        }
      }
      
      return { hasWarning: false, warningCount: 0 }
    } catch (error) {
      console.error('Error processing task warning:', error)
      return { hasWarning: false, warningCount: 0 }
    }
  }
}
