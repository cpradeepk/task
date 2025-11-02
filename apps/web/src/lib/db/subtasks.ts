/**
 * Database operations for SubTasks
 * Handles CRUD operations for subtasks with soft delete support
 */

import { query, queryOne } from './config'
import { SubTask } from '../types'

// Database row interface (snake_case from MySQL)
interface SubTaskRow {
  id: number
  parent_task_id: string
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

// Convert database row to SubTask object (snake_case → camelCase)
function rowToSubTask(row: SubTaskRow): SubTask {
  return {
    id: row.id,
    parentTaskId: row.parent_task_id,
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
 * Get all subtasks for a parent task (excluding soft-deleted)
 */
export async function getSubTasksByParentTaskId(parent_task_id: string): Promise<SubTask[]> {
  const rows = await query<SubTaskRow[]>(
    `SELECT * FROM subtasks
     WHERE parent_task_id = $1 AND deleted_at IS NULL
     ORDER BY display_order ASC, created_at ASC`,
    [parent_task_id]
  )
  return rows.map(rowToSubTask)
}

/**
 * Get all subtasks including soft-deleted (for admin "Deleted Items" page)
 */
export async function getAllSubTasksIncludingDeleted(parent_task_id: string): Promise<SubTask[]> {
  const rows = await query<SubTaskRow[]>(
    `SELECT * FROM subtasks
     WHERE parent_task_id = $1
     ORDER BY display_order ASC, created_at ASC`,
    [parent_task_id]
  )
  return rows.map(rowToSubTask)
}

/**
 * Get a single subtask by ID
 */
export async function getSubTaskById(id: number): Promise<SubTask | null> {
  const row = await queryOne<SubTaskRow>(
    'SELECT * FROM subtasks WHERE id = $1 AND deleted_at IS NULL',
    [id]
  )
  return row ? rowToSubTask(row) : null
}

/**
 * Create a new subtask
 */
export async function createSubTask(data: {
  parentTaskId: string
  description: string
  assignedTo: string
  status?: 'Not Started' | 'In Progress' | 'Completed'
  isCompleted?: boolean
  displayOrder?: number
  createdBy: string
}): Promise<SubTask> {
  const result = await query(
    `INSERT INTO subtasks (
      parent_task_id, description, assigned_to, status,
      is_completed, display_order, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      data.parentTaskId,
      data.description,
      data.assignedTo,
      data.status || 'Not Started',
      data.isCompleted ? 1 : 0,
      data.displayOrder ?? 0,
      data.createdBy
    ]
  )

  const insertId = (result as any).insertId
  const newSubTask = await getSubTaskById(insertId)
  if (!newSubTask) {
    throw new Error('Failed to retrieve created subtask')
  }
  return newSubTask
}

/**
 * Update a subtask
 */
export async function updateSubTask(
  id: number,
  data: {
    description?: string
    assignedTo?: string
    status?: 'Not Started' | 'In Progress' | 'Completed'
    isCompleted?: boolean
    displayOrder?: number
  }
): Promise<SubTask> {
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
  if (data.status !== undefined) {
    updates.push(`status = $${paramIndex++}`)
    values.push(data.status)
  }
  if (data.isCompleted !== undefined) {
    updates.push(`is_completed = $${paramIndex++}`)
    values.push(data.isCompleted ? 1 : 0)
    // Auto-update status based on completion
    if (data.isCompleted) {
      updates.push(`status = $${paramIndex++}`)
      values.push('Completed')
    }
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
    `UPDATE subtasks SET ${updates.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL`,
    values
  )

  const updatedSubTask = await getSubTaskById(id)
  if (!updatedSubTask) {
    throw new Error('Failed to retrieve updated subtask')
  }
  return updatedSubTask
}

/**
 * Soft delete a subtask
 */
export async function softDeleteSubTask(id: number, deletedBy: string): Promise<void> {
  await query(
    'UPDATE subtasks SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2',
    [deletedBy, id]
  )
}

/**
 * Restore a soft-deleted subtask
 */
export async function restoreSubTask(id: number): Promise<SubTask> {
  await query(
    'UPDATE subtasks SET deleted_at = NULL, deleted_by = NULL WHERE id = $1',
    [id]
  )

  const restoredSubTask = await getSubTaskById(id)
  if (!restoredSubTask) {
    throw new Error('Failed to retrieve restored subtask')
  }
  return restoredSubTask
}

/**
 * Hard delete a subtask (permanent deletion - use with caution!)
 */
export async function hardDeleteSubTask(id: number): Promise<void> {
  await query('DELETE FROM subtasks WHERE id = $1', [id])
}

/**
 * Reorder subtasks (for drag-and-drop functionality)
 */
export async function reorderSubTasks(
  parentTaskId: string,
  subtaskIds: number[]
): Promise<void> {
  // Update display_order for each subtask
  for (let i = 0; i < subtaskIds.length; i++) {
    await query(
      'UPDATE subtasks SET display_order = $1 WHERE id = $2 AND parent_task_id = $3',
      [i, subtaskIds[i], parentTaskId]
    )
  }
}

/**
 * Get subtask count for a parent task
 */
export async function getSubTaskCount(parent_task_id: string): Promise<{
  total: number
  completed: number
  inProgress: number
  notStarted: number
}> {
  const row = await queryOne<{
    total: number
    completed: number
    in_progress: number
    not_started: number
  }>(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN is_completed = true THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'Not Started' THEN 1 ELSE 0 END) as not_started
    FROM subtasks
    WHERE parent_task_id = $1 AND deleted_at IS NULL`,
    [parent_task_id]
  )

  return {
    total: row?.total || 0,
    completed: row?.completed || 0,
    inProgress: row?.in_progress || 0,
    notStarted: row?.not_started || 0
  }
}

/**
 * Get all deleted subtasks (for admin "Deleted Items" page)
 */
export async function getAllDeletedSubTasks(): Promise<SubTask[]> {
  const rows = await query<SubTaskRow[]>(
    `SELECT * FROM subtasks
     WHERE deleted_at IS NOT NULL
     ORDER BY deleted_at DESC`,
    []
  )
  return rows.map(rowToSubTask)
}

/**
 * Delete all subtasks for a parent task (when parent task is deleted)
 * This is handled automatically by ON DELETE CASCADE in the database
 */
export async function deleteSubTasksByParentTaskId(
  parentTaskId: string,
  deletedBy: string
): Promise<void> {
  await query(
    'UPDATE subtasks SET deleted_at = NOW(), deleted_by = $1 WHERE parent_task_id = $2',
    [deletedBy, parentTaskId]
  )
}

