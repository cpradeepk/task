import { NextRequest, NextResponse } from 'next/server'
import { UserSheetsService } from '@/lib/sheets/users'

const userService = new UserSheetsService()

// Admin user constant
const ADMIN_USER = {
  employeeId: 'admin-001',
  name: 'System Admin',
  email: 'admin@eassy.life',
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

    // Get user from Google Sheets
    const user = await userService.getUserByEmployeeId(employeeId)
    return NextResponse.json({
      success: true,
      data: user,
      source: 'google_sheets'
    })
  } catch (error) {
    console.error('Failed to get user from Google Sheets:', error)
    return NextResponse.json({
      success: false,
      error: 'User not found or Google Sheets unavailable'
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

    // Update user in Google Sheets
    const success = await userService.updateUser(userData)
    return NextResponse.json({
      success,
      data: success,
      source: 'google_sheets'
    })
  } catch (error) {
    console.error('Failed to update user in Google Sheets:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update user - Google Sheets unavailable'
    }, { status: 500 })
  }
}
