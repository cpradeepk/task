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

export async function POST(request: NextRequest) {
  try {
    const { employeeId, password } = await request.json()

    // Special case for admin-001 with static password (case-insensitive)
    if (employeeId.toLowerCase() === 'admin-001' && password === '1234') {
      return NextResponse.json({
        success: true,
        data: ADMIN_USER,
        source: 'hardcoded_admin'
      })
    }

    // Authenticate user from Google Sheets
    const user = await userService.authenticateUser(employeeId, password)

    if (user) {
      return NextResponse.json({
        success: true,
        data: user,
        source: 'google_sheets'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid credentials'
      }, { status: 401 })
    }
  } catch (error) {
    console.error('Failed to authenticate user:', error)
    return NextResponse.json({
      success: false,
      error: 'Authentication failed - Google Sheets unavailable'
    }, { status: 500 })
  }
}
