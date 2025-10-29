// Activity Log Database Operations
// Server-side only - do not use 'use client'

import { query, withRetry, withTimeout } from './config'
import { ResultSetHeader, RowDataPacket } from 'mysql2'

/**
 * Activity Log Entry Interface
 * Represents a single activity or comment in the unified timeline
 */
export interface ActivityLog {
  id: number
  entityType: 'task' | 'bug' | 'leave' | 'wfh'
  entityId: string
  userId: string
  userName?: string // Populated via JOIN with users table
  actionType: string
  fieldName?: string | null
  oldValue?: string | null
  newValue?: string | null
  description: string
  isComment: boolean
  createdAt: string
}

/**
 * Input for creating a new activity log entry
 */
export interface CreateActivityLogInput {
  entityType: 'task' | 'bug' | 'leave' | 'wfh'
  entityId: string
  userId: string
  actionType: string
  fieldName?: string
  oldValue?: string
  newValue?: string
  description: string
  isComment?: boolean
}

/**
 * Create a new activity log entry
 * 
 * @param input - Activity log data
 * @returns The created activity log entry with ID
 * 
 * @example
 * // Log a status change
 * await createActivityLog({
 *   entityType: 'task',
 *   entityId: 'JSR-001',
 *   userId: 'AM-0001',
 *   actionType: 'status_change',
 *   fieldName: 'status',
 *   oldValue: 'Yet to Start',
 *   newValue: 'In Progress',
 *   description: 'Status changed from "Yet to Start" to "In Progress"',
 *   isComment: false
 * })
 * 
 * @example
 * // Log a user comment
 * await createActivityLog({
 *   entityType: 'task',
 *   entityId: 'JSR-001',
 *   userId: 'AM-0001',
 *   actionType: 'comment',
 *   description: 'Working on the API integration',
 *   isComment: true
 * })
 */
