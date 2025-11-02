/**
 * Database operations for permissions management
 */

import { query } from './config'

export interface RolePermission {
  id: number
  role: 'admin' | 'top_management' | 'management' | 'employee'
  featureKey: string
  featureName: string
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canApprove: boolean
  createdAt: string
  updatedAt: string
}

export interface UserPermission {
  id: number
  employeeId: string
  featureKey: string
  canView: boolean | null
  canCreate: boolean | null
  canEdit: boolean | null
  canDelete: boolean | null
  canApprove: boolean | null
  createdAt: string
  updatedAt: string
}

export interface Permission {
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canApprove: boolean
}

interface RolePermissionRow {
  id: number
  role: string
  feature_key: string
  feature_name: string
  can_view: number
  can_create: number
  can_edit: number
  can_delete: number
  can_approve: number
  created_at: Date
  updated_at: Date
}

interface UserPermissionRow {
  id: number
  employee_id: string
  feature_key: string
  can_view: number | null
  can_create: number | null
  can_edit: number | null
  can_delete: number | null
  can_approve: number | null
  created_at: Date
  updated_at: Date
}

/**
 * Get all role permissions
 */
export async function getAllRolePermissions(): Promise<RolePermission[]> {
  const rows = await query<RolePermissionRow[]>(
    `SELECT * FROM role_permissions ORDER BY role, feature_key`
  )

  return rows.map(row => ({
    id: row.id,
    role: row.role as any,
    featureKey: row.feature_key,
    featureName: row.feature_name,
    canView: Boolean(row.can_view),
    canCreate: Boolean(row.can_create),
    canEdit: Boolean(row.can_edit),
    canDelete: Boolean(row.can_delete),
    canApprove: Boolean(row.can_approve),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  }))
}

/**
 * Get role permissions for a specific role
 */
export async function getRolePermissions(role: string): Promise<RolePermission[]> {
  const rows = await query<RolePermissionRow[]>(
    `SELECT * FROM role_permissions WHERE role = $1 ORDER BY feature_key`,
    [role]
  )

  return rows.map(row => ({
    id: row.id,
    role: row.role as any,
    featureKey: row.feature_key,
    featureName: row.feature_name,
    canView: Boolean(row.can_view),
    canCreate: Boolean(row.can_create),
    canEdit: Boolean(row.can_edit),
    canDelete: Boolean(row.can_delete),
    canApprove: Boolean(row.can_approve),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  }))
}

/**
 * Get user-specific permission overrides
 */
export async function getUserPermissions(employeeId: string): Promise<UserPermission[]> {
  const rows = await query<UserPermissionRow[]>(
    `SELECT * FROM user_permissions WHERE employee_id = $1 ORDER BY feature_key`,
    [employeeId]
  )

  return rows.map(row => ({
    id: row.id,
    employeeId: row.employee_id,
    featureKey: row.feature_key,
    canView: row.can_view === null ? null : Boolean(row.can_view),
    canCreate: row.can_create === null ? null : Boolean(row.can_create),
    canEdit: row.can_edit === null ? null : Boolean(row.can_edit),
    canDelete: row.can_delete === null ? null : Boolean(row.can_delete),
    canApprove: row.can_approve === null ? null : Boolean(row.can_approve),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  }))
}

/**
 * Get effective permissions for a user (role + user overrides)
 */
export async function getEffectivePermissions(
  employeeId: string,
  role: string,
  featureKey: string
): Promise<Permission> {
  // Get role permission
  const rolePerms = await query<RolePermissionRow[]>(
    `SELECT * FROM role_permissions WHERE role = $1 AND feature_key = $2 LIMIT 1`,
    [role, featureKey]
  )

  // Default to no permissions if role permission not found
  let permission: Permission = {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canApprove: false
  }

  if (rolePerms.length > 0) {
    permission = {
      canView: Boolean(rolePerms[0].can_view),
      canCreate: Boolean(rolePerms[0].can_create),
      canEdit: Boolean(rolePerms[0].can_edit),
      canDelete: Boolean(rolePerms[0].can_delete),
      canApprove: Boolean(rolePerms[0].can_approve)
    }
  }

  // Get user-specific overrides
  const userPerms = await query<UserPermissionRow[]>(
    `SELECT * FROM user_permissions WHERE employee_id = $1 AND feature_key = $2 LIMIT 1`,
    [employeeId, featureKey]
  )

  // Apply user overrides (NULL means use role permission)
  if (userPerms.length > 0) {
    const override = userPerms[0]
    if (override.can_view !== null) permission.canView = Boolean(override.can_view)
    if (override.can_create !== null) permission.canCreate = Boolean(override.can_create)
    if (override.can_edit !== null) permission.canEdit = Boolean(override.can_edit)
    if (override.can_delete !== null) permission.canDelete = Boolean(override.can_delete)
    if (override.can_approve !== null) permission.canApprove = Boolean(override.can_approve)
  }

  return permission
}

