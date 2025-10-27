// Server-side only - do not use 'use client'

import { WFHApplication } from '../types'
import { BaseSheetsService } from './base'
import { wfhToSheetRow, sheetRowToWfh } from './schema'
import { isSheetsAvailable, getSheetsClient } from './auth'

/**
 * WFH application management service for Google Sheets
 */
export class WFHSheetsService extends BaseSheetsService {
  constructor() {
    super('WFH_APPLICATIONS')
  }

  /**
   * Get all WFH applications from Google Sheets
   */
  async getAllWFHApplications(): Promise<WFHApplication[]> {
    try {
      if (!isSheetsAvailable()) {
        throw new Error('Google Sheets not available')
      }

      const data = await this.getAllData()
      return data.map(row => sheetRowToWfh(row))
    } catch (error) {
      console.error('Failed to get WFH applications from Sheets:', error)
      throw error
    }
  }

  /**
   * Get WFH applications by user
   */
  async getWFHApplicationsByUser(employeeId: string): Promise<WFHApplication[]> {
    try {
      const applications = await this.getAllWFHApplications()
      return applications.filter(app => app.employeeId === employeeId)
    } catch (error) {
      console.error('Failed to get WFH applications by user from Sheets:', error)
      throw error
    }
  }

  /**
   * Get WFH applications for a manager to approve
   */
  async getWFHApplicationsByManager(managerId: string): Promise<WFHApplication[]> {
    try {
      const applications = await this.getAllWFHApplications()
      return applications.filter(app => app.managerId === managerId)
    } catch (error) {
      console.error('Failed to get WFH applications by manager from Sheets:', error)
      throw error
    }
  }

  /**
   * Add new WFH application to Google Sheets
   */
  async addWFHApplication(application: Omit<WFHApplication, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      if (!isSheetsAvailable()) {
        throw new Error('Google Sheets not available')
      }

      const applicationId = this.generateId()
      const applicationWithTimestamps: WFHApplication = {
        ...application,
        id: applicationId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const sheetRow = wfhToSheetRow(applicationWithTimestamps)
      await this.addRow(sheetRow)

      return applicationId
    } catch (error) {
      console.error('Failed to add WFH application to Sheets:', error)
      throw error
    }
  }

  /**
   * Update existing WFH application in Google Sheets
   */
  async updateWFHApplication(applicationId: string, updates: Partial<WFHApplication>): Promise<boolean> {
    try {
      if (!isSheetsAvailable()) {
        throw new Error('Google Sheets not available')
      }

      // Get current application
      const applications = await this.getAllWFHApplications()
      const currentApplication = applications.find(app => app.id === applicationId)

      if (!currentApplication) {
        throw new Error(`WFH application with ID ${applicationId} not found`)
      }

      const updatedApplication = {
        ...currentApplication,
        ...updates,
        updatedAt: new Date().toISOString()
      }

      const sheetRow = wfhToSheetRow(updatedApplication)
      await this.updateRow(applicationId, sheetRow, 'ID')

      return true
    } catch (error) {
      console.error('Failed to update WFH application in Sheets:', error)
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
        throw new Error(`WFH application with ID ${applicationId} not found`)
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
   * Delete WFH application from Google Sheets
   */
  async deleteWFHApplication(applicationId: string): Promise<boolean> {
    try {
      if (!isSheetsAvailable()) {
        throw new Error('Google Sheets not available')
      }

      await this.deleteRow(applicationId, 'ID')
      return true
    } catch (error) {
      console.error('Failed to delete WFH application from Sheets:', error)
      throw error
    }
  }

  /**
   * Get WFH application by ID
   */
  async getWFHApplicationById(applicationId: string): Promise<WFHApplication | null> {
    try {
      const applications = await this.getAllWFHApplications()
      return applications.find(app => app.id === applicationId) || null
    } catch (error) {
      console.error('Failed to get WFH application by ID from Sheets:', error)
      throw error
    }
  }

  /**
   * Get pending WFH applications
   */
  async getPendingWFHApplications(): Promise<WFHApplication[]> {
    try {
      const applications = await this.getAllWFHApplications()
      return applications.filter(app => app.status === 'Pending')
    } catch (error) {
      console.error('Failed to get pending WFH applications from Sheets:', error)
      throw error
    }
  }

  /**
   * Get WFH applications by status
   */
  async getWFHApplicationsByStatus(status: 'Pending' | 'Approved' | 'Rejected'): Promise<WFHApplication[]> {
    try {
      const applications = await this.getAllWFHApplications()
      return applications.filter(app => app.status === status)
    } catch (error) {
      console.error('Failed to get WFH applications by status from Sheets:', error)
      throw error
    }
  }

  /**
   * Get WFH applications by date range
   */
  async getWFHApplicationsByDateRange(startDate: string, endDate: string): Promise<WFHApplication[]> {
    try {
      const applications = await this.getAllWFHApplications()
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
      console.error('Failed to get WFH applications by date range from Sheets:', error)
      throw error
    }
  }

  /**
   * Approve WFH application (Fast version)
   */
  async approveWFHApplication(applicationId: string, approverId: string, remarks?: string): Promise<boolean> {
    try {
      return await this.fastUpdateApplicationStatus(applicationId, 'Approved', approverId, remarks)
    } catch (error) {
      console.error('Failed to approve WFH application in Sheets:', error)
      throw error
    }
  }

  /**
   * Reject WFH application (Fast version)
   */
  async rejectWFHApplication(applicationId: string, approverId: string, remarks?: string): Promise<boolean> {
    try {
      return await this.fastUpdateApplicationStatus(applicationId, 'Rejected', approverId, remarks)
    } catch (error) {
      console.error('Failed to reject WFH application in Sheets:', error)
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
