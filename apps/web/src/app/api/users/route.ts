import { NextRequest, NextResponse } from 'next/server'
import { getAllUsers, getAllUsersIncludingInactive, createUser } from '@/lib/db/users'
import { withTimeout } from '@/lib/db/config'
import { requireAuth, requireRole } from '@/lib/auth-server'
import { generateSecurePassword } from '@/lib/utils/password'

export async function GET(request: NextRequest) {
  try {
    // Any authenticated user may list users (assignee dropdowns, etc.).
    // Passwords are never returned (blanked in rowToUser).
    const auth = await requireAuth(request)
    if (!auth.ok) return auth.response

    const includeInactive = request.nextUrl.searchParams.get('includeInactive') === 'true'

    // Get users from database with timeout
    const users = await withTimeout(
      includeInactive ? getAllUsersIncludingInactive() : getAllUsers(),
      10000, // 10 second timeout
      'Failed to fetch users - database timeout'
    )

    const response = NextResponse.json({
      success: true,
      data: users,
      source: 'database',
      timestamp: Date.now()
    })

    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')

    return response
  } catch (error) {
    console.error('Failed to get users from database:', error)
    const errorMessage = error instanceof Error ? error.message : 'Database unavailable'

    const response = NextResponse.json({
      success: false,
      data: [],
      error: errorMessage,
      timestamp: Date.now()
    }, { status: 500 })

    // Shorter cache for error responses
    response.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30')

    return response
  }
}

/** Turn a PostgreSQL error into something an admin can actually act on. */
function describeCreateUserError(error: unknown): { message: string; status: number } {
  const code = (error as { code?: string })?.code
  const detail = String((error as { detail?: string })?.detail || '')

  if (code === '23505') {
    if (detail.includes('email')) return { message: 'That email address already belongs to another user.', status: 409 }
    if (detail.includes('employee_id')) return { message: 'That employee ID is already taken.', status: 409 }
    return { message: 'A user with those details already exists.', status: 409 }
  }
  if (code === '23514') {
    return {
      message: 'The selected role is not one the database accepts. Allowed roles are: employee, management, top_management, admin.',
      status: 400,
    }
  }
  if (code === '23502') return { message: 'A required field was missing.', status: 400 }

  return {
    message: error instanceof Error ? error.message : 'Failed to create user',
    status: 500,
  }
}

export async function POST(request: NextRequest) {
  try {
    // Only admins/top management may create users.
    const auth = await requireRole(request, ['admin', 'top_management'])
    if (!auth.ok) return auth.response

    const userData = await request.json()

    // An admin may leave the password blank; we generate a strong one and hand it
    // back so the caller can email it. generateTemporaryPassword() is deliberately
    // not used here — it produced a guessable `${employeeId}@2024`.
    const suppliedPassword = typeof userData.password === 'string' ? userData.password.trim() : ''
    const generatedPassword = suppliedPassword || generateSecurePassword(14)

    // Add user to database with timeout
    const user = await withTimeout(
      createUser({ ...userData, password: generatedPassword }),
      15000, // 15 second timeout for create operations
      'Failed to create user - database timeout'
    )

    return NextResponse.json({
      success: true,
      data: user,
      // Returned once, so the create flow can email these credentials. The stored
      // value is a bcrypt hash and can never be read back.
      initialPassword: generatedPassword,
      passwordWasGenerated: !suppliedPassword,
      source: 'database'
    })
  } catch (error) {
    console.error('Failed to create user:', error)
    const { message, status } = describeCreateUserError(error)

    return NextResponse.json({
      success: false,
      error: message
    }, { status })
  }
}
