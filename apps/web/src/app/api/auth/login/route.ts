import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/db/users'
import jwt from 'jsonwebtoken'

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

export async function POST(request: NextRequest) {
  try {
    const { employeeId, password } = await request.json()

    // Special case for admin-001 with static password (case-insensitive)
    if (employeeId.toLowerCase() === 'admin-001' && password === '1234') {
      // Generate JWT token for mobile app
      const token = jwt.sign(
        {
          employeeId: ADMIN_USER.employeeId,
          role: ADMIN_USER.role,
          name: ADMIN_USER.name
        },
        process.env.JWT_SECRET || 'default-secret-key-change-in-production',
        { expiresIn: '7d' }
      )

      return NextResponse.json({
        success: true,
        data: ADMIN_USER,
        token, // Include JWT token for mobile app
        source: 'hardcoded_admin'
      })
    }

    // Authenticate user from MySQL
    const user = await authenticateUser(employeeId, password)

    if (user) {
      // Generate JWT token for mobile app
      const token = jwt.sign(
        {
          employeeId: user.employeeId,
          role: user.role,
          name: user.name
        },
        process.env.JWT_SECRET || 'default-secret-key-change-in-production',
        { expiresIn: '7d' }
      )

      return NextResponse.json({
        success: true,
        data: user,
        token, // Include JWT token for mobile app
        source: 'mysql'
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
      error: 'Authentication failed - MySQL unavailable'
    }, { status: 500 })
  }
}
