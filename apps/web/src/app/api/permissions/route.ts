/**
 * API Route: /api/permissions
 * Purpose: Manage role-based and user-specific permissions
 * Methods: GET, POST
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { canAdminCompany } from '@/lib/authz'
import {
  getAllRolePermissions,
  getRolePermissions,
  getUserPermissions,
  getEffectivePermissions,
  updateRolePermission,
  setUserPermission,
  removeUserPermission,
  getUsersWithPermissionOverrides
} from '@/lib/db/permissions'

/**
 * GET /api/permissions
 * Query params:
 * - type: 'role' | 'user' | 'effective' | 'all'
 * - role: role name (for type=role or type=effective)
 * - employeeId: employee ID (for type=user or type=effective)
 * - featureKey: feature key (for type=effective)
 */
export async function GET(request: NextRequest) {
  try {
    // Permission data governs who can do what — reading or rewriting it is a
    // company-admin action. This route had no check of any kind.
    const auth = await requireAuth(request)
    if (!auth.ok) return auth.response
    if (!auth.user.companyId || !(await canAdminCompany(auth.user, auth.user.companyId))) {
      return NextResponse.json(
        { success: false, error: 'Only company administrators may manage permissions.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const role = searchParams.get('role')
    const employeeId = searchParams.get('employeeId')
    const featureKey = searchParams.get('featureKey')

    if (type === 'role') {
      if (!role) {
        return NextResponse.json(
          { success: false, error: 'Missing role parameter' },
          { status: 400 }
        )
      }

      const permissions = await getRolePermissions(role)
      return NextResponse.json({ success: true, data: permissions })
    }

    if (type === 'user') {
      if (!employeeId) {
        return NextResponse.json(
          { success: false, error: 'Missing employeeId parameter' },
          { status: 400 }
        )
      }

      const permissions = await getUserPermissions(employeeId)
      return NextResponse.json({ success: true, data: permissions })
    }

    if (type === 'effective') {
      if (!employeeId || !role || !featureKey) {
        return NextResponse.json(
          { success: false, error: 'Missing required parameters (employeeId, role, featureKey)' },
          { status: 400 }
        )
      }

      const permissions = await getEffectivePermissions(employeeId, role, featureKey)
      return NextResponse.json({ success: true, data: permissions })
    }

    if (type === 'users-with-overrides') {
      const users = await getUsersWithPermissionOverrides()
      return NextResponse.json({ success: true, data: users })
    }

    // Default: return all role permissions
    const permissions = await getAllRolePermissions()
    return NextResponse.json({ success: true, data: permissions })
  } catch (error) {
    console.error('Error fetching permissions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch permissions' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/permissions
 * Body:
 * - action: 'update-role' | 'set-user' | 'remove-user'
 * - role: role name (for action=update-role)
 * - employeeId: employee ID (for action=set-user or action=remove-user)
 * - featureKey: feature key
 * - permissions: { canView?, canCreate?, canEdit?, canDelete?, canApprove? }
 */
export async function POST(request: NextRequest) {
  try {
    // Permission data governs who can do what — reading or rewriting it is a
    // company-admin action. This route had no check of any kind.
    const auth = await requireAuth(request)
    if (!auth.ok) return auth.response
    if (!auth.user.companyId || !(await canAdminCompany(auth.user, auth.user.companyId))) {
      return NextResponse.json(
        { success: false, error: 'Only company administrators may manage permissions.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, role, employeeId, featureKey, permissions } = body

    if (!action || !featureKey) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    if (action === 'update-role') {
      if (!role) {
        return NextResponse.json(
          { success: false, error: 'Missing role parameter' },
          { status: 400 }
        )
      }

      await updateRolePermission(role, featureKey, permissions)
      return NextResponse.json({
        success: true,
        message: 'Role permission updated successfully'
      })
    }

    if (action === 'set-user') {
      if (!employeeId) {
        return NextResponse.json(
          { success: false, error: 'Missing employeeId parameter' },
          { status: 400 }
        )
      }

      await setUserPermission(employeeId, featureKey, permissions)
      return NextResponse.json({
        success: true,
        message: 'User permission override set successfully'
      })
    }

    if (action === 'remove-user') {
      if (!employeeId) {
        return NextResponse.json(
          { success: false, error: 'Missing employeeId parameter' },
          { status: 400 }
        )
      }

      await removeUserPermission(employeeId, featureKey)
      return NextResponse.json({
        success: true,
        message: 'User permission override removed successfully'
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error updating permissions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update permissions' },
      { status: 500 }
    )
  }
}

