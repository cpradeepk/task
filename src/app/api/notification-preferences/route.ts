/**
 * API Route: /api/notification-preferences
 * Purpose: Manage user notification preferences
 * Methods: GET, POST
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  resetNotificationPreferences
} from '@/lib/db/notificationPreferences'

/**
 * GET /api/notification-preferences?employeeId=EMP-001
 * Fetch notification preferences for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: 'Missing employeeId parameter' },
        { status: 400 }
      )
    }

    const preferences = await getNotificationPreferences(employeeId)

    return NextResponse.json({
      success: true,
      data: preferences
    })
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notification preferences' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notification-preferences
 * Update or reset notification preferences
 * Body:
 * - action: 'update' | 'reset'
 * - employeeId: string
 * - preferences: Partial<NotificationPreferences> (for action=update)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, employeeId, preferences } = body

    if (!action || !employeeId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    if (action === 'update') {
      if (!preferences) {
        return NextResponse.json(
          { success: false, error: 'Missing preferences parameter' },
          { status: 400 }
        )
      }

      const updated = await updateNotificationPreferences(employeeId, preferences)

      return NextResponse.json({
        success: true,
        data: updated,
        message: 'Notification preferences updated successfully'
      })
    }

    if (action === 'reset') {
      const reset = await resetNotificationPreferences(employeeId)

      return NextResponse.json({
        success: true,
        data: reset,
        message: 'Notification preferences reset to defaults'
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update notification preferences' },
      { status: 500 }
    )
  }
}

