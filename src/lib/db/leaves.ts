// MySQL Leave Applications Service
// Server-side only - do not use 'use client'

import { query, queryOne, withRetry } from './config'
import { LeaveApplication } from '../types'
import { RowDataPacket, ResultSetHeader } from 'mysql2'

interface LeaveRow extends RowDataPacket {
  id: number
  application_id: string
  employee_id: string
  employee_name: string
  leave_type: string
  reason: string
  from_date: string
  to_date: string
  is_half_day: number
  emergency_contact: string | null
  status: string
  manager_id: string | null
  approved_by: string | null
  approval_date: string | null
  approval_remarks: string | null
  created_at: string
  updated_at: string
}

// Convert database row to LeaveApplication object
function rowToLeave(row: LeaveRow): LeaveApplication {
  return {
    id: row.application_id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    leaveType: row.leave_type as LeaveApplication['leaveType'],
    reason: row.reason,
    fromDate: row.from_date,
    toDate: row.to_date,
    isHalfDay: Boolean(row.is_half_day),
    emergencyContact: row.emergency_contact || undefined,
    status: row.status as LeaveApplication['status'],
    managerId: row.manager_id || undefined,
    approvedBy: row.approved_by || undefined,
    approvalDate: row.approval_date || undefined,
    approvalRemarks: row.approval_remarks || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// Get all leave applications
export async function getAllLeaves(): Promise<LeaveApplication[]> {
  return withRetry(async () => {
    const rows = await query<LeaveRow[]>(
      'SELECT * FROM leave_applications ORDER BY created_at DESC'
    )
    return rows.map(rowToLeave)
  })
}

// Get leave by ID
export async function getLeaveById(id: string): Promise<LeaveApplication | null> {
  return withRetry(async () => {
    const row = await queryOne<LeaveRow>(
      'SELECT * FROM leave_applications WHERE application_id = ?',
      [id]
    )
    return row ? rowToLeave(row) : null
  })
}

// Get leaves by employee ID
export async function getLeavesByEmployeeId(employeeId: string): Promise<LeaveApplication[]> {
  return withRetry(async () => {
    const rows = await query<LeaveRow[]>(
      'SELECT * FROM leave_applications WHERE employee_id = ? ORDER BY created_at DESC',
      [employeeId]
    )
    return rows.map(rowToLeave)
  })
}

// Get leaves by manager ID
export async function getLeavesByManagerId(managerId: string): Promise<LeaveApplication[]> {
  return withRetry(async () => {
    const rows = await query<LeaveRow[]>(
      'SELECT * FROM leave_applications WHERE manager_id = ? ORDER BY created_at DESC',
      [managerId]
    )
    return rows.map(rowToLeave)
  })
}

// Get leaves by status
export async function getLeavesByStatus(status: LeaveApplication['status']): Promise<LeaveApplication[]> {
  return withRetry(async () => {
    const rows = await query<LeaveRow[]>(
      'SELECT * FROM leave_applications WHERE status = ? ORDER BY created_at DESC',
      [status]
    )
    return rows.map(rowToLeave)
  })
}

// Get pending leaves for manager
export async function getPendingLeavesForManager(managerId: string): Promise<LeaveApplication[]> {
  return withRetry(async () => {
    const rows = await query<LeaveRow[]>(
      'SELECT * FROM leave_applications WHERE manager_id = ? AND status = ? ORDER BY created_at',
      [managerId, 'Pending']
    )
    return rows.map(rowToLeave)
  })
}

// Create leave application
export async function createLeave(leave: Omit<LeaveApplication, 'createdAt' | 'updatedAt'>): Promise<LeaveApplication> {
  return withRetry(async () => {
    await query<ResultSetHeader>(
      `INSERT INTO leave_applications (
        application_id, employee_id, employee_name, leave_type, reason,
        from_date, to_date, is_half_day, emergency_contact, status,
        manager_id, approved_by, approval_date, approval_remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        leave.id,
        leave.employeeId,
        leave.employeeName,
        leave.leaveType,
        leave.reason,
        leave.fromDate,
        leave.toDate,
        leave.isHalfDay ? 1 : 0,
        leave.emergencyContact || null,
        leave.status,
        leave.managerId || null,
        leave.approvedBy || null,
        leave.approvalDate || null,
        leave.approvalRemarks || null
      ]
    )

    const createdLeave = await getLeaveById(leave.id)
    if (!createdLeave) {
      throw new Error('Failed to retrieve created leave application')
    }
    return createdLeave
  })
}

// Update leave application
export async function updateLeave(id: string, updates: Partial<LeaveApplication>): Promise<LeaveApplication> {
  return withRetry(async () => {
    const fields: string[] = []
    const values: any[] = []

    if (updates.status !== undefined) {
      fields.push('status = ?')
      values.push(updates.status)
    }
    if (updates.approvedBy !== undefined) {
      fields.push('approved_by = ?')
      values.push(updates.approvedBy || null)
    }
    if (updates.approvalDate !== undefined) {
      fields.push('approval_date = ?')
      values.push(updates.approvalDate || null)
    }
    if (updates.approvalRemarks !== undefined) {
      fields.push('approval_remarks = ?')
      values.push(updates.approvalRemarks || null)
    }

    if (fields.length === 0) {
      const leave = await getLeaveById(id)
      if (!leave) throw new Error('Leave application not found')
      return leave
    }

    values.push(id)
    await query(
      `UPDATE leave_applications SET ${fields.join(', ')} WHERE application_id = ?`,
      values
    )

    const updatedLeave = await getLeaveById(id)
    if (!updatedLeave) {
      throw new Error('Failed to retrieve updated leave application')
    }
    return updatedLeave
  })
}

// Approve leave
export async function approveLeave(id: string, approvedBy: string, remarks?: string): Promise<LeaveApplication> {
  return updateLeave(id, {
    status: 'Approved',
    approvedBy,
    approvalDate: new Date().toISOString(),
    approvalRemarks: remarks
  })
}

// Reject leave
export async function rejectLeave(id: string, rejectedBy: string, remarks?: string): Promise<LeaveApplication> {
  return updateLeave(id, {
    status: 'Rejected',
    approvedBy: rejectedBy,
    approvalDate: new Date().toISOString(),
    approvalRemarks: remarks
  })
}

// Delete leave application
export async function deleteLeave(id: string): Promise<boolean> {
  return withRetry(async () => {
    const result = await query<ResultSetHeader>(
      'DELETE FROM leave_applications WHERE application_id = ?',
      [id]
    )
    return result.affectedRows > 0
  })
}

