// MySQL User Service
// Server-side only - do not use 'use client'

import { query, queryOne, withRetry } from './config'
import { User } from '../types'
interface UserRow  {
  id: number
  employee_id: string
  name: string
  email: string
  phone: string
  telegram_token: string | null
  department: string
  manager_email: string | null
  manager_id: string | null
  is_today_task: number
  warning_count: number
  role: string
  password: string
  status: string
  hours_log: string | null
  created_at: string
  updated_at: string
}

// Convert database row to User object
function rowToUser(row: UserRow): User {
  return {
    employeeId: row.employee_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    telegramToken: row.telegram_token || undefined,
    department: row.department,
    managerEmail: row.manager_email || undefined,
    managerId: row.manager_id || undefined,
    isTodayTask: Boolean(row.is_today_task),
    warningCount: row.warning_count,
    role: row.role as User['role'],
    password: row.password,
    status: row.status as User['status'],
    hoursLog: row.hours_log || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// Get all users
export async function getAllUsers(): Promise<User[]> {
  return withRetry(async () => {
    const rows = await query<UserRow[]>(
      'SELECT * FROM users WHERE status = $1 ORDER BY name',
      ['active']
    )
    return rows.map(rowToUser)
  })
}

// Get user by employee ID
export async function getUserByEmployeeId(employeeId: string): Promise<User | null> {
  return withRetry(async () => {
    const row = await queryOne<UserRow>(
      'SELECT * FROM users WHERE employee_id = $1',
      [employeeId]
    )
    return row ? rowToUser(row) : null
  })
}

// Get user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  return withRetry(async () => {
    const row = await queryOne<UserRow>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )
    return row ? rowToUser(row) : null
  })
}

// Get users by manager ID
export async function getUsersByManagerId(managerId: string): Promise<User[]> {
  return withRetry(async () => {
    const rows = await query<UserRow[]>(
      'SELECT * FROM users WHERE manager_id = $1 AND status = $2 ORDER BY name',
      [managerId, 'active']
    )
    return rows.map(rowToUser)
  })
}

// Get users by department
export async function getUsersByDepartment(department: string): Promise<User[]> {
  return withRetry(async () => {
    const rows = await query<UserRow[]>(
      'SELECT * FROM users WHERE department = $1 AND status = $2 ORDER BY name',
      [department, 'active']
    )
    return rows.map(rowToUser)
  })
}

// Get users by a list of employee IDs (batch)
export async function getUsersByEmployeeIds(employeeIds: string[]): Promise<User[]> {
  return withRetry(async () => {
    if (!employeeIds || employeeIds.length === 0) return []
    // Deduplicate IDs to avoid SQL errors and reduce result size
    const ids = Array.from(new Set(employeeIds)).filter(Boolean)
    if (ids.length === 0) return []

    const placeholders = ids.map(() => '$1').join(',')
    const rows = await query<UserRow[]>(
      `SELECT * FROM users WHERE employee_id IN (${placeholders}) AND status = $1 ORDER BY name`,
      [...ids, 'active']
    )
    return rows.map(rowToUser)
  })
}

