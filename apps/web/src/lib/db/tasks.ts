// MySQL Tasks Service
// Server-side only - do not use 'use client'

import { query, queryOne, withRetry } from './config'
import { Task } from '../types'
interface TaskRow  {
  id: number
  task_id: string
  internal_id: string
  select_type: string
  recursive_type: string | null
  description: string
  assigned_to: string
  assigned_by: string
  support: string
  start_date: string
  end_date: string
  priority: string
  estimated_hours: number
  actual_hours: number
  daily_hours: string
  status: string
  remarks: string | null
  difficulties: string | null
  related_tasks: string | null
  project_id: string | null
  deleted_at: string | null
  deleted_by: string | null
  timer_state: string | null
  timer_start_time: string | null
  timer_paused_time: number | null
  timer_total_time: number | null
  timer_sessions: string | null
  created_at: string
  updated_at: string
}

// Convert database row to Task object
function rowToTask(row: TaskRow): Task {
  // Safely parse support field
  // MySQL2 auto-parses JSON fields, so row.support might be:
  // - Already an array (MySQL2 auto-parsed)
  // - A JSON string (needs parsing)
  // - null/undefined (needs default)
  let support: string[] = []

  try {
    if (!row.support) {
      // null or undefined
      support = []
    } else if (Array.isArray(row.support)) {
      // Already parsed by MySQL2
      support = row.support
    } else if (typeof row.support === 'string') {
      // String that needs parsing
      const trimmed = row.support.trim()
      if (trimmed === '' || trimmed === 'null') {
        support = []
      } else {
        support = JSON.parse(trimmed)
      }
    } else {
      // Unknown type, log and default to empty
      console.warn('Unexpected support field type for task:', row.task_id, 'Type:', typeof row.support, 'Value:', row.support)
      support = []
    }
  } catch (error) {
    console.error('Failed to parse support field for task:', row.task_id, 'Value:', row.support, 'Error:', error)
    support = []
  }

  return {
    id: row.internal_id,
    taskId: row.task_id,
    selectType: row.select_type as Task['selectType'],
    recursiveType: row.recursive_type as Task['recursiveType'],
    description: row.description,
    assignedTo: row.assigned_to,
    assignedBy: row.assigned_by,
    support: support,
    startDate: row.start_date,
    endDate: row.end_date,
    priority: row.priority as Task['priority'],
    estimatedHours: row.estimated_hours,
    actualHours: row.actual_hours || undefined,
    dailyHours: row.daily_hours || '{}',
    status: row.status as Task['status'],
    remarks: row.remarks || undefined,
    difficulties: row.difficulties || undefined,
    relatedTasks: row.related_tasks || undefined,
    projectId: row.project_id || undefined,
    deletedAt: row.deleted_at || undefined,
    deletedBy: row.deleted_by || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// Get all tasks
export async function getAllTasks(): Promise<Task[]> {
  return withRetry(async () => {
    const rows = await query<TaskRow[]>(
      'SELECT * FROM tasks ORDER BY created_at DESC'
    )
    return rows.map(rowToTask)
  })
}

// Get task by ID
export async function getTaskById(id: string): Promise<Task | null> {
  return withRetry(async () => {
    const row = await queryOne<TaskRow>(
      'SELECT * FROM tasks WHERE internal_id = $1 OR task_id = $2',
      [id, id]
    )
    return row ? rowToTask(row) : null
  })
}

// Get tasks by employee ID
export async function getTasksByEmployeeId(employee_id: string): Promise<Task[]> {
  return withRetry(async () => {
    const rows = await query<TaskRow[]>(
      'SELECT * FROM tasks WHERE assigned_to = $1 ORDER BY created_at DESC',
      [employee_id]
    )
    return rows.map(rowToTask)
  })
}

// Get tasks assigned by employee ID
export async function getTasksAssignedBy(employee_id: string): Promise<Task[]> {
  return withRetry(async () => {
    const rows = await query<TaskRow[]>(
      'SELECT * FROM tasks WHERE assigned_by = $1 ORDER BY created_at DESC',
      [employee_id]
    )
    return rows.map(rowToTask)
  })
}

// Get tasks by status
export async function getTasksByStatus(status: Task['status']): Promise<Task[]> {
  return withRetry(async () => {
    const rows = await query<TaskRow[]>(
      'SELECT * FROM tasks WHERE status = $1 ORDER BY created_at DESC',
      [status]
    )
    return rows.map(rowToTask)
  })
}

// Get tasks by date range
export async function getTasksByDateRange(start_date: string, endDate: string): Promise<Task[]> {
  return withRetry(async () => {
    const rows = await query<TaskRow[]>(
      'SELECT * FROM tasks WHERE start_date >= $1 AND end_date <= $2 ORDER BY start_date',
      [start_date, endDate]
    )
    return rows.map(rowToTask)
  })
}

// Get support tasks for employee
export async function getSupportTasksForEmployee(employee_id: string): Promise<Task[]> {
  return withRetry(async () => {
    const rows = await query<TaskRow[]>(
      'SELECT * FROM tasks WHERE JSON_CONTAINS(support, $1) ORDER BY created_at DESC',
      [JSON.stringify(employee_id)]
    )
    return rows.map(rowToTask)
  })
}

// Get tasks by project ID
export async function getTasksByProject(project_id: string): Promise<Task[]> {
  return withRetry(async () => {
    const rows = await query<TaskRow[]>(
      'SELECT * FROM tasks WHERE project_id = $1 ORDER BY created_at DESC',
      [project_id]
    )
    return rows.map(rowToTask)
  })
}

// Get the latest task ID for sequential ID generation
export async function getLatestTaskId(): Promise<string | undefined> {
  return withRetry(async () => {
    const rows = await query<any[]>(
      `SELECT task_id FROM tasks
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`
    )
    return rows.length > 0 ? rows[0].task_id : undefined
  })
}

// Create a new task
export async function createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
  return withRetry(async () => {
    await query<any>(
      `INSERT INTO tasks (
        internal_id, task_id, select_type, recursive_type, description,
        assigned_to, assigned_by, support, start_date, end_date, priority,
        estimated_hours, actual_hours, daily_hours, status, remarks,
        difficulties, project_id, department
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
      [
        task.taskId, // internal_id is same as task_id
        task.taskId,
        task.selectType,
        task.recursiveType || null,
        task.description,
        task.assignedTo,
        task.assignedBy,
        JSON.stringify(task.support || []),
        task.startDate,
        task.endDate,
        task.priority,
        task.estimatedHours,
        task.actualHours || 0,
        task.dailyHours || '{}',
        task.status,
        task.remarks || null,
        task.difficulties || null,
        task.projectId || null,
        (task as any).department || null
      ]
    )

    const createdTask = await getTaskById(task.taskId)
    if (!createdTask) {
      throw new Error('Failed to retrieve created task')
    }
    return createdTask
  })
}

// Update task
export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  return withRetry(async () => {
    const fields: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex++}`)
      values.push(updates.description)
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex++}`)
      values.push(updates.status)
    }
    if (updates.priority !== undefined) {
      fields.push(`priority = $${paramIndex++}`)
      values.push(updates.priority)
    }
    if (updates.estimatedHours !== undefined) {
      fields.push(`estimated_hours = $${paramIndex++}`)
      values.push(updates.estimatedHours)
    }
    if (updates.actualHours !== undefined) {
      fields.push(`actual_hours = $${paramIndex++}`)
      values.push(updates.actualHours)
    }
    if (updates.dailyHours !== undefined) {
      fields.push(`daily_hours = $${paramIndex++}`)
      values.push(updates.dailyHours)
    }
    if (updates.remarks !== undefined) {
      fields.push(`remarks = $${paramIndex++}`)
      values.push(updates.remarks || null)
    }
    if (updates.difficulties !== undefined) {
      fields.push(`difficulties = $${paramIndex++}`)
      values.push(updates.difficulties || null)
    }
    if (updates.support !== undefined) {
      fields.push(`support = $${paramIndex++}`)
      values.push(JSON.stringify(updates.support))
    }
    if (updates.startDate !== undefined) {
      fields.push(`start_date = $${paramIndex++}`)
      values.push(updates.startDate)
    }
    if (updates.endDate !== undefined) {
      fields.push(`end_date = $${paramIndex++}`)
      values.push(updates.endDate)
    }
    if (updates.timerState !== undefined) {
      fields.push(`timer_state = $${paramIndex++}`)
      values.push(updates.timerState)
    }
    if (updates.timerStartTime !== undefined) {
      fields.push(`timer_start_time = $${paramIndex++}`)
      values.push(updates.timerStartTime)
    }
    if (updates.timerPausedTime !== undefined) {
      fields.push(`timer_paused_time = $${paramIndex++}`)
      values.push(updates.timerPausedTime)
    }
    if (updates.timerTotalTime !== undefined) {
      fields.push(`timer_total_time = $${paramIndex++}`)
      values.push(updates.timerTotalTime)
    }
    if (updates.timerSessions !== undefined) {
      fields.push(`timer_sessions = $${paramIndex++}`)
      values.push(updates.timerSessions)
    }
    if ((updates as any).department !== undefined) {
      fields.push(`department = $${paramIndex++}`)
      values.push((updates as any).department || null)
    }

    if (fields.length === 0) {
      const task = await getTaskById(id)
      if (!task) throw new Error('Task not found')
      return task
    }

    values.push(id, id)
    await query(
      `UPDATE tasks SET ${fields.join(', ')} WHERE internal_id = $${paramIndex++} OR task_id = $${paramIndex}`,
      values
    )

    const updatedTask = await getTaskById(id)
    if (!updatedTask) {
      throw new Error('Failed to retrieve updated task')
    }
    return updatedTask
  })
}

// Delete task
export async function deleteTask(id: string): Promise<boolean> {
  return withRetry(async () => {
    const result = await query<any>(
      'DELETE FROM tasks WHERE internal_id = $1 OR task_id = $2',
      [id, id]
    )
    return result.affectedRows > 0
  })
}

// Get delayed tasks
export async function getDelayedTasks(): Promise<Task[]> {
  return withRetry(async () => {
    const rows = await query<TaskRow[]>(
      `SELECT * FROM tasks
       WHERE status = 'Delayed'
       OR (status IN ('Yet to Start', 'In Progress') AND end_date < CURRENT_DATE)
       ORDER BY end_date`
    )
    return rows.map(rowToTask)
  })
}

