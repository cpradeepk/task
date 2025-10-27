// Client-side service that communicates with Google Sheets API routes

import { User, Task, LeaveApplication, WFHApplication } from '../types'

/**
 * Main data service that handles Google Sheets as the single source of truth
 */
class GoogleSheetsDataService {
  private usersCache: { data: User[], timestamp: number } | null = null
  private cacheTimeout = 30000 // 30 seconds cache

  /**
   * Execute API operation
   */
  private async executeApiCall<T>(
    apiEndpoint: string,
    method: string = 'GET',
    body?: any
  ): Promise<T> {
    try {
      // Ensure we have a full URL for server-side calls
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      const fullUrl = apiEndpoint.startsWith('http') ? apiEndpoint : `${baseUrl}${apiEndpoint}`

      const response = await fetch(fullUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          return result.data
        } else {
          throw new Error(result.error || 'API operation failed')
        }
      } else {
        // Check for specific error types
        if (response.status === 429) {
          throw new Error('Google Sheets quota exceeded. Please try again in a few minutes.')
        } else if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication failed. Please check your Google Sheets permissions.')
        } else {
          throw new Error(`API request failed: ${response.status}`)
        }
      }
    } catch (error: any) {
      console.error('Google Sheets API operation failed:', error)

      // If it's already a formatted error message, pass it through
      if (error.message && (
        error.message.includes('quota exceeded') ||
        error.message.includes('Authentication failed')
      )) {
        throw error
      }

      // Otherwise, format it
      throw new Error(`API request failed: ${error.status || 500}`)
    }
  }

  // User operations
  async getAllUsers(): Promise<User[]> {
    // Check cache first
    if (this.usersCache && (Date.now() - this.usersCache.timestamp) < this.cacheTimeout) {
      return this.usersCache.data
    }

    try {
      const users = await this.executeApiCall<User[]>('/api/users')
      // Update cache
      this.usersCache = {
        data: users,
        timestamp: Date.now()
      }
      return users
    } catch (error) {
      // If API fails and we have cached data, return it
      if (this.usersCache) {
        console.warn('API failed, returning cached users data')
        return this.usersCache.data
      }
      throw error
    }
  }

  async getUserByEmployeeId(employeeId: string): Promise<User | null> {
    return this.executeApiCall<User | null>(`/api/users/${employeeId}`)
  }

  async addUser(user: Omit<User, 'createdAt' | 'updatedAt'>): Promise<string> {
    const result = await this.executeApiCall<string>('/api/users', 'POST', user)
    // Clear cache after adding user
    this.usersCache = null
    return result
  }

  async updateUser(updatedUser: User): Promise<boolean> {
    const result = await this.executeApiCall<boolean>(`/api/users/${updatedUser.employeeId}`, 'PUT', updatedUser)
    // Clear cache after updating user
    this.usersCache = null
    return result
  }

  async authenticateUser(employeeId: string, password: string): Promise<User | null> {
    return this.executeApiCall<User | null>('/api/auth/login', 'POST', { employeeId, password })
  }

  async getTeamMembers(managerId: string): Promise<User[]> {
    return this.executeApiCall<User[]>(`/api/users/team/${managerId}`)
  }

  async incrementWarningCount(employeeId: string): Promise<boolean> {
    return this.executeApiCall<boolean>(`/api/users/${employeeId}/warning/increment`, 'POST')
  }

  async resetWarningCount(employeeId: string): Promise<boolean> {
    return this.executeApiCall<boolean>(`/api/users/${employeeId}/warning/reset`, 'POST')
  }

  // Task operations
  async getAllTasks(): Promise<Task[]> {
    return this.executeApiCall<Task[]>('/api/tasks')
  }

  async getTasksByUser(employeeId: string): Promise<Task[]> {
    return this.executeApiCall<Task[]>(`/api/tasks/user/${employeeId}`)
  }

  async addTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return this.executeApiCall<string>('/api/tasks', 'POST', task)
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<boolean> {
    return this.executeApiCall<boolean>(`/api/tasks/${taskId}`, 'PUT', updates)
  }

  async deleteTask(taskId: string): Promise<boolean> {
    return this.executeApiCall<boolean>(`/api/tasks/${taskId}`, 'DELETE')
  }

  // Leave application operations
  async getAllLeaveApplications(): Promise<LeaveApplication[]> {
    return this.executeApiCall<LeaveApplication[]>('/api/leaves')
  }

  async getLeaveApplicationsByUser(employeeId: string): Promise<LeaveApplication[]> {
    return this.executeApiCall<LeaveApplication[]>(`/api/leaves/user/${employeeId}`)
  }

  async getLeavesByUser(employeeId: string): Promise<LeaveApplication[]> {
    return this.getLeaveApplicationsByUser(employeeId)
  }

  async addLeaveApplication(application: Omit<LeaveApplication, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return this.executeApiCall<string>('/api/leaves', 'POST', application)
  }

  async updateLeaveApplication(applicationId: string, updates: Partial<LeaveApplication>): Promise<boolean> {
    return this.executeApiCall<boolean>(`/api/leaves/${applicationId}`, 'PUT', updates)
  }

  // WFH application operations
  async getAllWFHApplications(): Promise<WFHApplication[]> {
    return this.executeApiCall<WFHApplication[]>('/api/wfh')
  }

  async getWFHApplicationsByUser(employeeId: string): Promise<WFHApplication[]> {
    return this.executeApiCall<WFHApplication[]>(`/api/wfh/user/${employeeId}`)
  }

  async getWFHByUser(employeeId: string): Promise<WFHApplication[]> {
    return this.getWFHApplicationsByUser(employeeId)
  }

  async addWFHApplication(application: Omit<WFHApplication, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return this.executeApiCall<string>('/api/wfh', 'POST', application)
  }

  async updateWFHApplication(applicationId: string, updates: Partial<WFHApplication>): Promise<boolean> {
    return this.executeApiCall<boolean>(`/api/wfh/${applicationId}`, 'PUT', updates)
  }

  // Fast approval methods
  async approveLeaveApplication(applicationId: string, approverId: string, remarks?: string): Promise<boolean> {
    return this.executeApiCall<boolean>(`/api/leaves/${applicationId}/approve`, 'POST', { approverId, remarks })
  }

  async rejectLeaveApplication(applicationId: string, approverId: string, remarks?: string): Promise<boolean> {
    return this.executeApiCall<boolean>(`/api/leaves/${applicationId}/reject`, 'POST', { approverId, remarks })
  }

  async approveWFHApplication(applicationId: string, approverId: string, remarks?: string): Promise<boolean> {
    return this.executeApiCall<boolean>(`/api/wfh/${applicationId}/approve`, 'POST', { approverId, remarks })
  }

  async rejectWFHApplication(applicationId: string, approverId: string, remarks?: string): Promise<boolean> {
    return this.executeApiCall<boolean>(`/api/wfh/${applicationId}/reject`, 'POST', { approverId, remarks })
  }

  // Utility methods
  generateTaskId(): string {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `JSR-${timestamp}${random}`
  }

  isTaskOwner(task: Task, employeeId: string): boolean {
    return task.assignedTo === employeeId
  }

  isTaskSupporter(task: Task, employeeId: string): boolean {
    return task.support && task.support.includes(employeeId) && task.assignedTo !== employeeId
  }
}

// Export singleton instance
export const dataService = new GoogleSheetsDataService()
