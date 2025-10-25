/**
 * MySQL Bugs Service
 *
 * This file handles all database operations for the bug tracking system.
 * It provides CRUD operations for bugs and bug comments.
 *
 * IMPORTANT: Server-side only - do not use 'use client' directive
 * This file uses MySQL2 library which only works on the server.
 *
 * Key Features:
 * - Automatic retry logic for failed database operations
 * - Type-safe database queries using TypeScript
 * - Conversion between database rows (snake_case) and TypeScript objects (camelCase)
 * - Support for bug comments and relationships
 */

import { query, queryOne, withRetry } from './config'
import { Bug, BugComment } from '../types'
import { RowDataPacket, ResultSetHeader } from 'mysql2'

/**
 * BugRow Interface
 *
 * Represents a bug record as it comes from the MySQL database.
 * Database columns use snake_case naming (e.g., bug_id, assigned_to).
 *
 * This interface extends RowDataPacket from mysql2 library to ensure
 * type safety when querying the database.
 */
interface BugRow extends RowDataPacket {
  id: number                          // Auto-increment primary key
  bug_id: string                      // Unique bug identifier (e.g., "BUG-1735123456789001234")
  title: string                       // Bug title/summary
  description: string                 // Detailed bug description
  severity: string                    // 'Critical' | 'Major' | 'Minor'
  priority: string                    // 'High' | 'Medium' | 'Low'
  status: string                      // 'New' | 'In Progress' | 'Resolved' | 'Closed' | 'Reopened'
  category: string                    // 'UI' | 'API' | 'Backend' | 'Performance' | etc.
  platform: string                    // 'iOS' | 'Android' | 'Web' | 'All'
  assigned_to: string | null          // Employee ID of assignee (optional)
  assigned_by: string | null          // Employee ID of assigner (optional)
  reported_by: string                 // Employee ID of reporter (required)
  environment: string                 // 'Development' | 'Staging' | 'Production'
  browser_info: string | null         // Browser details (optional)
  device_info: string | null          // Device details (optional)
  steps_to_reproduce: string | null   // Steps to reproduce the bug (optional)
  expected_behavior: string | null    // What should happen (optional)
  actual_behavior: string | null      // What actually happens (optional)
  attachments: string | null          // File URLs or paths (optional)
  estimated_hours: number | null      // Estimated time to fix (optional)
  actual_hours: number | null         // Actual time spent (optional)
  resolved_date: string | null        // When bug was resolved (optional)
  closed_date: string | null          // When bug was closed (optional)
  reopened_count: number              // Number of times bug was reopened
  tags: string | null                 // Comma-separated tags (optional)
  related_bugs: string | null         // Comma-separated bug IDs (optional)
  created_at: string                  // Timestamp when bug was created
  updated_at: string                  // Timestamp when bug was last updated
}

/**
 * BugCommentRow Interface
 *
 * Represents a bug comment record from the MySQL database.
 * Comments are stored in a separate table linked by bug_id.
 */
interface BugCommentRow extends RowDataPacket {
  id: number              // Auto-increment primary key
  bug_id: string          // Foreign key to bugs table
  commented_by: string    // Employee ID of commenter
  comment_text: string    // The comment content
  timestamp: string       // When comment was created
}

/**
 * Convert database row to Bug object
 *
 * This function transforms a database row (snake_case) into a TypeScript Bug object (camelCase).
 * It also handles type conversions and optional fields.
 *
 * @param {BugRow} row - The database row from MySQL
 * @returns {Bug} The Bug object with proper TypeScript types
 */
