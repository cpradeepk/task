// Server-side only - do not use 'use client'

import { Task } from '../types'
import { BaseSheetsService } from './base'
import { taskToSheetRow, sheetRowToTask } from './schema'
import { TaskStatusService } from '../businessRules'
import { isSheetsAvailable } from './auth'

/**
 * Task management service for Google Sheets
 */
export class TaskSheetsService extends BaseSheetsService {
  constructor() {
    super('JSR')
  }

  /**
   * Get all tasks from Google Sheets
   */
  async getAllTasks(): Promise<Task[]> {
    try {
      if (!isSheetsAvailable()) {
        throw new Error('Google Sheets not available')
      }

      const data = await this.getAllData()
      const tasks = data.map(row => sheetRowToTask(row))

      // Automatically check and update delayed tasks in background
      this.checkDelayedTasksInBackground()

      return tasks
    } catch (error) {
      console.error('Failed to get tasks from Sheets:', error)
      throw error
    }
  }

  /**
   * Check for delayed tasks in background (non-blocking)
   * TEMPORARILY DISABLED to reduce API quota usage
   */
  private async checkDelayedTasksInBackground(): Promise<void> {
    try {
      // TEMPORARILY DISABLED: Background task checking to reduce Google Sheets API quota usage
      // This was causing excessive API calls and quota exceeded errors
      console.log('Background delayed task checking temporarily disabled to reduce API quota usage')

      // TODO: Re-enable with better rate limiting or caching
      // setTimeout(async () => {
      //   try {
      //     const result = await TaskStatusService.updateDelayedTasks()
      //     if (result.updated > 0) {
      //       console.log(`Background update: ${result.updated} tasks marked as delayed`)
      //     }
      //   } catch (error) {
      //     console.error('Background delayed task update failed:', error)
      //   }
      // }, 100) // Small delay to not block the main response
    } catch (error) {
      // Silently fail - this is a background operation
      console.error('Failed to schedule background delayed task check:', error)
    }
  }

  /**
   * Get tasks by user (owned or supporting)
   */
  async getTasksByUser(employeeId: string): Promise<Task[]> {
    try {
      const tasks = await this.getAllTasks()
      return tasks.filter(task =>
        task.assignedTo === employeeId || // Tasks assigned to the user
        (task.support && task.support.includes(employeeId)) // Tasks where user is in support team
      )
    } catch (error) {
      console.error('Failed to get tasks by user from Sheets:', error)
      throw error
    }
  }

  /**
   * Get tasks assigned by a user
   */
  async getTasksByAssigner(employeeId: string): Promise<Task[]> {
    try {
      const tasks = await this.getAllTasks()
      return tasks.filter(task => task.assignedBy === employeeId)
    } catch (error) {
      console.error('Failed to get tasks by assigner from Sheets:', error)
      throw error
    }
  }

  /**
   * Get tasks that are directly owned by the user
   */
  async getOwnedTasksByUser(employeeId: string): Promise<Task[]> {
    try {
      const tasks = await this.getAllTasks()
      return tasks.filter(task => task.assignedTo === employeeId)
    } catch (error) {
      console.error('Failed to get owned tasks from Sheets:', error)
      throw error
    }
  }

  /**
   * Get tasks where the user is in the support team
   */
  async getSupportTasksByUser(employeeId: string): Promise<Task[]> {
    try {
      const tasks = await this.getAllTasks()
      return tasks.filter(task =>
        task.support &&
        task.support.includes(employeeId) &&
        task.assignedTo !== employeeId // Exclude tasks they own
      )
    } catch (error) {
      console.error('Failed to get support tasks from Sheets:', error)
      throw error
    }
  }

  /**
   * Add new task to Google Sheets
   */
  async addTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      if (!isSheetsAvailable()) {
        throw new Error('Google Sheets not available')
      }

      const taskId = this.generateId()
      const taskWithTimestamps: Task = {
        ...task,
        id: taskId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const sheetRow = taskToSheetRow(taskWithTimestamps)
      await this.addRow(sheetRow)

      return taskId
    } catch (error) {
      console.error('Failed to add task to Sheets:', error)
      throw error
    }
  }

  /**
   * Update existing task in Google Sheets
   */
  async updateTask(taskId: string, updates: Partial<Task>): Promise<boolean> {
    try {
      if (!isSheetsAvailable()) {
        throw new Error('Google Sheets not available')
      }

      // Get current task
      const tasks = await this.getAllTasks()
      const currentTask = tasks.find(task => task.id === taskId)
      
      if (!currentTask) {
        throw new Error(`Task with ID ${taskId} not found`)
      }

      const updatedTask = {
        ...currentTask,
        ...updates,
        updatedAt: new Date().toISOString()
      }

      const sheetRow = taskToSheetRow(updatedTask)
      await this.updateRow(taskId, sheetRow, 'ID')

      return true
    } catch (error) {
      console.error('Failed to update task in Sheets:', error)
      throw error
    }
  }

  /**
   * Delete task from Google Sheets
   */
  async deleteTask(taskId: string): Promise<boolean> {
    try {
      if (!isSheetsAvailable()) {
        throw new Error('Google Sheets not available')
      }

      await this.deleteRow(taskId, 'ID')
      return true
    } catch (error) {
      console.error('Failed to delete task from Sheets:', error)
      throw error
    }
  }

  /**
   * Get task by ID
   */
  async getTaskById(taskId: string): Promise<Task | null> {
    try {
      const tasks = await this.getAllTasks()
      return tasks.find(task => task.id === taskId) || null
    } catch (error) {
      console.error('Failed to get task by ID from Sheets:', error)
      throw error
    }
  }

  /**
   * Check if user owns a specific task
   */
  isTaskOwner(task: Task, employeeId: string): boolean {
    return task.assignedTo === employeeId
  }

  /**
   * Check if user is supporting a specific task
   */
  isTaskSupporter(task: Task, employeeId: string): boolean {
    return task.support && task.support.includes(employeeId) && task.assignedTo !== employeeId
  }

  /**
   * Generate unique task ID
   */
  generateTaskId(): string {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `JSR-${timestamp}${random}`
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  /**
   * Get tasks by status
   */
  async getTasksByStatus(status: string): Promise<Task[]> {
    try {
      const tasks = await this.getAllTasks()
      return tasks.filter(task => task.status === status)
    } catch (error) {
      console.error('Failed to get tasks by status from Sheets:', error)
      throw error
    }
  }

  /**
   * Get tasks by date range
   */
  async getTasksByDateRange(startDate: string, endDate: string): Promise<Task[]> {
    try {
      const tasks = await this.getAllTasks()
      return tasks.filter(task => {
        const taskStart = new Date(task.startDate)
        const taskEnd = new Date(task.endDate)
        const rangeStart = new Date(startDate)
        const rangeEnd = new Date(endDate)
        
        return (taskStart >= rangeStart && taskStart <= rangeEnd) ||
               (taskEnd >= rangeStart && taskEnd <= rangeEnd) ||
               (taskStart <= rangeStart && taskEnd >= rangeEnd)
      })
    } catch (error) {
      console.error('Failed to get tasks by date range from Sheets:', error)
      throw error
    }
  }
}
