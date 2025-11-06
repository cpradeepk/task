import { NextRequest, NextResponse } from 'next/server'
import { getAllUsers, createUser } from '@/lib/db/users'
import { withTimeout } from '@/lib/db/config'

export async function GET() {
  try {
    // Get users from database with timeout
    const users = await withTimeout(
      getAllUsers(),
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

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json()

    // Add user to database with timeout
    const user = await withTimeout(
      createUser(userData),
      15000, // 15 second timeout for create operations
      'Failed to create user - database timeout'
    )

    return NextResponse.json({
      success: true,
      data: user,
      source: 'database'
    })
  } catch (error) {
    console.error('Failed to add user to MySQL:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to add user - MySQL unavailable'

    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 })
  }
}