/**
 * Update role permission
 */
export async function updateRolePermission(
  role: string,
  featureKey: string,
  permissions: Partial<Permission>
): Promise<void> {
  const updates: string[] = []
  const values: any[] = []

  if (permissions.canView !== undefined) {
    updates.push('can_view = ?')
    values.push(permissions.canView)
  }
  if (permissions.canCreate !== undefined) {
    updates.push('can_create = ?')
    values.push(permissions.canCreate)
  }
  if (permissions.canEdit !== undefined) {
    updates.push('can_edit = ?')
    values.push(permissions.canEdit)
  }
  if (permissions.canDelete !== undefined) {
    updates.push('can_delete = ?')
    values.push(permissions.canDelete)
  }
  if (permissions.canApprove !== undefined) {
    updates.push('can_approve = ?')
    values.push(permissions.canApprove)
  }

  if (updates.length === 0) return

  values.push(role, featureKey)

  await query(
    `UPDATE role_permissions SET ${updates.join(', ')} WHERE role = $1 AND feature_key = $2`,
    values
  )
}

/**
 * Set user permission override
 */
export async function setUserPermission(
  employeeId: string,
  featureKey: string,
  permissions: Partial<Permission>
): Promise<void> {
  // Check if user permission override exists
  const existing = await query<UserPermissionRow[]>(
    `SELECT id FROM user_permissions WHERE employee_id = $1 AND feature_key = $2 LIMIT 1`,
    [employeeId, featureKey]
  )

  if (existing.length > 0) {
    // Update existing override
    const updates: string[] = []
    const values: any[] = []

    if (permissions.canView !== undefined) {
      updates.push('can_view = ?')
      values.push(permissions.canView)
    }
    if (permissions.canCreate !== undefined) {
      updates.push('can_create = ?')
      values.push(permissions.canCreate)
    }
    if (permissions.canEdit !== undefined) {
      updates.push('can_edit = ?')
      values.push(permissions.canEdit)
    }
    if (permissions.canDelete !== undefined) {
      updates.push('can_delete = ?')
      values.push(permissions.canDelete)
    }
    if (permissions.canApprove !== undefined) {
      updates.push('can_approve = ?')
      values.push(permissions.canApprove)
    }

    if (updates.length === 0) return

    values.push(employeeId, featureKey)

    await query(
      `UPDATE user_permissions SET ${updates.join(', ')} WHERE employee_id = $1 AND feature_key = $2`,
      values
    )
  } else {
    // Insert new override
    await query(
      `INSERT INTO user_permissions (employee_id, feature_key, can_view, can_create, can_edit, can_delete, can_approve)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        employeeId,
        featureKey,
        permissions.canView ?? null,
        permissions.canCreate ?? null,
        permissions.canEdit ?? null,
        permissions.canDelete ?? null,
        permissions.canApprove ?? null
      ]
    )
  }
}

/**
 * Remove user permission override (revert to role permission)
 */
export async function removeUserPermission(employeeId: string, featureKey: string): Promise<void> {
  await query(
    `DELETE FROM user_permissions WHERE employee_id = $1 AND feature_key = $2`,
    [employeeId, featureKey]
  )
}

/**
 * Get all users with permission overrides
 */
export async function getUsersWithPermissionOverrides(): Promise<string[]> {
  const rows = await query<{ employee_id: string }[]>(
    `SELECT DISTINCT employee_id FROM user_permissions ORDER BY employee_id`
  )

  return rows.map(row => row.employee_id)
}

