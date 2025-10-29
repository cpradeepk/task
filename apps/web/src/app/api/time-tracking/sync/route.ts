// Time Tracking API - Sync timer data to database
// Handles periodic sync of timer state from client to server

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { updateTask } from '@/lib/db/tasks'
import { updateBug } from '@/lib/db/bugs'

interface TimerSession {
  startTime: number
  endTime?: number
  duration: number
}

interface SyncRequest {
  entityType: 'task' | 'bug'
  entityId: string
  state: 'stopped' | 'running' | 'paused'
  totalTime: number
  sessions: TimerSession[]
}

/**
 * POST /api/time-tracking/sync
 * Sync timer data from client to database
 * 
 * This endpoint is called:
 * - Every 5 minutes while timer is running (periodic sync)
 * - When timer is paused (immediate sync)
 * - When timer is stopped (final sync)
 * 
 * @example
 * POST /api/time-tracking/sync
 * Body: {
 *   entityType: 'task',
 *   entityId: 'JSR-001',
 *   state: 'running',
 *   totalTime: 3600000,
 *   sessions: [...]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json() as SyncRequest
    const { entityType, entityId, state, totalTime, sessions } = body

    // Validate required fields
    if (!entityType || !entityId || !state || totalTime === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Calculate actual hours from total time (milliseconds to hours)
    const actualHours = totalTime / (1000 * 60 * 60)

    // Prepare update data
    const updates = {
      timerState: state,
      timerStartTime: state === 'running' ? new Date().toISOString() : null,
      timerTotalTime: totalTime,
      timerSessions: JSON.stringify(sessions),
      actualHours: Math.round(actualHours * 100) / 100, // Round to 2 decimal places
      updatedAt: new Date().toISOString()
    }

    // Update the appropriate entity
    try {
      if (entityType === 'task') {
        await updateTask(entityId, updates)
      } else if (entityType === 'bug') {
        await updateBug(entityId, updates)
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid entity type' },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Timer synced successfully',
        data: {
          actualHours: updates.actualHours,
          state: updates.timerState
        }
      })
    } catch (updateError) {
      console.error('❌ Error updating entity:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update timer data' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Error syncing timer:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

