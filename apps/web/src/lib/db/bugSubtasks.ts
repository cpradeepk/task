/**
 * Database operations for Bug SubTasks
 * Handles CRUD operations for bug subtasks with soft delete support
 */

import { query, queryOne } from './config'

// Database row interface (snake_case from MySQL)
interface BugSubTaskRow {
  id: number
  parent_bug_id: string
  description: string
  assigned_to: string
  status: 'Not Started' | 'In Progress' | 'Completed'
  is_completed: boolean | number
  display_order: number
  created_at: Date
  updated_at: Date
  created_by: string
  deleted_at: Date | null
  deleted_by: string | null
}

// TypeScript interface for Bug SubTask
export interface BugSubTask {
  id: number
  parentBugId: string
  description: string
  assignedTo: string
  status: 'Not Started' | 'In Progress' | 'Completed'
  isCompleted: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
  createdBy: string
  deletedAt: string | null
  deletedBy: string | null
}

// Convert database row to BugSubTask object (snake_case → camelCase)
function rowToBugSubTask(row: BugSubTaskRow): BugSubTask {
  return {
    id: row.id,
    parentBugId: row.parent_bug_id,
    description: row.description,
    assignedTo: row.assigned_to,
    status: row.status,
    isCompleted: Boolean(row.is_completed),
    displayOrder: row.display_order,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    createdBy: row.created_by,
    deletedAt: row.deleted_at ? new Date(row.deleted_at).toISOString() : null,
    deletedBy: row.deleted_by || null
  }
}

/**
 * Get all subtasks for a parent bug (excluding soft-deleted)
 */
export async function getBugSubTasksByParentBugId(parentBugId: string): Promise<BugSubTask[]> {
  const rows = await query<BugSubTaskRow[]>(
    `SELECT * FROM bug_subtasks
     WHERE parent_bug_id = $1 AND deleted_at IS NULL
     ORDER BY display_order ASC, created_at ASC`,
    [parentBugId]
  )
  return rows.map(rowToBugSubTask)
}

/**
 * Get a single bug subtask by ID
 */
export async function getBugSubTaskById(id: number): Promise<BugSubTask | null> {
  const row = await queryOne<BugSubTaskRow>(
    'SELECT * FROM bug_subtasks WHERE id = $1 AND deleted_at IS NULL',
    [id]
  )
  return row ? rowToBugSubTask(row) : null
}

/**
 * Create a new bug subtask
 */
export async function createBugSubTask(data: {
  parentBugId: string
  description: string
  assignedTo: string
  status?: 'Not Started' | 'In Progress' | 'Completed'
  isCompleted?: boolean
  displayOrder?: number
  createdBy: string
}): Promise<BugSubTask> {
  const result = await query(
    `INSERT INTO bug_subtasks (
      parent_bug_id, description, assigned_to, status,
      is_completed, display_order, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [
      data.parentBugId,
      data.description,
      data.assignedTo,
      data.status || 'Not Started',
      data.isCompleted ? 1 : 0,
      data.displayOrder ?? 0,
      data.createdBy
    ]
  )

  const insertId = (result as any).rows?.[0]?.id || (result as any)[0]?.id
  const newBugSubTask = await getBugSubTaskById(insertId)
  if (!newBugSubTask) {
    throw new Error('Failed to retrieve created bug subtask')
  }
  return newBugSubTask
}

/**
 * Update a bug subtask
 */
export async function updateBugSubTask(
  id: number,
  data: {
    description?: string
    assignedTo?: string
    status?: 'Not Started' | 'In Progress' | 'Completed'
    isCompleted?: boolean
    displayOrder?: number
  }
): Promise<BugSubTask> {
  const updates: string[] = []
  const values: any[] = []
  let paramIndex = 1

  if (data.description !== undefined) {
    updates.push(`description = $${paramIndex++}`)
    values.push(data.description)
  }
  if (data.assignedTo !== undefined) {
    updates.push(`assigned_to = $${paramIndex++}`)
    values.push(data.assignedTo)
  }

  // Handle status update - avoid duplicate column assignment
  // If isCompleted is being set to true, it will override any explicit status value
  let statusValue: string | undefined = data.status
  if (data.isCompleted !== undefined) {
    updates.push(`is_completed = $${paramIndex++}`)
    values.push(data.isCompleted ? 1 : 0)
    // Auto-update status based on completion
    if (data.isCompleted) {
      statusValue = 'Completed'
    }
  }

  // Only add status update once, using the determined value
  if (statusValue !== undefined) {
    updates.push(`status = $${paramIndex++}`)
    values.push(statusValue)
  }

  if (data.displayOrder !== undefined) {
    updates.push(`display_order = $${paramIndex++}`)
    values.push(data.displayOrder)
  }

  if (updates.length === 0) {
    throw new Error('No fields to update')
  }

  values.push(id)

  await query(
    `UPDATE bug_subtasks SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
    values
  )

  const updatedBugSubTask = await getBugSubTaskById(id)
  if (!updatedBugSubTask) {
    throw new Error('Failed to retrieve updated bug subtask')
  }
  return updatedBugSubTask
}

/**
 * Soft delete a bug subtask
 */
export async function softDeleteBugSubTask(id: number, deletedBy: string): Promise<void> {
  await query(
    `UPDATE bug_subtasks
     SET deleted_at = NOW(), deleted_by = $1
     WHERE id = $2`,
    [deletedBy, id]
  )
}

/**
 * Restore a soft-deleted bug subtask
 */
export async function restoreBugSubTask(id: number): Promise<BugSubTask> {
  await query(
    `UPDATE bug_subtasks
     SET deleted_at = NULL, deleted_by = NULL
     WHERE id = $1`,
    [id]
  )

  const restoredBugSubTask = await queryOne<BugSubTaskRow>(
    'SELECT * FROM bug_subtasks WHERE id = $1',
    [id]
  )

  if (!restoredBugSubTask) {
    throw new Error('Failed to retrieve restored bug subtask')
  }

  return rowToBugSubTask(restoredBugSubTask)
}

/**
 * Get subtask count statistics for a parent bug
 */
export async function getBugSubTaskCount(parentBugId: string): Promise<{
  total: number
  notStarted: number
  inProgress: number
  completed: number
}> {
  const rows = await query<any[]>(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'Not Started' THEN 1 ELSE 0 END) as notStarted,
      SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as inProgress,
      SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed
     FROM bug_subtasks
     WHERE parent_bug_id = $1 AND deleted_at IS NULL`,
    [parentBugId]
  )

  const row = rows[0]
  return {
    total: Number(row.total) || 0,
    notStarted: Number(row.notStarted) || 0,
    inProgress: Number(row.inProgress) || 0,
    completed: Number(row.completed) || 0
  }
}

/**
 * Reorder bug subtasks (for drag-and-drop)
 */
export async function reorderBugSubTasks(parentBugId: string, subtaskIds: number[]): Promise<void> {
  // Update display_order for each subtask
  const promises = subtaskIds.map((id, index) =>
    query(
      `UPDATE bug_subtasks
       SET display_order = $1
       WHERE id = $2 AND parent_bug_id = $3`,
      [index, id, parentBugId]
    )
  )

  await Promise.all(promises)
}

/**
 * Get all deleted bug subtasks (for admin "Deleted Items" page)
 */
export async function getAllDeletedBugSubTasks(): Promise<BugSubTask[]> {
  const rows = await query<BugSubTaskRow[]>(
    `SELECT * FROM bug_subtasks
     WHERE deleted_at IS NOT NULL
     ORDER BY deleted_at DESC`,
    []
  )
  return rows.map(rowToBugSubTask)
}

