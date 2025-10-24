// Server-side only - do not use 'use client'

import { LeaveApplication } from '../types'
import { BaseSheetsService } from './base'
import { leaveToSheetRow, sheetRowToLeave } from './schema'
import { isSheetsAvailable, getSheetsClient } from './auth'

/**
 * Leave application management service for Google Sheets
 */
export class LeaveSheetsService extends BaseSheetsService {
  constructor() {
    super('LEAVE_APPLICATIONS')
  }

  /**
   * Get all leave applications from Google Sheets
   */
  async getAllLeaveApplications(): Promise<LeaveApplication[]> {
    try {
      if (!isSheetsAvailable()) {
        throw new Error('Google Sheets not available')
      }

      const data = await this.getAllData()
      return data.map(row => sheetRowToLeave(row))
    } catch (error) {
      console.error('Failed to get leave applications from Sheets:', error)
      throw error
    }
  }

  /**
   * Get leave applications by user
   */
  async getLeaveApplicationsByUser(employeeId: string): Promise<LeaveApplication[]> {
    try {
      const applications = await this.getAllLeaveApplications()
      return applications.filter(app => app.employeeId === employeeId)
    } catch (error) {
      console.error('Failed to get leave applications by user from Sheets:', error)
      throw error
    }
  }

  /**
   * Get leave applications for a manager to approve
   */
  async getLeaveApplicationsByManager(managerId: string): Promise<LeaveApplication[]> {
    try {
      const applications = await this.getAllLeaveApplications()
      return applications.filter(app => app.managerId === managerId)
    } catch (error) {
      console.error('Failed to get leave applications by manager from Sheets:', error)
      throw error
    }
  }

  /**
   * Add new leave application to Google Sheets
   */
  async addLeaveApplication(application: Omit<LeaveApplication, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      if (!isSheetsAvailable()) {
        throw new Error('Google Sheets not available')
      }

      const applicationId = this.generateId()
      const applicationWithTimestamps: LeaveApplication = {
        ...application,
        id: applicationId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const sheetRow = leaveToSheetRow(applicationWithTimestamps)
      await this.addRow(sheetRow)

      return applicationId
    } catch (error) {
      console.error('Failed to add leave application to Sheets:', error)
      throw error
    }
  }

  /**
   * Update existing leave application in Google Sheets
   */
  async updateLeaveApplication(applicationId: string, updates: Partial<LeaveApplication>): Promise<boolean> {
    try {
      if (!isSheetsAvailable()) {
        throw new Error('Google Sheets not available')
      }

      // Get current application
      const applications = await this.getAllLeaveApplications()
      const currentApplication = applications.find(app => app.id === applicationId)

      if (!currentApplication) {
        throw new Error(`Leave application with ID ${applicationId} not found`)
      }

      const updatedApplication = {
        ...currentApplication,
        ...updates,
        updatedAt: new Date().toISOString()
      }

      const sheetRow = leaveToSheetRow(updatedApplication)
      await this.updateRow(applicationId, sheetRow, 'ID')

      return true
    } catch (error) {
      console.error('Failed to update leave application in Sheets:', error)
      throw error
    }
  }

