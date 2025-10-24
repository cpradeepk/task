// MySQL Bugs Service
// Server-side only - do not use 'use client'

import { query, queryOne, withRetry } from './config'
import { Bug, BugComment } from '../types'
import { RowDataPacket, ResultSetHeader } from 'mysql2'

interface BugRow extends RowDataPacket {
  id: number
  bug_id: string
  title: string
  description: string
  severity: string
  priority: string
  status: string
  category: string
  platform: string
  assigned_to: string | null
  assigned_by: string | null
  reported_by: string
  environment: string
  browser_info: string | null
  device_info: string | null
  steps_to_reproduce: string | null
  expected_behavior: string | null
  actual_behavior: string | null
  attachments: string | null
  estimated_hours: number | null
  actual_hours: number | null
  resolved_date: string | null
  closed_date: string | null
  reopened_count: number
  tags: string | null
  related_bugs: string | null
  created_at: string
  updated_at: string
}

interface BugCommentRow extends RowDataPacket {
  id: number
  bug_id: string
  commented_by: string
  comment_text: string
  timestamp: string
}

// Convert database row to Bug object
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

// Create bug
export async function createBug(bug: Omit<Bug, 'createdAt' | 'updatedAt'>): Promise<Bug> {
  return withRetry(async () => {
    await query<ResultSetHeader>(
      `INSERT INTO bugs (
        bug_id, title, description, severity, priority, status, category,
        platform, assigned_to, assigned_by, reported_by, environment,
        browser_info, device_info, steps_to_reproduce, expected_behavior,
        actual_behavior, attachments, estimated_hours, actual_hours,
        resolved_date, closed_date, reopened_count, tags, related_bugs
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bug.bugId,
        bug.title,
        bug.description,
        bug.severity,
        bug.priority,
        bug.status,
        bug.category,
        bug.platform,
        bug.assignedTo || null,
        bug.assignedBy || null,
        bug.reportedBy,
        bug.environment,
        bug.browserInfo || null,
        bug.deviceInfo || null,
        bug.stepsToReproduce || null,
        bug.expectedBehavior || null,
        bug.actualBehavior || null,
        bug.attachments || null,
        bug.estimatedHours || null,
        bug.actualHours || null,
        bug.resolvedDate || null,
        bug.closedDate || null,
        bug.reopenedCount,
        bug.tags || null,
        bug.relatedBugs || null
      ]
    )

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

