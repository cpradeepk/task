// Server-side only - do not use 'use client'

import { User } from '../types'
import { BaseSheetsService } from './base'
import { userToSheetRow, sheetRowToUser } from './schema'
import { isSheetsAvailable } from './auth'

/**
 * User management service for Google Sheets
 */
export class UserSheetsService extends BaseSheetsService {
  constructor() {
    super('USER_DETAILS')
  }

  /**
   * Get all users from Google Sheets
   */
  async getAllUsers(): Promise<User[]> {
    try {
      if (!isSheetsAvailable()) {
        throw new Error('Google Sheets not available')
      }

      const data = await this.getAllData()
      return data.map(row => sheetRowToUser(row))
    } catch (error) {
      console.error('Failed to get users from Sheets:', error)
      throw error
    }
  }

  /**
   * Get user by employee ID
   */
  async getUserByEmployeeId(employeeId: string): Promise<User | null> {
    try {
      const users = await this.getAllUsers()
      return users.find(user => 
        user.employeeId.toLowerCase() === employeeId.toLowerCase() && 
        user.status === 'active'
      ) || null
    } catch (error) {
      console.error('Failed to get user by ID from Sheets:', error)
      throw error
    }
  }

  /**
   * Add new user to Google Sheets
   */
  async addUser(user: Omit<User, 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      if (!isSheetsAvailable()) {
        throw new Error('Google Sheets not available')
      }

      // Check if user already exists
      const existingUser = await this.getUserByEmployeeId(user.employeeId)
      if (existingUser) {
        throw new Error(`User with ID ${user.employeeId} already exists`)
      }

      const userWithTimestamps: User = {
        ...user,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const sheetRow = userToSheetRow(userWithTimestamps)
      await this.addRow(sheetRow)

      return user.employeeId
    } catch (error) {
      console.error('Failed to add user to Sheets:', error)
      throw error
    }
  }

  /**
   * Update existing user in Google Sheets
   */
  async updateUser(updatedUser: User): Promise<boolean> {
    try {
      if (!isSheetsAvailable()) {
        throw new Error('Google Sheets not available')
      }

      const userWithUpdatedTimestamp = {
        ...updatedUser,
        updatedAt: new Date().toISOString()
      }

      const sheetRow = userToSheetRow(userWithUpdatedTimestamp)
      await this.updateRow(updatedUser.employeeId, sheetRow, 'Employee_ID')

      return true
    } catch (error) {
      console.error('Failed to update user in Sheets:', error)
      throw error
    }
  }

  /**
   * Delete user from Google Sheets (soft delete by setting status to inactive)
   */
  async deleteUser(employeeId: string): Promise<boolean> {
    try {
      if (!isSheetsAvailable()) {
        throw new Error('Google Sheets not available')
      }

      const user = await this.getUserByEmployeeId(employeeId)
      if (!user) {
        throw new Error(`User with ID ${employeeId} not found`)
      }

      // Soft delete by setting status to inactive
      const updatedUser = {
        ...user,
        status: 'inactive' as const,
        updatedAt: new Date().toISOString()
      }

      return await this.updateUser(updatedUser)
    } catch (error) {
      console.error('Failed to delete user from Sheets:', error)
      throw error
    }
  }

  /**
   * Get team members for a manager
   */
  async getTeamMembers(managerId: string): Promise<User[]> {
    try {
      const users = await this.getAllUsers()
      return users.filter(user => 
        user.managerId === managerId && 
        user.status === 'active'
      )
    } catch (error) {
      console.error('Failed to get team members from Sheets:', error)
      throw error
    }
  }

  /**
   * Authenticate user with Google Sheets data
   */
  async authenticateUser(employeeId: string, password: string): Promise<User | null> {
    try {
      const user = await this.getUserByEmployeeId(employeeId)
      
      if (!user) return null

      // Special case for admin-001 with static password (case-insensitive)
      if (employeeId.toLowerCase() === 'admin-001' && password === '1234') {
        return user
      }

      // Regular password check for other users
      if (user.password === password) {
        return user
      }

      return null
    } catch (error) {
      console.error('Failed to authenticate user with Sheets:', error)
      throw error
    }
  }

  /**
   * Get user manager
   */
  async getUserManager(employeeId: string): Promise<User | null> {
    try {
      const user = await this.getUserByEmployeeId(employeeId)
      if (!user || !user.managerId) return null

      return await this.getUserByEmployeeId(user.managerId)
    } catch (error) {
      console.error('Failed to get user manager from Sheets:', error)
      throw error
    }
  }

  /**
   * Check if user can approve for another user
   */
  async canApproveFor(approverId: string, employeeId: string): Promise<boolean> {
    try {
      const employee = await this.getUserByEmployeeId(employeeId)
      if (!employee) return false

      // Admin can approve for anyone
      const approver = await this.getUserByEmployeeId(approverId)
      if (approver?.role === 'admin') return true

      // Manager can approve for their direct reports
      return employee.managerId === approverId
    } catch (error) {
      console.error('Failed to check approval permissions from Sheets:', error)
      return false
    }
  }

  /**
   * Increment warning count for user without tasks
   */
  async incrementWarningCount(employeeId: string): Promise<boolean> {
    try {
      const user = await this.getUserByEmployeeId(employeeId)
      if (!user) {
        throw new Error(`User with ID ${employeeId} not found`)
      }

      const updatedUser = {
        ...user,
        warningCount: user.warningCount + 1,
        updatedAt: new Date().toISOString()
      }

      return await this.updateUser(updatedUser)
    } catch (error) {
      console.error('Failed to increment warning count:', error)
      throw error
    }
  }

  /**
   * Reset warning count for user
   */
  async resetWarningCount(employeeId: string): Promise<boolean> {
    try {
      const user = await this.getUserByEmployeeId(employeeId)
      if (!user) {
        throw new Error(`User with ID ${employeeId} not found`)
      }

      const updatedUser = {
        ...user,
        warningCount: 0,
        updatedAt: new Date().toISOString()
      }

      return await this.updateUser(updatedUser)
    } catch (error) {
      console.error('Failed to reset warning count:', error)
      throw error
    }
  }
}
