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
  static async checkUserHasTasks(employeeId: string): Promise<boolean> {
    try {
      // Use API call for client-side compatibility
      const response = await fetch(`/api/tasks/user/${employeeId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }
      
      const result = await response.json()
      const tasks = result.data || []
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
  static async processTaskWarning(employeeId: string): Promise<{
    hasWarning: boolean
    warningCount: number
    message?: string
  }> {
    try {
      // Skip warning check on holidays
      if (!DateUtils.isTodayWorkingDay()) {
        return { hasWarning: false, warningCount: 0 }
      }

      const hasTasks = await this.checkUserHasTasks(employeeId)

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
