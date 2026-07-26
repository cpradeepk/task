import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/db/users'
import { issueAuthToken } from '@/lib/auth-server'

/**
 * Password login for all active users. The identifier accepts an employee ID
 * or an email address (authenticateUser matches both). OTP remains available
 * as an alternative via /api/auth/otp/*.
 */
export async function POST(request: NextRequest) {
  try {
    const { employeeId, password } = await request.json()

    // Authenticate user from database (employee ID or email + password)
    const user = await authenticateUser(employeeId, password)

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Issue JWT (httpOnly cookie for web + token in body for mobile).
    return issueAuthToken(user, { source: 'database' })
  } catch (error) {
    console.error('Failed to authenticate user:', error)
    return NextResponse.json({
      success: false,
      error: 'Authentication failed - database unavailable'
    }, { status: 500 })
  }
}
