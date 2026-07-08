import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/db/users'
import { issueAuthToken } from '@/lib/auth-server'

/**
 * Password login is now a break-glass fallback for admin / system-admin
 * accounts only. Regular users authenticate via OTP (/api/auth/otp/*).
 */
function isAdminAccount(user: { role?: string; isSystemAdmin?: number }): boolean {
  return user.role === 'admin' || Boolean(user.isSystemAdmin)
}

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

    // Only admin/service accounts may use password login as a fallback.
    if (!isAdminAccount(user)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Password login is disabled for this account. Please sign in with OTP.',
          code: 'OTP_REQUIRED',
        },
        { status: 403 }
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
