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
/**
 * BugRow Interface
 *
 * Represents a bug record as it comes from the MySQL database.
 * Database columns use snake_case naming (e.g., bug_id, assigned_to).
 *
 * This interface  from mysql2 library to ensure
 * type safety when querying the database.
 */
interface BugRow  {
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
  expected_behavior: string | null    // What should happen (optional)
  actual_behavior: string | null      // What actually happens (optional)
  server_logs: string | null          // Server-side logs and errors (optional)
  frontend_logs: string | null        // Frontend console logs and errors (optional)
  attachments: string | null          // File URLs or paths (optional)
  estimated_hours: number | null      // Estimated time to fix (optional)
  actual_hours: number | null         // Actual time spent (optional)
  resolved_date: string | null        // When bug was resolved (optional)
  closed_date: string | null          // When bug was closed (optional)
  reopened_count: number              // Number of times bug was reopened
  tags: string | null                 // Comma-separated tags (optional)
  related_bugs: string | null         // Comma-separated bug IDs (optional)
  project_id: string | null           // Project ID this bug belongs to (optional)
  subproject_id: string | null        // Subproject ID this bug belongs to (optional)
  parent_dev_id: string | null        // Parent bug ID for subtasks (optional)
  feature: string | null              // Feature name this bug is related to (optional)
  type: string | null                 // Bug type: 'testcase', 'feature', 'other' (optional)
  created_at: string                  // Timestamp when bug was created
  updated_at: string                  // Timestamp when bug was last updated
}

/**
 * BugCommentRow Interface
 *
 * Represents a bug comment record from the MySQL database.
 * Comments are stored in a separate table linked by bug_id.
 */
