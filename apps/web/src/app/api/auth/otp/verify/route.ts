import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmployeeId } from '@/lib/db/users'
import { verifyOtp } from '@/lib/otp/store'
import { issueAuthToken } from '@/lib/auth-server'

const REASON_MESSAGES: Record<string, string> = {
  not_found: 'No active OTP. Please request a new code.',
  expired: 'This OTP has expired. Please request a new code.',
  too_many_attempts: 'Too many incorrect attempts. Please request a new code.',
  mismatch: 'Incorrect OTP. Please try again.',
}

/**
 * POST /api/auth/otp/verify  { employeeId, otp }
 * On success issues the same JWT session as password login.
 */
export async function POST(request: NextRequest) {
  try {
    const { employeeId, otp } = await request.json()

    if (!employeeId || typeof employeeId !== 'string' || !/^\d{6}$/.test(String(otp || ''))) {
      return NextResponse.json(
        { success: false, error: 'Employee ID and a 6-digit OTP are required' },
        { status: 400 }
      )
    }

    const result = await verifyOtp(employeeId, otp)
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: REASON_MESSAGES[result.reason] || 'OTP verification failed' },
        { status: 401 }
      )
    }

    const user = await getUserByEmployeeId(employeeId)
    if (!user || user.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Account is not active' },
        { status: 403 }
      )
    }

    return issueAuthToken(user, { source: 'otp' })
  } catch (error) {
    console.error('OTP verify failed:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to verify OTP' },
      { status: 500 }
    )
  }
}
