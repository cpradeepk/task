import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/db/users'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    const { employeeId, password } = await request.json()

    // Authenticate user from database
    const user = await authenticateUser(employeeId, password)

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

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

    // Create response with token cookie for web app
    const response = NextResponse.json({
      success: true,
      data: user,
      token, // Include JWT token for mobile app
      source: 'database'
    })

    // Set HTTP-only cookie for web app authentication
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    })

    return response
  } catch (error) {
    console.error('Failed to authenticate user:', error)
    return NextResponse.json({
      success: false,
      error: 'Authentication failed - database unavailable'
    }, { status: 500 })
  }
}