interface BugCommentRow  {
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
    expectedBehavior: row.expected_behavior || undefined,
    actualBehavior: row.actual_behavior || undefined,
    serverLogs: row.server_logs || undefined,
    frontendLogs: row.frontend_logs || undefined,
    attachments: row.attachments || undefined,
    estimatedHours: row.estimated_hours || undefined,
    actualHours: row.actual_hours || undefined,
    resolvedDate: row.resolved_date || undefined,
    closedDate: row.closed_date || undefined,
    reopenedCount: row.reopened_count,
    tags: row.tags || undefined,
    relatedBugs: row.related_bugs || undefined,
    projectId: row.project_id || undefined,
    subprojectId: row.subproject_id || undefined,
    parentDevId: row.parent_dev_id || undefined,
    feature: row.feature || undefined,
    type: row.type as Bug['type'] || undefined,
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
export async function getBugById(bug_id: string): Promise<Bug | null> {
  return withRetry(async () => {
    const row = await queryOne<BugRow>(
      'SELECT * FROM bugs WHERE bug_id = $1',
      [bug_id]
    )
    return row ? rowToBug(row) : null
  })
}

// Get bugs by status
export async function getBugsByStatus(status: Bug['status']): Promise<Bug[]> {
  return withRetry(async () => {
    const rows = await query<BugRow[]>(
      'SELECT * FROM bugs WHERE status = $1 ORDER BY created_at DESC',
      [status]
    )
    return rows.map(rowToBug)
  })
}

// Get bugs assigned to employee
export async function getBugsAssignedTo(employee_id: string): Promise<Bug[]> {
  return withRetry(async () => {
    const rows = await query<BugRow[]>(
      'SELECT * FROM bugs WHERE assigned_to = $1 ORDER BY created_at DESC',
      [employee_id]
    )
    return rows.map(rowToBug)
  })
}

// Get bugs reported by employee
export async function getBugsReportedBy(employee_id: string): Promise<Bug[]> {
  return withRetry(async () => {
    const rows = await query<BugRow[]>(
      'SELECT * FROM bugs WHERE reported_by = $1 ORDER BY created_at DESC',
      [employee_id]
    )
    return rows.map(rowToBug)
  })
}

// Get all bugs for an employee (assigned to or reported by)
export async function getBugsByEmployeeId(employee_id: string): Promise<Bug[]> {
  return withRetry(async () => {
    const rows = await query<BugRow[]>(
      'SELECT * FROM bugs WHERE assigned_to = $1 OR reported_by = $2 ORDER BY created_at DESC',
      [employee_id, employee_id]
    )
    return rows.map(rowToBug)
  })
}

// Get bugs by project ID
export async function getBugsByProject(project_id: string): Promise<Bug[]> {
  return withRetry(async () => {
    const rows = await query<BugRow[]>(
      'SELECT * FROM bugs WHERE project_id = $1 ORDER BY created_at DESC',
      [project_id]
    )
    return rows.map(rowToBug)
  })
}

// Get subtasks by parent bug ID (excluding soft-deleted)
export async function getSubtasksByParentDevId(parent_dev_id: string): Promise<Bug[]> {
  return withRetry(async () => {
    const rows = await query<BugRow[]>(
      'SELECT * FROM bugs WHERE parent_dev_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC',
      [parent_dev_id]
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
// Get the latest bug ID for sequential ID generation
export async function getLatestBugId(): Promise<string | undefined> {
  return withRetry(async () => {
    const rows = await query<any[]>(
      `SELECT bug_id FROM bugs
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`
    )
    return rows.length > 0 ? rows[0].bug_id : undefined
  })
}

export async function createBug(bug: Omit<Bug, 'createdAt' | 'updatedAt'>): Promise<Bug> {
  return withRetry(async () => {
    // Insert bug into database using parameterized query (prevents SQL injection)
    // Note: server_logs and frontend_logs columns removed as they don't exist in PostgreSQL schema
    await query<any>(
      `INSERT INTO bugs (
        bug_id, title, description, severity, priority, status, category,
        platform, assigned_to, assigned_by, reported_by, environment,
        browser_info, device_info, expected_behavior,
        actual_behavior, server_logs, frontend_logs, attachments, estimated_hours, actual_hours,
        resolved_date, closed_date, reopened_count, tags, related_bugs,
        project_id, subproject_id, parent_dev_id, feature, type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)`,
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
        bug.expectedBehavior || null,       // Optional: Expected behavior
        bug.actualBehavior || null,         // Optional: Actual behavior
        bug.serverLogs || null,             // Optional: Server logs
        bug.frontendLogs || null,           // Optional: Frontend logs
        bug.attachments || null,            // Optional: File URLs
        bug.estimatedHours || null,         // Optional: Estimated fix time
        bug.actualHours || null,            // Optional: Actual time spent
        bug.resolvedDate || null,           // Optional: Resolution date
        bug.closedDate || null,             // Optional: Closure date
        bug.reopenedCount,                  // Number of times reopened (default: 0)
        bug.tags || null,                   // Optional: Comma-separated tags
        bug.relatedBugs || null,            // Optional: Related bug IDs
        bug.projectId || null,              // Optional: Project ID
        bug.subprojectId || null,           // Optional: Subproject ID
        bug.parentDevId || null,            // Optional: Parent bug ID for subtasks
        bug.feature || null,                // Optional: Feature name
        bug.type || null                    // Optional: Bug type (testcase/feature/other)
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
export async function updateBug(bug_id: string, updates: Partial<Bug>): Promise<Bug> {
  return withRetry(async () => {
    const fields: string[] = []
    const values: any[] = []
    let paramIndex = 1

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'bugId' && key !== 'createdAt' && key !== 'updatedAt') {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
        fields.push(`${snakeKey} = $${paramIndex++}`)
        values.push(value === undefined ? null : value)
      }
    })

    if (fields.length === 0) {
      const bug = await getBugById(bug_id)
      if (!bug) throw new Error('Bug not found')
      return bug
    }

    values.push(bug_id)
    await query(
      `UPDATE bugs SET ${fields.join(', ')} WHERE bug_id = $${paramIndex}`,
      values
    )

    const updatedBug = await getBugById(bug_id)
    if (!updatedBug) {
      throw new Error('Failed to retrieve updated bug')
    }
    return updatedBug
  })
}

// Delete bug
export async function deleteBug(bug_id: string): Promise<boolean> {
  return withRetry(async () => {
    // Delete comments first
    await query('DELETE FROM bug_comments WHERE bug_id = $1', [bug_id])

    // Delete bug
    const result = await query<any>(
      'DELETE FROM bugs WHERE bug_id = $1',
      [bug_id]
    )
    return result.affectedRows > 0
  })
}

// Get bug comments
export async function getBugComments(bug_id: string): Promise<BugComment[]> {
  return withRetry(async () => {
    const rows = await query<BugCommentRow[]>(
      'SELECT * FROM bug_comments WHERE bug_id = $1 ORDER BY timestamp',
      [bug_id]
    )
    return rows.map(rowToBugComment)
  })
}

// Add bug comment
export async function addBugComment(
  comment: Omit<BugComment, 'timestamp'>
): Promise<BugComment> {
  return withRetry(async () => {
    await query<any>(
      'INSERT INTO bug_comments (bug_id, commented_by, comment_text) VALUES ($1, $2, $3)',
      [comment.bugId, comment.commentedBy, comment.commentText]
    )

    // Get the last inserted comment
    const row = await queryOne<BugCommentRow>(
      'SELECT * FROM bug_comments WHERE bug_id = $1 ORDER BY id DESC LIMIT 1',
      [comment.bugId]
    )

    if (!row) {
      throw new Error('Failed to retrieve created comment')
    }
    return rowToBugComment(row)
  })
}