// Create a new user
export async function createUser(user: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User> {
  return withRetry(async () => {
    const result = await query<any>(
      `INSERT INTO users (
        employee_id, name, email, phone, telegram_token, department,
        manager_email, manager_id, is_today_task, warning_count, role,
        password, status, hours_log
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.employeeId,
        user.name,
        user.email,
        user.phone,
        user.telegramToken || null,
        user.department,
        user.managerEmail || null,
        user.managerId || null,
        user.isTodayTask ? 1 : 0,
        user.warningCount,
        user.role,
        user.password,
        user.status,
        user.hoursLog || null
      ]
    )

    const createdUser = await getUserByEmployeeId(user.employeeId)
    if (!createdUser) {
      throw new Error('Failed to retrieve created user')
    }
    return createdUser
  })
}

// Update user
export async function updateUser(employeeId: string, updates: Partial<User>): Promise<User> {
  return withRetry(async () => {
    // Check if user is system admin
    const user = await getUserByEmployeeId(employeeId)
    if (user && user.employeeId === 'admin-001') {
      // System admin can only update certain fields (not role or status)
      if (updates.role !== undefined && updates.role !== 'admin') {
        throw new Error('Cannot change system admin role')
      }
      if (updates.status !== undefined && updates.status !== 'active') {
        throw new Error('Cannot deactivate system admin')
      }
    }

    const fields: string[] = []
    const values: any[] = []

    if (updates.name !== undefined) {
      fields.push('name = ?')
      values.push(updates.name)
    }
    if (updates.email !== undefined) {
      fields.push('email = ?')
      values.push(updates.email)
    }
    if (updates.phone !== undefined) {
      fields.push('phone = ?')
      values.push(updates.phone)
    }
    if (updates.telegramToken !== undefined) {
      fields.push('telegram_token = ?')
      values.push(updates.telegramToken || null)
    }
    if (updates.department !== undefined) {
      fields.push('department = ?')
      values.push(updates.department)
    }
    if (updates.managerEmail !== undefined) {
      fields.push('manager_email = ?')
      values.push(updates.managerEmail || null)
    }
    if (updates.managerId !== undefined) {
      fields.push('manager_id = ?')
      values.push(updates.managerId || null)
    }
    if (updates.isTodayTask !== undefined) {
      fields.push('is_today_task = ?')
      values.push(updates.isTodayTask ? 1 : 0)
    }
    if (updates.warningCount !== undefined) {
      fields.push('warning_count = ?')
      values.push(updates.warningCount)
    }
    if (updates.role !== undefined) {
      fields.push('role = ?')
      values.push(updates.role)
    }
    if (updates.password !== undefined) {
      fields.push('password = ?')
      values.push(updates.password)
    }
    if (updates.status !== undefined) {
      fields.push('status = ?')
      values.push(updates.status)
    }
    if (updates.hoursLog !== undefined) {
      fields.push('hours_log = ?')
      values.push(updates.hoursLog || null)
    }

    if (fields.length === 0) {
      const user = await getUserByEmployeeId(employeeId)
      if (!user) throw new Error('User not found')
      return user
    }

    values.push(employeeId)
    await query(
      `UPDATE users SET ${fields.join(', ')} WHERE employee_id = $1`,
      values
    )

    const updatedUser = await getUserByEmployeeId(employeeId)
    if (!updatedUser) {
      throw new Error('Failed to retrieve updated user')
    }
    return updatedUser
  })
}

// Delete user (soft delete by setting status to inactive)
export async function deleteUser(employeeId: string): Promise<boolean> {
  return withRetry(async () => {
    // Prevent deletion of system admin
    if (employeeId === 'admin-001') {
      throw new Error('Cannot delete system admin user')
    }

    const result = await query<any>(
      'UPDATE users SET status = $1 WHERE employee_id = $2',
      ['inactive', employeeId]
    )
    return result.affectedRows > 0
  })
}

// Increment warning count
export async function incrementWarningCount(employeeId: string): Promise<User> {
  return withRetry(async () => {
    await query(
      'UPDATE users SET warning_count = warning_count + 1 WHERE employee_id = $1',
      [employeeId]
    )
    const user = await getUserByEmployeeId(employeeId)
    if (!user) throw new Error('User not found')
    return user
  })
}

// Reset warning count
export async function resetWarningCount(employeeId: string): Promise<User> {
  return withRetry(async () => {
    await query(
      'UPDATE users SET warning_count = 0 WHERE employee_id = $1',
      [employeeId]
    )
    const user = await getUserByEmployeeId(employeeId)
    if (!user) throw new Error('User not found')
    return user
  })
}

// Authenticate user by employee ID
export async function authenticateUser(employeeId: string, password: string): Promise<User | null> {
  return withRetry(async () => {
    const row = await queryOne<UserRow>(
      'SELECT * FROM users WHERE employee_id = $1 AND password = $2 AND status = $3',
      [employeeId, password, 'active']
    )
    return row ? rowToUser(row) : null
  })
}

