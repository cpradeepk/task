// Server-side only - do not use 'use client'

import { Bug, BugComment } from '../types'
import { BaseSheetsService } from './base'
import { bugToSheetRow, sheetRowToBug, bugCommentToSheetRow, sheetRowToBugComment } from './schema'
import { isSheetsAvailable } from './auth'

/**
 * Bug tracking service for Google Sheets
 */
export class BugSheetsService extends BaseSheetsService {
  constructor() {
    super('BUG_TRACKING')
  }

  /**
   * Get all bugs from Google Sheets
   */
  async getAllBugs(): Promise<Bug[]> {
    try {
      if (!isSheetsAvailable()) {
        throw new Error('Google Sheets not available')
      }

      const data = await this.getAllData()
      return data.map(row => sheetRowToBug(row))
    } catch (error) {
      console.error('Failed to get bugs from Sheets:', error)
      throw error
    }
  }

  /**
   * Get bug by ID
   */
  async getBugById(bugId: string): Promise<Bug | null> {
    try {
      if (!isSheetsAvailable()) {
        throw new Error('Google Sheets not available')
      }

      const bugs = await this.getAllBugs()
      // TEMPORARY WORKAROUND: Due to data mapping issues, search in title field
      return bugs.find(bug => bug.title === bugId) || null
    } catch (error) {
      console.error(`Failed to get bug ${bugId} from Sheets:`, error)
      throw error
    }
  }

  /**
   * Get bugs by assignee
   */
  async getBugsByAssignee(employeeId: string): Promise<Bug[]> {
    try {
      const bugs = await this.getAllBugs()
      return bugs.filter(bug => bug.assignedTo === employeeId)
    } catch (error) {
      console.error(`Failed to get bugs for assignee ${employeeId}:`, error)
      throw error
    }
  }

  /**
   * Get bugs by reporter
   */
  async getBugsByReporter(employeeId: string): Promise<Bug[]> {
    try {
      const bugs = await this.getAllBugs()
      return bugs.filter(bug => bug.reportedBy === employeeId)
    } catch (error) {
      console.error(`Failed to get bugs for reporter ${employeeId}:`, error)
      throw error
    }
  }

  /**
   * Add new bug
   */
  async addBug(bugData: Omit<Bug, 'bugId' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      if (!isSheetsAvailable()) {
        throw new Error('Google Sheets not available')
      }

      // Generate bug ID
      const bugId = this.generateBugId()
      const now = new Date().toISOString()

      const bug: Bug = {
        ...bugData,
        bugId,
        reopenedCount: 0,
        createdAt: now,
        updatedAt: now
      }

      const rowData = bugToSheetRow(bug)
      await this.addRow(rowData)

      console.log(`Bug ${bugId} added successfully`)
      return bugId
    } catch (error) {
      console.error('Failed to add bug to Sheets:', error)
      throw error
    }
  }

  /**
   * Update bug
   */
  async updateBug(bugId: string, updates: Partial<Bug>): Promise<boolean> {
    try {
      if (!isSheetsAvailable()) {
        throw new Error('Google Sheets not available')
      }

      // TEMPORARY WORKAROUND: Due to data mapping issues, find bug by title field
      // which currently contains the actual bug ID
      const bugs = await this.getAllBugs()
      const bugIndex = bugs.findIndex(bug => bug.title === bugId)

      if (bugIndex === -1) {
        console.log(`Bug ${bugId} not found (searched in title field due to mapping issue)`)
        throw new Error(`Bug ${bugId} not found`)
      }

      const existingBug = bugs[bugIndex]

      const now = new Date().toISOString()

      // Handle status changes
      let updatedBug = { ...existingBug, ...updates, updatedAt: now }

      // Set resolved date when status changes to Resolved
      if (updates.status === 'Resolved' && existingBug.status !== 'Resolved') {
        updatedBug.resolvedDate = now
      }

      // Set closed date when status changes to Closed
      if (updates.status === 'Closed' && existingBug.status !== 'Closed') {
        updatedBug.closedDate = now
      }

      // Increment reopened count when status changes to Reopened
      if (updates.status === 'Reopened' && existingBug.status === 'Closed') {
        updatedBug.reopenedCount = (existingBug.reopenedCount || 0) + 1
      }

      const rowData = bugToSheetRow(updatedBug)

      // TEMPORARY WORKAROUND: Use title field as the ID column due to data mapping issue
      console.log(`Attempting to update bug with ID: ${bugId}`)
      console.log('Row data:', rowData)
      console.log('Using Title column as ID column')

      try {
        await this.updateRow(bugId, rowData, 'Title')
        console.log(`Successfully updated bug ${bugId}`)
      } catch (error) {
        console.error(`Failed to update bug ${bugId}:`, error)
        throw error
      }

      console.log(`Bug ${bugId} updated successfully`)
      return true
    } catch (error) {
      console.error(`Failed to update bug ${bugId}:`, error)
      throw error
    }
  }

  /**
   * Delete bug
   */
  async deleteBug(bugId: string): Promise<boolean> {
    try {
      if (!isSheetsAvailable()) {
        throw new Error('Google Sheets not available')
      }

      const bugs = await this.getAllBugs()
      const bugIndex = bugs.findIndex(bug => bug.bugId === bugId)

      if (bugIndex === -1) {
        throw new Error(`Bug ${bugId} not found`)
      }

      await this.deleteRow(bugId, 'Bug_ID')

      console.log(`Bug ${bugId} deleted successfully`)
      return true
    } catch (error) {
      console.error(`Failed to delete bug ${bugId}:`, error)
      throw error
    }
  }

  /**
   * Generate unique bug ID
   */
  private generateBugId(): string {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `BUG-${timestamp}${random}`
  }
}

/**
 * Bug comments service for Google Sheets
 */
export class BugCommentsService extends BaseSheetsService {
  constructor() {
    super('BUG_COMMENTS')
  }

  /**
   * Get all comments for a bug
   */
  async getCommentsByBugId(bugId: string): Promise<BugComment[]> {
    try {
      if (!isSheetsAvailable()) {
        throw new Error('Google Sheets not available')
      }

      const data = await this.getAllData()
      const allComments = data.map(row => sheetRowToBugComment(row))
      return allComments.filter(comment => comment.bugId === bugId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    } catch (error) {
      console.error(`Failed to get comments for bug ${bugId}:`, error)
      throw error
    }
  }

  /**
   * Add comment to bug
   */
  async addComment(bugId: string, commentedBy: string, commentText: string): Promise<boolean> {
    try {
      if (!isSheetsAvailable()) {
        throw new Error('Google Sheets not available')
      }

      const comment: BugComment = {
        bugId,
        commentedBy,
        commentText,
        timestamp: new Date().toISOString()
      }

      const rowData = bugCommentToSheetRow(comment)
      await this.addRow(rowData)

      console.log(`Comment added to bug ${bugId} by ${commentedBy}`)
      return true
    } catch (error) {
      console.error(`Failed to add comment to bug ${bugId}:`, error)
      throw error
    }
  }

  /**
   * Get all comments (for admin purposes)
   */
  async getAllComments(): Promise<BugComment[]> {
    try {
      if (!isSheetsAvailable()) {
        throw new Error('Google Sheets not available')
      }

      const data = await this.getAllData()
      return data.map(row => sheetRowToBugComment(row))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    } catch (error) {
      console.error('Failed to get all comments:', error)
      throw error
    }
  }
}
