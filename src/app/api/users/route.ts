import { NextRequest, NextResponse } from 'next/server'
import { UserSheetsService } from '@/lib/sheets/users'

const userService = new UserSheetsService()

// Admin user constant - only hardcoded user in the system
const ADMIN_USER = {
  employeeId: 'admin-001',
  name: 'System Admin',
  email: 'admin@eassy.life',
  phone: '+91-9999999999',
  department: 'Technology',
  isTodayTask: false,
  warningCount: 0,
  role: 'admin' as const,
  password: '1234',
  status: 'active' as const,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z'
}

export async function GET() {
  try {
    // Get users from Google Sheets
    const users = await userService.getAllUsers()

    // Always ensure admin user is included
    const hasAdmin = users.some(user => user.employeeId === 'admin-001')
    if (!hasAdmin) {
      users.unshift(ADMIN_USER)
    }

    const response = NextResponse.json({
      success: true,
      data: users,
      source: 'google_sheets',
      timestamp: Date.now()
    })

    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')

    return response
  } catch (error) {
    console.error('Failed to get users from Google Sheets:', error)

    // Return only admin user if Google Sheets fails
    const response = NextResponse.json({
      success: true,
      data: [ADMIN_USER],
      source: 'admin_only',
      error: 'Google Sheets unavailable',
      timestamp: Date.now()
    })

    // Shorter cache for error responses
    response.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30')

    return response
  }
}

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json()

    // Add user to Google Sheets
    const userId = await userService.addUser(userData)
    return NextResponse.json({
      success: true,
      data: userId,
      source: 'google_sheets'
    })
  } catch (error) {
    console.error('Failed to add user to Google Sheets:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to add user - Google Sheets unavailable'
    }, { status: 500 })
  }
}
