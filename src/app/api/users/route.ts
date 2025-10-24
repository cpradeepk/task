import { NextRequest, NextResponse } from 'next/server'
import { getAllUsers, createUser } from '@/lib/db/users'

// Admin user constant - only hardcoded user in the system
const ADMIN_USER = {
  employeeId: 'admin-001',
  name: 'System Admin',
  email: 'mailcpk@gmail.com',
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
    // Get users from MySQL
    const users = await getAllUsers()

    // Always ensure admin user is included
    const hasAdmin = users.some(user => user.employeeId === 'admin-001')
    if (!hasAdmin) {
      users.unshift(ADMIN_USER)
    }

    const response = NextResponse.json({
      success: true,
      data: users,
      source: 'mysql',
      timestamp: Date.now()
    })

    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')

    return response
  } catch (error) {
    console.error('Failed to get users from MySQL:', error)

    // Return only admin user if MySQL fails
    const response = NextResponse.json({
      success: true,
      data: [ADMIN_USER],
      source: 'admin_only',
      error: 'MySQL unavailable',
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

    // Add user to MySQL
    const user = await createUser(userData)
    return NextResponse.json({
      success: true,
      data: user,
      source: 'mysql'
    })
  } catch (error) {
    console.error('Failed to add user to MySQL:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to add user - MySQL unavailable'
    }, { status: 500 })
  }
}
