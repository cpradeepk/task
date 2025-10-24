// MySQL Tasks Service
// Server-side only - do not use 'use client'

import { query, queryOne, withRetry } from './config'
import { Task } from '../types'
import { RowDataPacket, ResultSetHeader } from 'mysql2'

interface TaskRow extends RowDataPacket {
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
  sub_task: string | null
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
  let support: string[] = []
  try {
    const supportValue = row.support || '[]'
    // Handle empty string or whitespace
    if (supportValue.trim() === '') {
      support = []
    } else {
      support = JSON.parse(supportValue)
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
    subTask: row.sub_task || undefined,
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
      'SELECT * FROM tasks WHERE internal_id = ? OR task_id = ?',
      [id, id]
    )
    return row ? rowToTask(row) : null
  })
}

// Get tasks by employee ID
export async function getTasksByEmployeeId(employeeId: string): Promise<Task[]> {
  return withRetry(async () => {
    const rows = await query<TaskRow[]>(
      'SELECT * FROM tasks WHERE assigned_to = ? ORDER BY created_at DESC',
      [employeeId]
    )
    return rows.map(rowToTask)
  })
}

// Get tasks assigned by employee ID
export async function getTasksAssignedBy(employeeId: string): Promise<Task[]> {
  return withRetry(async () => {
    const rows = await query<TaskRow[]>(
      'SELECT * FROM tasks WHERE assigned_by = ? ORDER BY created_at DESC',
      [employeeId]
    )
    return rows.map(rowToTask)
  })
}

// Get tasks by status
export async function getTasksByStatus(status: Task['status']): Promise<Task[]> {
  return withRetry(async () => {
    const rows = await query<TaskRow[]>(
      'SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC',
      [status]
    )
    return rows.map(rowToTask)
  })
}

// Get tasks by date range
export async function getTasksByDateRange(startDate: string, endDate: string): Promise<Task[]> {
  return withRetry(async () => {
    const rows = await query<TaskRow[]>(
      'SELECT * FROM tasks WHERE start_date >= ? AND end_date <= ? ORDER BY start_date',
      [startDate, endDate]
    )
    return rows.map(rowToTask)
  })
}

// Get support tasks for employee
export async function getSupportTasksForEmployee(employeeId: string): Promise<Task[]> {
  return withRetry(async () => {
    const rows = await query<TaskRow[]>(
      'SELECT * FROM tasks WHERE JSON_CONTAINS(support, ?) ORDER BY created_at DESC',
      [JSON.stringify(employeeId)]
    )
    return rows.map(rowToTask)
  })
}

// Create a new task
export async function createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
  return withRetry(async () => {
    await query<ResultSetHeader>(
      `INSERT INTO tasks (
        internal_id, task_id, select_type, recursive_type, description,
        assigned_to, assigned_by, support, start_date, end_date, priority,
        estimated_hours, actual_hours, daily_hours, status, remarks,
        difficulties, sub_task
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        task.subTask || null
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

    if (updates.description !== undefined) {
      fields.push('description = ?')
      values.push(updates.description)
    }
    if (updates.status !== undefined) {
      fields.push('status = ?')
      values.push(updates.status)
    }
    if (updates.priority !== undefined) {
      fields.push('priority = ?')
      values.push(updates.priority)
    }
    if (updates.estimatedHours !== undefined) {
      fields.push('estimated_hours = ?')
      values.push(updates.estimatedHours)
    }
    if (updates.actualHours !== undefined) {
      fields.push('actual_hours = ?')
      values.push(updates.actualHours)
    }
    if (updates.dailyHours !== undefined) {
      fields.push('daily_hours = ?')
      values.push(updates.dailyHours)
    }
    if (updates.remarks !== undefined) {
      fields.push('remarks = ?')
      values.push(updates.remarks || null)
    }
    if (updates.difficulties !== undefined) {
      fields.push('difficulties = ?')
      values.push(updates.difficulties || null)
    }
    if (updates.subTask !== undefined) {
      fields.push('sub_task = ?')
      values.push(updates.subTask || null)
    }
    if (updates.support !== undefined) {
      fields.push('support = ?')
      values.push(JSON.stringify(updates.support))
    }
    if (updates.startDate !== undefined) {
      fields.push('start_date = ?')
      values.push(updates.startDate)
    }
    if (updates.endDate !== undefined) {
      fields.push('end_date = ?')
      values.push(updates.endDate)
    }

    if (fields.length === 0) {
      const task = await getTaskById(id)
      if (!task) throw new Error('Task not found')
      return task
    }

    values.push(id, id)
    await query(
      `UPDATE tasks SET ${fields.join(', ')} WHERE internal_id = ? OR task_id = ?`,
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
    const result = await query<ResultSetHeader>(
      'DELETE FROM tasks WHERE internal_id = ? OR task_id = ?',
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
       OR (status IN ('Yet to Start', 'In Progress') AND end_date < CURDATE())
       ORDER BY end_date`
    )
    return rows.map(rowToTask)
  })
}