function rowToBug(row: BugRow): Bug {
  return {
    bugId: row.bug_id,
    title: row.title,
    description: row.description,
    severity: row.severity as Bug['severity'],
    priority: row.priority as Bug['priority'],
    status: row.status as Bug['status'],
    category: row.category as Bug['category'],
    platform: row.platform as Bug['platform'],
    assignedTo: row.assigned_to || undefined,
    assignedBy: row.assigned_by || undefined,
    reportedBy: row.reported_by,
    environment: row.environment as Bug['environment'],
    browserInfo: row.browser_info || undefined,
    deviceInfo: row.device_info || undefined,
    stepsToReproduce: row.steps_to_reproduce || undefined,
    expectedBehavior: row.expected_behavior || undefined,
    actualBehavior: row.actual_behavior || undefined,
    attachments: row.attachments || undefined,
    estimatedHours: row.estimated_hours || undefined,
    actualHours: row.actual_hours || undefined,
    resolvedDate: row.resolved_date || undefined,
    closedDate: row.closed_date || undefined,
    reopenedCount: row.reopened_count,
    tags: row.tags || undefined,
    relatedBugs: row.related_bugs || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// Convert database row to BugComment object
function rowToBugComment(row: BugCommentRow): BugComment {
  return {
    bugId: row.bug_id,
    commentedBy: row.commented_by,
    commentText: row.comment_text,
    timestamp: row.timestamp
  }
}

// Get all bugs
export async function getAllBugs(): Promise<Bug[]> {
  return withRetry(async () => {
    const rows = await query<BugRow[]>(
      'SELECT * FROM bugs ORDER BY created_at DESC'
    )
    return rows.map(rowToBug)
  })
}

// Get bug by ID
export async function getBugById(bugId: string): Promise<Bug | null> {
  return withRetry(async () => {
    const row = await queryOne<BugRow>(
      'SELECT * FROM bugs WHERE bug_id = ?',
      [bugId]
    )
    return row ? rowToBug(row) : null
  })
}

// Get bugs by status
export async function getBugsByStatus(status: Bug['status']): Promise<Bug[]> {
  return withRetry(async () => {
    const rows = await query<BugRow[]>(
      'SELECT * FROM bugs WHERE status = ? ORDER BY created_at DESC',
      [status]
    )
    return rows.map(rowToBug)
  })
}

// Get bugs assigned to employee
export async function getBugsAssignedTo(employeeId: string): Promise<Bug[]> {
  return withRetry(async () => {
    const rows = await query<BugRow[]>(
      'SELECT * FROM bugs WHERE assigned_to = ? ORDER BY created_at DESC',
      [employeeId]
    )
    return rows.map(rowToBug)
  })
}

// Get bugs reported by employee
export async function getBugsReportedBy(employeeId: string): Promise<Bug[]> {
  return withRetry(async () => {
    const rows = await query<BugRow[]>(
      'SELECT * FROM bugs WHERE reported_by = ? ORDER BY created_at DESC',
      [employeeId]
    )
    return rows.map(rowToBug)
  })
}

/**
 * Create a new bug in the database
 *
 * This function:
 * 1. Inserts a new bug record into the MySQL bugs table
 * 2. Uses parameterized queries to prevent SQL injection
 * 3. Automatically retries on failure (up to 3 times)
 * 4. Retrieves and returns the created bug with timestamps
 *
 * Note: The bugId must be provided (generated by the API route using generateBugId())
 * The createdAt and updatedAt timestamps are automatically set by MySQL
 *
 * @param {Omit<Bug, 'createdAt' | 'updatedAt'>} bug - Bug data without timestamps
 * @returns {Promise<Bug>} The created bug with all fields including timestamps
 * @throws {Error} If bug creation fails or created bug cannot be retrieved
 *
 * @example
 * const newBug = await createBug({
 *   bugId: "BUG-1735123456789001234",
 *   title: "Login button not working",
 *   description: "Button doesn't respond to clicks",
 *   severity: "Critical",
 *   priority: "High",
 *   status: "New",
 *   category: "UI",
 *   platform: "Web",
 *   reportedBy: "AM-0001",
 *   environment: "Production",
 *   reopenedCount: 0
 * })
 */
export async function createBug(bug: Omit<Bug, 'createdAt' | 'updatedAt'>): Promise<Bug> {
  return withRetry(async () => {
    // Insert bug into database using parameterized query (prevents SQL injection)
    await query<ResultSetHeader>(
      `INSERT INTO bugs (
        bug_id, title, description, severity, priority, status, category,
        platform, assigned_to, assigned_by, reported_by, environment,
        browser_info, device_info, steps_to_reproduce, expected_behavior,
        actual_behavior, attachments, estimated_hours, actual_hours,
        resolved_date, closed_date, reopened_count, tags, related_bugs
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bug.bugId,                          // Unique bug ID (generated by API)
        bug.title,                          // Bug title
        bug.description,                    // Bug description
        bug.severity,                       // Critical/Major/Minor
        bug.priority,                       // High/Medium/Low
        bug.status,                         // New/In Progress/Resolved/etc.
        bug.category,                       // UI/API/Backend/etc.
        bug.platform,                       // iOS/Android/Web/All
        bug.assignedTo || null,             // Optional: Employee ID of assignee
        bug.assignedBy || null,             // Optional: Employee ID of assigner
        bug.reportedBy,                     // Required: Employee ID of reporter
        bug.environment,                    // Development/Staging/Production
        bug.browserInfo || null,            // Optional: Browser details
        bug.deviceInfo || null,             // Optional: Device details
        bug.stepsToReproduce || null,       // Optional: Reproduction steps
        bug.expectedBehavior || null,       // Optional: Expected behavior
        bug.actualBehavior || null,         // Optional: Actual behavior
        bug.attachments || null,            // Optional: File URLs
        bug.estimatedHours || null,         // Optional: Estimated fix time
        bug.actualHours || null,            // Optional: Actual time spent
        bug.resolvedDate || null,           // Optional: Resolution date
        bug.closedDate || null,             // Optional: Closure date
        bug.reopenedCount,                  // Number of times reopened (default: 0)
        bug.tags || null,                   // Optional: Comma-separated tags
        bug.relatedBugs || null             // Optional: Related bug IDs
      ]
    )

    // Retrieve the created bug (includes auto-generated timestamps)
    const createdBug = await getBugById(bug.bugId)
    if (!createdBug) {
      throw new Error('Failed to retrieve created bug')
    }
    return createdBug
  })
}

// Update bug
export async function updateBug(bugId: string, updates: Partial<Bug>): Promise<Bug> {
  return withRetry(async () => {
    const fields: string[] = []
    const values: any[] = []

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'bugId' && key !== 'createdAt' && key !== 'updatedAt') {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
        fields.push(`${snakeKey} = ?`)
        values.push(value === undefined ? null : value)
      }
    })

    if (fields.length === 0) {
      const bug = await getBugById(bugId)
      if (!bug) throw new Error('Bug not found')
      return bug
    }

    values.push(bugId)
    await query(
      `UPDATE bugs SET ${fields.join(', ')} WHERE bug_id = ?`,
      values
    )

    const updatedBug = await getBugById(bugId)
    if (!updatedBug) {
      throw new Error('Failed to retrieve updated bug')
    }
    return updatedBug
  })
}

// Delete bug
export async function deleteBug(bugId: string): Promise<boolean> {
  return withRetry(async () => {
    // Delete comments first
    await query('DELETE FROM bug_comments WHERE bug_id = ?', [bugId])
    
    // Delete bug
    const result = await query<ResultSetHeader>(
      'DELETE FROM bugs WHERE bug_id = ?',
      [bugId]
    )
    return result.affectedRows > 0
  })
}

// Get bug comments
export async function getBugComments(bugId: string): Promise<BugComment[]> {
  return withRetry(async () => {
    const rows = await query<BugCommentRow[]>(
      'SELECT * FROM bug_comments WHERE bug_id = ? ORDER BY timestamp',
      [bugId]
    )
    return rows.map(rowToBugComment)
  })
}

// Add bug comment
export async function addBugComment(
  comment: Omit<BugComment, 'timestamp'>
): Promise<BugComment> {
  return withRetry(async () => {
    await query<ResultSetHeader>(
      'INSERT INTO bug_comments (bug_id, commented_by, comment_text) VALUES (?, ?, ?)',
      [comment.bugId, comment.commentedBy, comment.commentText]
    )

    // Get the last inserted comment
    const row = await queryOne<BugCommentRow>(
      'SELECT * FROM bug_comments WHERE bug_id = ? ORDER BY id DESC LIMIT 1',
      [comment.bugId]
    )

    if (!row) {
      throw new Error('Failed to retrieve created comment')
    }
    return rowToBugComment(row)
  })
}

