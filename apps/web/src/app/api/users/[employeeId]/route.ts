import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmployeeId, updateUser } from '@/lib/db/users'
import { withTimeout } from '@/lib/db/config'
import { cache, CACHE_KEYS } from '@/lib/cache'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await params

    // Serve from cache if present
    const cacheKey = CACHE_KEYS.USER_DETAIL(employeeId)
    if (await cache.has(cacheKey)) {
      return NextResponse.json({ success: true, data: await cache.get<any>(cacheKey), source: 'cache' })
    }

    // Get user from database with timeout
    const user = await withTimeout(
      getUserByEmployeeId(employeeId),
      10000,
      'Failed to fetch user - database timeout'
    )

    // Cache for 5 minutes
    await cache.set(cacheKey, user, 5)

    return NextResponse.json({
      success: true,
      data: user,
      source: 'mysql'
    })
  } catch (error) {
    console.error('Failed to get user from MySQL:', error)
    const errorMessage = error instanceof Error ? error.message : 'User not found or MySQL unavailable'

    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 404 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await params
    const userData = await request.json()

    // Cannot update admin user
    if (employeeId.toLowerCase() === 'admin-001') {
      return NextResponse.json({
        success: false,
        error: 'Cannot update admin user'
      }, { status: 403 })
    }

    // Update user in MySQL with timeout
    const user = await withTimeout(
      updateUser(employeeId, userData),
      15000,
      'Failed to update user - database timeout'
    )

    // Invalidate caches
    await cache.delete(CACHE_KEYS.USER_DETAIL(employeeId))
    await cache.delete(CACHE_KEYS.USERS)

    return NextResponse.json({
      success: true,
      data: user,
      source: 'mysql'
    })
  } catch (error) {
    console.error('Failed to update user in MySQL:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to update user - MySQL unavailable'

    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 })
  }
}

// PATCH handler (alias for PUT to support both methods)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  return PUT(request, { params })
}