  /**
   * Fast approval/rejection method that updates only status fields without fetching all data
   */
  async fastUpdateApplicationStatus(
    applicationId: string,
    status: 'Approved' | 'Rejected',
    approvedBy: string,
    remarks?: string
  ): Promise<boolean> {
    return this.executeWithRetry(async () => {
      const sheets = await getSheetsClient()

      // Find the row with the matching ID by searching only the ID column
      const idColumnRange = `${this.sheetName}!A:A`
      const idResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: idColumnRange
      })

      const idValues = idResponse.data.values || []
      const rowIndex = idValues.findIndex((row, index) => index > 0 && row[0] === applicationId)

      if (rowIndex === -1) {
        throw new Error(`Leave application with ID ${applicationId} not found`)
      }

      // Calculate actual row number (add 1 because findIndex is 0-based, add 1 for header)
      const rowNumber = rowIndex + 1

      // Update only the specific status-related columns
      const statusColumnIndex = this.headers.indexOf('Status') + 1 // +1 for 1-based indexing
      const approvedByColumnIndex = this.headers.indexOf('Approved_By') + 1
      const approvalDateColumnIndex = this.headers.indexOf('Approval_Date') + 1
      const approvalRemarksColumnIndex = this.headers.indexOf('Approval_Remarks') + 1
      const updatedAtColumnIndex = this.headers.indexOf('Updated_At') + 1

      const updates = []

      // Update Status
      if (statusColumnIndex > 0) {
        updates.push({
          range: `${this.sheetName}!${String.fromCharCode(64 + statusColumnIndex)}${rowNumber}`,
          values: [[status]]
        })
      }

      // Update Approved By
      if (approvedByColumnIndex > 0) {
        updates.push({
          range: `${this.sheetName}!${String.fromCharCode(64 + approvedByColumnIndex)}${rowNumber}`,
          values: [[approvedBy]]
        })
      }

      // Update Approval Date
      if (approvalDateColumnIndex > 0) {
        updates.push({
          range: `${this.sheetName}!${String.fromCharCode(64 + approvalDateColumnIndex)}${rowNumber}`,
          values: [[new Date().toISOString()]]
        })
      }

      // Update Approval Remarks
      if (approvalRemarksColumnIndex > 0 && remarks) {
        updates.push({
          range: `${this.sheetName}!${String.fromCharCode(64 + approvalRemarksColumnIndex)}${rowNumber}`,
          values: [[remarks]]
        })
      }

      // Update Updated At
      if (updatedAtColumnIndex > 0) {
        updates.push({
          range: `${this.sheetName}!${String.fromCharCode(64 + updatedAtColumnIndex)}${rowNumber}`,
          values: [[new Date().toISOString()]]
        })
      }

      // Batch update all fields at once
      if (updates.length > 0) {
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            valueInputOption: 'RAW',
            data: updates
          }
        })
      }

      return true
    })
  }

  /**
   * Delete leave application from Google Sheets
   */
  async deleteLeaveApplication(applicationId: string): Promise<boolean> {
    try {
      if (!isSheetsAvailable()) {
        throw new Error('Google Sheets not available')
      }

      await this.deleteRow(applicationId, 'ID')
      return true
    } catch (error) {
      console.error('Failed to delete leave application from Sheets:', error)
      throw error
    }
  }

  /**
   * Get leave application by ID
   */
  async getLeaveApplicationById(applicationId: string): Promise<LeaveApplication | null> {
    try {
      const applications = await this.getAllLeaveApplications()
      return applications.find(app => app.id === applicationId) || null
    } catch (error) {
      console.error('Failed to get leave application by ID from Sheets:', error)
      throw error
    }
  }

  /**
   * Get pending leave applications
   */
  async getPendingLeaveApplications(): Promise<LeaveApplication[]> {
    try {
      const applications = await this.getAllLeaveApplications()
      return applications.filter(app => app.status === 'Pending')
    } catch (error) {
      console.error('Failed to get pending leave applications from Sheets:', error)
      throw error
    }
  }

  /**
   * Get leave applications by status
   */
  async getLeaveApplicationsByStatus(status: 'Pending' | 'Approved' | 'Rejected'): Promise<LeaveApplication[]> {
    try {
      const applications = await this.getAllLeaveApplications()
      return applications.filter(app => app.status === status)
    } catch (error) {
      console.error('Failed to get leave applications by status from Sheets:', error)
      throw error
    }
  }

  /**
   * Get leave applications by date range
   */
  async getLeaveApplicationsByDateRange(startDate: string, endDate: string): Promise<LeaveApplication[]> {
    try {
      const applications = await this.getAllLeaveApplications()
      return applications.filter(app => {
        const appStart = new Date(app.fromDate)
        const appEnd = new Date(app.toDate)
        const rangeStart = new Date(startDate)
        const rangeEnd = new Date(endDate)
        
        return (appStart >= rangeStart && appStart <= rangeEnd) ||
               (appEnd >= rangeStart && appEnd <= rangeEnd) ||
               (appStart <= rangeStart && appEnd >= rangeEnd)
      })
    } catch (error) {
      console.error('Failed to get leave applications by date range from Sheets:', error)
      throw error
    }
  }

  /**
   * Approve leave application (Fast version)
   */
  async approveLeaveApplication(applicationId: string, approverId: string, remarks?: string): Promise<boolean> {
    try {
      return await this.fastUpdateApplicationStatus(applicationId, 'Approved', approverId, remarks)
    } catch (error) {
      console.error('Failed to approve leave application in Sheets:', error)
      throw error
    }
  }

  /**
   * Reject leave application (Fast version)
   */
  async rejectLeaveApplication(applicationId: string, approverId: string, remarks?: string): Promise<boolean> {
    try {
      return await this.fastUpdateApplicationStatus(applicationId, 'Rejected', approverId, remarks)
    } catch (error) {
      console.error('Failed to reject leave application in Sheets:', error)
      throw error
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }
}
