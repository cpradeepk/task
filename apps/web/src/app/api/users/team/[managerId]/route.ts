import { NextRequest, NextResponse } from 'next/server'
import { getUsersByManagerId } from '@/lib/db/users'
import { requireAuth } from '@/lib/auth-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ managerId: string }> }
) {
  try {
    // This endpoint had no auth at all — any caller could enumerate any
    // manager's direct reports.
    const auth = await requireAuth(request)
    if (!auth.ok) return auth.response

    const { managerId } = await params

    if (!managerId) {
      return NextResponse.json({
        success: false,
        error: 'Manager ID is required'
      }, { status: 400 })
    }

    // You may read your own team; admins and top management may read anyone's.
    const isPrivileged = auth.user.role === 'admin' || auth.user.role === 'top_management'
    if (!isPrivileged && auth.user.employeeId !== managerId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const teamMembers = await getUsersByManagerId(managerId)

    return NextResponse.json({
      success: true,
      data: teamMembers,
      source: 'mysql'
    })
  } catch (error) {
    console.error('Failed to get team members:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to get team members'
    }, { status: 500 })
  }
}
