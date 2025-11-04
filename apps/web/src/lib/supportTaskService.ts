'use client'
// Removed: import { generateTaskId } from './data'
// Task IDs are now generated server-side in the API route for consistency
import { Task, User } from './types'

/**
 * Service for managing support tasks
 * Creates separate tasks for support team members
 */
export class SupportTaskService {
  /**
   * Create support tasks for each support team member
   * @param mainTask - The main task object (must have taskId already set by API)
   * @param supportMembers - Array of support member employee IDs
   * @param users - Array of all users for lookup
   */
  static async createSupportTasks(
    mainTask: Task, // Changed from Omit<Task, 'id' | 'createdAt' | 'updatedAt'> to Task
    supportMembers: string[],
    users: User[]
  ): Promise<string[]> {
    const createdTaskIds: string[] = []

    try {
      for (const supportMemberId of supportMembers) {
        const supportUser = users.find(user => user.employeeId === supportMemberId)
        if (!supportUser) {
          console.warn(`Support user not found: ${supportMemberId}`)
          continue
        }

        // Create a support task for this team member
        // Task ID will be generated server-side in the API route
        const supportTask = {
          // No taskId - will be generated server-side
          selectType: mainTask.selectType,
          recursiveType: mainTask.recursiveType,
          description: `[SUPPORT] ${mainTask.description}`,
          assignedTo: supportMemberId, // Assign to the support member
          assignedBy: mainTask.assignedBy, // Keep original creator
          support: [], // Support tasks don't have their own support
          startDate: mainTask.startDate,
          endDate: mainTask.endDate,
          priority: mainTask.priority,
          estimatedHours: 0, // Support members will estimate their own hours
          actualHours: 0,
          status: 'Yet to Start',
          remarks: `Support task for main task: ${mainTask.taskId}`, // Use main task's server-generated ID
          dailyHours: '{}'
        }

        // Add the support task via API
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(supportTask)
        })

        if (!response.ok) {
          throw new Error('Failed to create support task')
        }

        const result = await response.json()
        const createdTask = result.data
        createdTaskIds.push(createdTask.taskId)

        console.log(`Created support task ${createdTask.taskId} for ${supportUser.name}`)
      }

      return createdTaskIds
    } catch (error) {
      console.error('Failed to create support tasks:', error)
      throw error
    }
  }

  /**
   * Get all support tasks for a main task
   */
  static async getSupportTasksForMainTask(mainTaskId: string): Promise<Task[]> {
    try {
      const response = await fetch('/api/tasks')
      if (!response.ok) {
        // Handle quota exceeded or other API errors gracefully
        if (response.status === 500) {
          console.warn('Tasks API temporarily unavailable (likely quota exceeded), returning empty array')
          return []
        }
        throw new Error(`Failed to fetch tasks: ${response.status}`)
      }

      const result = await response.json()
      const allTasks = result.data || []

      // Support tasks have [SUPPORT] prefix and remarks containing the main task ID
      return allTasks.filter((task: Task) =>
        task.description?.startsWith('[SUPPORT]') &&
        task.remarks?.includes(mainTaskId)
      )
    } catch (error) {
      console.error('Failed to get support tasks:', error)
      // Return empty array instead of throwing to prevent UI crashes
      return []
    }
  }

  /**
   * Get main task for a support task
   */
  static async getMainTaskForSupportTask(supportTask: Task): Promise<Task | null> {
    try {
      // Check if this is a support task
      if (!supportTask.description?.startsWith('[SUPPORT]') || !supportTask.remarks) {
        return null
      }

      // Extract main task ID from remarks (format: "Support task for main task: JSR-XXX")
      const match = supportTask.remarks.match(/Support task for main task: (.+)/)
      if (!match) {
        return null
      }

      const mainTaskId = match[1]

      const response = await fetch('/api/tasks')
      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }

      const result = await response.json()
      const allTasks = result.data || []

      return allTasks.find((task: Task) => task.taskId === mainTaskId) || null
    } catch (error) {
      console.error('Failed to get main task:', error)
      return null
    }
  }

  /**
   * Check if a task is a support task
   */
  static isSupportTask(task: Task): boolean {
    return task.description.startsWith('[SUPPORT]') ||
           Boolean(task.remarks && task.remarks.includes('Support task for main task:'))
  }

  /**
   * Get support task summary for a main task
   */
  static async getSupportTaskSummary(mainTaskId: string): Promise<{
    totalSupportTasks: number
    completedSupportTasks: number
    totalSupportHours: number
    supportMembers: Array<{
      employeeId: string
      name: string
      taskId: string
      status: string
      hours: number
    }>
  }> {
    try {
      const supportTasks = await this.getSupportTasksForMainTask(mainTaskId)

      const response = await fetch('/api/users')
      if (!response.ok) {
        // Handle quota exceeded or other API errors gracefully
        if (response.status === 500) {
          console.warn('Users API temporarily unavailable (likely quota exceeded), returning empty summary')
          return {
            totalSupportTasks: 0,
            completedSupportTasks: 0,
            totalSupportHours: 0,
            supportMembers: []
          }
        }
        throw new Error(`Failed to fetch users: ${response.status}`)
      }

      const result = await response.json()
      const users = result.data || []

      const supportMembers = supportTasks.map(task => {
        // Handle both old (string) and new (array) format
        const assignee = Array.isArray(task.assignedTo) ? task.assignedTo[0] : task.assignedTo
        const user = users.find((u: any) => u.employeeId === assignee)
        return {
          employeeId: assignee,
          name: user?.name || assignee,
          taskId: task.taskId,
          status: task.status,
          hours: task.actualHours || 0
        }
      })

      return {
        totalSupportTasks: supportTasks.length,
        completedSupportTasks: supportTasks.filter(task => task.status === 'Done').length,
        totalSupportHours: supportTasks.reduce((total, task) => total + (task.actualHours || 0), 0),
        supportMembers
      }
    } catch (error) {
      console.error('Failed to get support task summary:', error)
      return {
        totalSupportTasks: 0,
        completedSupportTasks: 0,
        totalSupportHours: 0,
        supportMembers: []
      }
    }
  }

  /**
   * Update support task status when main task status changes
   */
  static async updateSupportTasksStatus(mainTaskId: string, newStatus: string): Promise<void> {
    try {
      const supportTasks = await this.getSupportTasksForMainTask(mainTaskId)
      
      for (const supportTask of supportTasks) {
        // Only update if support task is not already completed
        if (supportTask.status !== 'Done' && supportTask.status !== 'Cancel') {
          const response = await fetch(`/api/tasks/${supportTask.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: newStatus })
          })

          if (!response.ok) {
            console.error(`Failed to update support task ${supportTask.id}`)
          }
        }
      }
    } catch (error) {
      console.error('Failed to update support tasks status:', error)
    }
  }
}

export default SupportTaskService
