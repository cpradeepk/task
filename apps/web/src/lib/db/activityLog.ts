// Activity Log Database Operations
// Server-side only - do not use 'use client'

import { query, withRetry, withTimeout } from './config'
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
  attachments?: string | null // Comma-separated S3 URLs for comment attachments
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
  attachments?: string // Comma-separated S3 URLs for comment attachments
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
    // Calculate IST timestamp (UTC + 5:30)
    const now = new Date()
    const istOffset = 5.5 * 60 * 60 * 1000 // 5.5 hours in milliseconds
    const istTime = new Date(now.getTime() + istOffset)
    const istTimestamp = istTime.toISOString().slice(0, 19).replace('T', ' ') // Format: YYYY-MM-DD HH:MM:SS

    // PostgreSQL uses RETURNING clause instead of insertId
    const rows = await withTimeout(
      query<any[]>(
        `INSERT INTO activity_log (
          entity_type, entity_id, user_id, action_type,
          field_name, old_value, new_value, description, is_comment, attachments, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
        [
          input.entityType,
          input.entityId,
          input.userId,
          input.actionType,
          input.fieldName || null,
          input.oldValue || null,
          input.newValue || null,
          input.description,
          input.isComment ? 1 : 0,  // Convert boolean to integer (0/1) for PostgreSQL
          input.attachments || null,
          istTimestamp
        ]
      ),
      10000,
      'Failed to create activity log entry'
    )

    // PostgreSQL RETURNING clause returns the row directly
    if (!rows || rows.length === 0 || !rows[0].id) {
      throw new Error('Failed to create activity log entry - no ID returned')
    }

    const insertedId = rows[0].id

    // Fetch the created entry
    const created = await getActivityLogById(insertedId)
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
      query<any[]>(
        `SELECT
          al.id,
          al.entity_type as "entityType",
          al.entity_id as "entityId",
          al.user_id as "userId",
          u.name as "userName",
          al.action_type as "actionType",
          al.field_name as "fieldName",
          al.old_value as "oldValue",
          al.new_value as "newValue",
          al.description,
          al.is_comment as "isComment",
          al.attachments,
          al.created_at as "createdAt"
        FROM activity_log al
        LEFT JOIN users u ON al.user_id = u.employee_id
        WHERE al.id = $1`,
        [id]
      ),
      10000,
      'Failed to fetch activity log entry'
    )

    if (rows.length === 0) return null

    // Convert is_comment from INTEGER (0/1) or BOOLEAN to boolean
    const row = rows[0]
    return {
      ...row,
      isComment: row.isComment === true || row.isComment === 1 || row.isComment === '1'
    } as ActivityLog
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
      query<any[]>(
        `SELECT
          al.id,
          al.entity_type as "entityType",
          al.entity_id as "entityId",
          al.user_id as "userId",
          u.name as "userName",
          al.action_type as "actionType",
          al.field_name as "fieldName",
          al.old_value as "oldValue",
          al.new_value as "newValue",
          al.description,
          al.is_comment as "isComment",
          al.attachments,
          al.created_at as "createdAt"
        FROM activity_log al
        LEFT JOIN users u ON al.user_id = u.employee_id
        WHERE al.entity_type = $1 AND al.entity_id = $2
        ORDER BY al.created_at ${order}`,
        [entityType, entityId]
      ),
      15000,
      'Failed to fetch activity log entries'
    )

    // Convert is_comment from INTEGER (0/1) or BOOLEAN to boolean
    const result = rows.map(row => {
      const isCommentValue = row.isComment
      // PostgreSQL returns boolean as true/false, MySQL returns as 1/0
      // Ensure we always get a proper boolean
      const isCommentBoolean = isCommentValue === true || isCommentValue === 1 || isCommentValue === '1'

      console.log(`🔍 [ActivityLog] Row ${row.id}: isComment raw=${isCommentValue} (type: ${typeof isCommentValue}), converted=${isCommentBoolean}`)

      return {
        ...row,
        isComment: isCommentBoolean
      }
    }) as ActivityLog[]

    console.log(`✅ [ActivityLog] Fetched ${result.length} activities for ${entityType}:${entityId}`)
    console.log(`   Comments: ${result.filter(r => r.isComment).length}, Activities: ${result.filter(r => !r.isComment).length}`)

    return result
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
      query<any[]>(
        `SELECT
          al.id,
          al.entity_type as "entityType",
          al.entity_id as "entityId",
          al.user_id as "userId",
          u.name as "userName",
          al.action_type as "actionType",
          al.field_name as "fieldName",
          al.old_value as "oldValue",
          al.new_value as "newValue",
          al.description,
          al.is_comment as "isComment",
          al.attachments,
          al.created_at as "createdAt"
        FROM activity_log al
        LEFT JOIN users u ON al.user_id = u.employee_id
        WHERE al.entity_type = $1 AND al.entity_id = $2 AND al.is_comment = 1
        ORDER BY al.created_at ${order}`,
        [entityType, entityId]
      ),
      15000,
      'Failed to fetch comments'
    )

    // Convert is_comment from INTEGER (0/1) or BOOLEAN to boolean
    const result = rows.map(row => ({
      ...row,
      isComment: row.isComment === true || row.isComment === 1 || row.isComment === '1'
    })) as ActivityLog[]

    console.log(`✅ [ActivityLog] getCommentsByEntity: Fetched ${result.length} comments for ${entityType}:${entityId}`)

    return result
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
      query<any[]>(
        `SELECT
          al.id,
          al.entity_type as "entityType",
          al.entity_id as "entityId",
          al.user_id as "userId",
          u.name as "userName",
          al.action_type as "actionType",
          al.field_name as "fieldName",
          al.old_value as "oldValue",
          al.new_value as "newValue",
          al.description,
          al.is_comment as "isComment",
          al.attachments,
          al.created_at as "createdAt"
        FROM activity_log al
        LEFT JOIN users u ON al.user_id = u.employee_id
        WHERE al.entity_type = $1 AND al.entity_id = $2 AND al.is_comment = 0
        ORDER BY al.created_at ${order}`,
        [entityType, entityId]
      ),
      15000,
      'Failed to fetch system activities'
    )

    // Convert is_comment from INTEGER (0/1) or BOOLEAN to boolean
    const result = rows.map(row => ({
      ...row,
      isComment: row.isComment === true || row.isComment === 1 || row.isComment === '1'
    })) as ActivityLog[]

    console.log(`✅ [ActivityLog] getSystemActivitiesByEntity: Fetched ${result.length} system activities for ${entityType}:${entityId}`)

    return result
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
      query<any>(
        'DELETE FROM activity_log WHERE id = ? AND user_id = ? AND is_comment = 1',
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

    // Get old value
    const oldValue = oldEntity[key]

    // Normalize values for comparison (treat empty strings, null, and undefined as equivalent)
    const normalizeValue = (val: any): any => {
      // Handle strings - trim whitespace
      if (typeof val === 'string') {
        const trimmed = val.trim()
        return trimmed === '' ? null : trimmed
      }
      // Handle null/undefined
      if (val === null || val === undefined) {
        return null
      }
      // Handle arrays - deep comparison
      if (Array.isArray(val)) {
        return val.length === 0 ? null : val
      }
      // Handle objects - deep comparison
      if (typeof val === 'object') {
        return Object.keys(val).length === 0 ? null : val
      }
      return val
    }

    const normalizedOldValue = normalizeValue(oldValue)
    const normalizedNewValue = normalizeValue(newValue)

    // Skip if values are the same after normalization
    if (normalizedOldValue === normalizedNewValue) continue

    // Skip if both are null after normalization (empty string → null, etc.)
    if (normalizedOldValue === null && normalizedNewValue === null) continue

    // For arrays and objects, do deep comparison
    if (Array.isArray(normalizedOldValue) && Array.isArray(normalizedNewValue)) {
      if (JSON.stringify(normalizedOldValue) === JSON.stringify(normalizedNewValue)) continue
    }
    if (typeof normalizedOldValue === 'object' && typeof normalizedNewValue === 'object' &&
        normalizedOldValue !== null && normalizedNewValue !== null) {
      if (JSON.stringify(normalizedOldValue) === JSON.stringify(normalizedNewValue)) continue
    }

    // Get human-readable label
    const label = fieldLabels?.[key] || key

    // Determine action type
    let actionType = 'field_update'
    if (key === 'status') actionType = 'status_change'
    else if (key === 'assignedTo' || key === 'assigned_to') actionType = 'assignment_change'
    else if (key === 'priority') actionType = 'priority_change'
    else if (key === 'estimatedHours' || key === 'estimated_hours') actionType = 'estimated_hours_change'
    else if (key === 'actualHours' || key === 'actual_hours') actionType = 'time_logged'

    // Format values for display (use normalized values)
    const oldValueStr = normalizedOldValue !== null ? String(normalizedOldValue) : null
    const newValueStr = normalizedNewValue !== null ? String(normalizedNewValue) : null

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