export async function createActivityLog(input: CreateActivityLogInput): Promise<ActivityLog> {
  return withRetry(async () => {
    const result = await withTimeout(
      query<ResultSetHeader>(
        `INSERT INTO activity_log (
          entity_type, entity_id, user_id, action_type,
          field_name, old_value, new_value, description, is_comment
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.entityType,
          input.entityId,
          input.userId,
          input.actionType,
          input.fieldName || null,
          input.oldValue || null,
          input.newValue || null,
          input.description,
          input.isComment || false
        ]
      ),
      10000,
      'Failed to create activity log entry'
    )

    // Fetch the created entry
    const created = await getActivityLogById(result.insertId)
    if (!created) {
      throw new Error('Failed to retrieve created activity log entry')
    }

    return created
  })
}

/**
 * Get a single activity log entry by ID
 * 
 * @param id - Activity log ID
 * @returns Activity log entry or null if not found
 */
export async function getActivityLogById(id: number): Promise<ActivityLog | null> {
  return withRetry(async () => {
    const rows = await withTimeout(
      query<(RowDataPacket & ActivityLog)[]>(
        `SELECT 
          al.id,
          al.entity_type as entityType,
          al.entity_id as entityId,
          al.user_id as userId,
          u.name as userName,
          al.action_type as actionType,
          al.field_name as fieldName,
          al.old_value as oldValue,
          al.new_value as newValue,
          al.description,
          al.is_comment as isComment,
          al.created_at as createdAt
        FROM activity_log al
        LEFT JOIN users u ON al.user_id = u.employee_id
        WHERE al.id = ?`,
        [id]
      ),
      10000,
      'Failed to fetch activity log entry'
    )

    return rows.length > 0 ? rows[0] : null
  })
}

/**
 * Get all activity log entries for a specific entity
 * Returns both system activities and user comments in chronological order
 * 
 * @param entityType - Type of entity (task, bug, leave, wfh)
 * @param entityId - ID of the entity
 * @param sortOrder - Sort order: 'asc' (oldest first) or 'desc' (newest first)
 * @returns Array of activity log entries
 * 
 * @example
 * // Get all activities for a task (newest first)
 * const timeline = await getActivityLogByEntity('task', 'JSR-001', 'desc')
 */
export async function getActivityLogByEntity(
  entityType: 'task' | 'bug' | 'leave' | 'wfh',
  entityId: string,
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<ActivityLog[]> {
  return withRetry(async () => {
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC'
    
    const rows = await withTimeout(
      query<(RowDataPacket & ActivityLog)[]>(
        `SELECT 
          al.id,
          al.entity_type as entityType,
          al.entity_id as entityId,
          al.user_id as userId,
          u.name as userName,
          al.action_type as actionType,
          al.field_name as fieldName,
          al.old_value as oldValue,
          al.new_value as newValue,
          al.description,
          al.is_comment as isComment,
          al.created_at as createdAt
        FROM activity_log al
        LEFT JOIN users u ON al.user_id = u.employee_id
        WHERE al.entity_type = ? AND al.entity_id = ?
        ORDER BY al.created_at ${order}`,
        [entityType, entityId]
      ),
      15000,
      'Failed to fetch activity log entries'
    )

    return rows
  })
}

/**
 * Get only comments for a specific entity
 * 
 * @param entityType - Type of entity
 * @param entityId - ID of the entity
 * @param sortOrder - Sort order
 * @returns Array of comment entries
 */
export async function getCommentsByEntity(
  entityType: 'task' | 'bug' | 'leave' | 'wfh',
  entityId: string,
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<ActivityLog[]> {
  return withRetry(async () => {
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC'
    
    const rows = await withTimeout(
      query<(RowDataPacket & ActivityLog)[]>(
        `SELECT 
          al.id,
          al.entity_type as entityType,
          al.entity_id as entityId,
          al.user_id as userId,
          u.name as userName,
          al.action_type as actionType,
          al.field_name as fieldName,
          al.old_value as oldValue,
          al.new_value as newValue,
          al.description,
          al.is_comment as isComment,
          al.created_at as createdAt
        FROM activity_log al
        LEFT JOIN users u ON al.user_id = u.employee_id
        WHERE al.entity_type = ? AND al.entity_id = ? AND al.is_comment = TRUE
        ORDER BY al.created_at ${order}`,
        [entityType, entityId]
      ),
      15000,
      'Failed to fetch comments'
    )

    return rows
  })
}

/**
 * Get only system activities (non-comments) for a specific entity
 * 
 * @param entityType - Type of entity
 * @param entityId - ID of the entity
 * @param sortOrder - Sort order
 * @returns Array of system activity entries
 */
export async function getSystemActivitiesByEntity(
  entityType: 'task' | 'bug' | 'leave' | 'wfh',
  entityId: string,
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<ActivityLog[]> {
  return withRetry(async () => {
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC'
    
    const rows = await withTimeout(
      query<(RowDataPacket & ActivityLog)[]>(
        `SELECT 
          al.id,
          al.entity_type as entityType,
          al.entity_id as entityId,
          al.user_id as userId,
          u.name as userName,
          al.action_type as actionType,
          al.field_name as fieldName,
          al.old_value as oldValue,
          al.new_value as newValue,
          al.description,
          al.is_comment as isComment,
          al.created_at as createdAt
        FROM activity_log al
        LEFT JOIN users u ON al.user_id = u.employee_id
        WHERE al.entity_type = ? AND al.entity_id = ? AND al.is_comment = FALSE
        ORDER BY al.created_at ${order}`,
        [entityType, entityId]
      ),
      15000,
      'Failed to fetch system activities'
    )

    return rows
  })
}

/**
 * Delete an activity log entry (soft delete - not implemented, hard delete for now)
 * Only comments should be deletable, system activities should be immutable
 * 
 * @param id - Activity log ID
 * @param userId - User ID requesting deletion (for authorization)
 * @returns True if deleted successfully
 */
export async function deleteActivityLog(id: number, userId: string): Promise<boolean> {
  return withRetry(async () => {
    // Only allow deletion of comments by the original author
    const entry = await getActivityLogById(id)
    if (!entry) {
      throw new Error('Activity log entry not found')
    }

    if (!entry.isComment) {
      throw new Error('Cannot delete system-generated activities')
    }

    if (entry.userId !== userId) {
      throw new Error('You can only delete your own comments')
    }

    const result = await withTimeout(
      query<ResultSetHeader>(
        'DELETE FROM activity_log WHERE id = ? AND user_id = ? AND is_comment = TRUE',
        [id, userId]
      ),
      10000,
      'Failed to delete activity log entry'
    )

    return result.affectedRows > 0
  })
}

/**
 * Helper function to log a field change
 * Automatically creates a formatted description
 *
 * @param entityType - Type of entity
 * @param entityId - ID of the entity
 * @param userId - User who made the change
 * @param fieldName - Name of the field that changed
 * @param oldValue - Previous value
 * @param newValue - New value
 * @param fieldLabel - Human-readable field name (optional)
 */
export async function logFieldChange(
  entityType: 'task' | 'bug' | 'leave' | 'wfh',
  entityId: string,
  userId: string,
  fieldName: string,
  oldValue: string | null,
  newValue: string | null,
  fieldLabel?: string
): Promise<ActivityLog> {
  const label = fieldLabel || fieldName
  const description = oldValue
    ? `${label} changed from "${oldValue}" to "${newValue}"`
    : `${label} set to "${newValue}"`

  return createActivityLog({
    entityType,
    entityId,
    userId,
    actionType: 'field_update',
    fieldName,
    oldValue: oldValue || undefined,
    newValue: newValue || undefined,
    description,
    isComment: false
  })
}

/**
 * Helper function to automatically log all changes between old and new entity states
 * Compares two objects and logs all field changes
 *
 * @param entityType - Type of entity
 * @param entityId - ID of the entity
 * @param userId - User who made the changes
 * @param oldEntity - Previous state of the entity
 * @param newEntity - New state of the entity (updates object)
 * @param fieldLabels - Optional mapping of field names to human-readable labels
 *
 * @example
 * await logEntityChanges('task', 'JSR-001', 'AM-0001', currentTask, updates, {
 *   status: 'Status',
 *   assignedTo: 'Assigned To',
 *   priority: 'Priority'
 * })
 */
export async function logEntityChanges(
  entityType: 'task' | 'bug' | 'leave' | 'wfh',
  entityId: string,
  userId: string,
  oldEntity: Record<string, any>,
  newEntity: Record<string, any>,
  fieldLabels?: Record<string, string>
): Promise<ActivityLog[]> {
  const changes: ActivityLog[] = []

  // Fields to ignore (internal/system fields)
  const ignoreFields = ['id', 'createdAt', 'updatedAt', 'created_at', 'updated_at']

  // Iterate through new entity fields
  for (const [key, newValue] of Object.entries(newEntity)) {
    // Skip ignored fields
    if (ignoreFields.includes(key)) continue

    // Skip if value hasn't changed
    const oldValue = oldEntity[key]
    if (oldValue === newValue) continue

    // Skip if both are null/undefined
    if ((oldValue === null || oldValue === undefined) && (newValue === null || newValue === undefined)) continue

    // Get human-readable label
    const label = fieldLabels?.[key] || key

    // Determine action type
    let actionType = 'field_update'
    if (key === 'status') actionType = 'status_change'
    else if (key === 'assignedTo' || key === 'assigned_to') actionType = 'assignment_change'
    else if (key === 'priority') actionType = 'priority_change'
    else if (key === 'estimatedHours' || key === 'estimated_hours') actionType = 'estimated_hours_change'
    else if (key === 'actualHours' || key === 'actual_hours') actionType = 'time_logged'

    // Format values for display
    const oldValueStr = oldValue !== null && oldValue !== undefined ? String(oldValue) : null
    const newValueStr = newValue !== null && newValue !== undefined ? String(newValue) : null

    // Create description
    const description = oldValueStr
      ? `${label} changed from "${oldValueStr}" to "${newValueStr}"`
      : `${label} set to "${newValueStr}"`

    try {
      const activity = await createActivityLog({
        entityType,
        entityId,
        userId,
        actionType,
        fieldName: key,
        oldValue: oldValueStr || undefined,
        newValue: newValueStr || undefined,
        description,
        isComment: false
      })
      changes.push(activity)
    } catch (error) {
      console.error(`Failed to log change for field ${key}:`, error)
      // Continue logging other changes even if one fails
    }
  }

  return changes
}

