import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmployeeId } from '@/lib/db/users'
import { canRequestOtp, generateOtp, saveOtp } from '@/lib/otp/store'
import { normalizeIndianMobile, maskMobile, sendOtpSms } from '@/lib/otp/msg91'

/**
 * POST /api/auth/otp/request  { employeeId }
 * Generates and sends a one-time code to the user's registered phone.
 * Responses are deliberately uniform to avoid user enumeration.
 */
export async function POST(request: NextRequest) {
  try {
    const { employeeId } = await request.json()

    if (!employeeId || typeof employeeId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Employee ID is required' },
        { status: 400 }
      )
    }

    // Throttle first (also applies to unknown ids, so timing/limits don't leak existence).
    const gate = await canRequestOtp(employeeId)
    if (!gate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            gate.reason === 'cooldown'
              ? 'Please wait before requesting another code.'
              : 'Too many OTP requests. Try again later.',
          retryAfterSeconds: gate.retryAfterSeconds,
        },
        { status: 429 }
      )
    }

    const genericSuccess = {
      success: true,
      message: 'If the account exists, an OTP has been sent to the registered phone.',
    }

    const user = await getUserByEmployeeId(employeeId)
    const mobile = user && user.status === 'active' ? normalizeIndianMobile(user.phone) : null

    // Unknown user / inactive / no valid phone: respond generically, send nothing.
    if (!user || !mobile) {
      return NextResponse.json(genericSuccess)
    }

    const otp = generateOtp()
    await saveOtp(employeeId, otp)

    try {
      await sendOtpSms(mobile, otp)
    } catch (sendError) {
      // Do not leak the OTP; surface a generic delivery failure.
      console.error('OTP delivery failed:', sendError instanceof Error ? sendError.message : sendError)
      return NextResponse.json(
        { success: false, error: 'Failed to send OTP. Please try again.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ ...genericSuccess, maskedPhone: maskMobile(mobile) })
  } catch (error) {
    console.error('OTP request failed:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process OTP request' },
      { status: 500 }
    )
  }
}
