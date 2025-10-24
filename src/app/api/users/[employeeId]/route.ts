import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmployeeId, updateUser } from '@/lib/db/users'

// Admin user constant
const ADMIN_USER = {
  employeeId: 'admin-001',
  name: 'System Admin',
  email: 'mailcpk@gmail.com',
  phone: '+91-9999999999',
  department: 'Technology',
  isTodayTask: false,
  warningCount: 0,
  role: 'admin',
  password: '1234',
  status: 'active',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await params

    // Check if it's admin user first
    if (employeeId.toLowerCase() === 'admin-001') {
      return NextResponse.json({
        success: true,
        data: ADMIN_USER,
        source: 'hardcoded_admin'
      })
    }

    // Get user from MySQL
    const user = await getUserByEmployeeId(employeeId)
    return NextResponse.json({
      success: true,
      data: user,
      source: 'mysql'
    })
  } catch (error) {
    console.error('Failed to get user from MySQL:', error)
    return NextResponse.json({
      success: false,
      error: 'User not found or MySQL unavailable'
    }, { status: 404 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await params
    const userData = await request.json()

    // Cannot update admin user
    if (employeeId.toLowerCase() === 'admin-001') {
      return NextResponse.json({
        success: false,
        error: 'Cannot update admin user'
      }, { status: 403 })
    }

    // Update user in MySQL
    const user = await updateUser(employeeId, userData)
    return NextResponse.json({
      success: true,
      data: user,
      source: 'mysql'
    })
  } catch (error) {
    console.error('Failed to update user in MySQL:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update user - MySQL unavailable'
    }, { status: 500 })
  }
}
