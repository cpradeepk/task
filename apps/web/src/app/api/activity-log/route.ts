// Activity Log API Routes
// Handles GET (fetch activities) and POST (create activity/comment)

import { NextRequest, NextResponse } from 'next/server'
import { 
  getActivityLogByEntity, 
  getCommentsByEntity, 
  getSystemActivitiesByEntity,
  createActivityLog,
  CreateActivityLogInput
} from '@/lib/db/activityLog'
import { verifyToken } from '@/lib/auth'

/**
 * GET /api/activity-log
 * Fetch activity log entries for a specific entity
 * 
 * Query Parameters:
 * - entityType: 'task' | 'bug' | 'leave' | 'wfh' (required)
 * - entityId: string (required)
 * - filter: 'all' | 'comments' | 'activities' (optional, default: 'all')
 * - sortOrder: 'asc' | 'desc' (optional, default: 'desc')
 * 
 * @example
 * GET /api/activity-log?entityType=task&entityId=JSR-001&filter=all&sortOrder=desc
 */
export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType') as 'task' | 'bug' | 'leave' | 'wfh' | null
    const entityId = searchParams.get('entityId')
    const filter = searchParams.get('filter') || 'all' // 'all', 'comments', 'activities'
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'

    // Validate required parameters
    if (!entityType || !entityId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required parameters: entityType and entityId' 
        },
        { status: 400 }
      )
    }

    // Validate entityType
    if (!['task', 'bug', 'leave', 'wfh'].includes(entityType)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid entityType. Must be one of: task, bug, leave, wfh' 
        },
        { status: 400 }
      )
    }

    // Fetch activity log based on filter
    let activities
    switch (filter) {
      case 'comments':
        activities = await getCommentsByEntity(entityType, entityId, sortOrder)
        break
      case 'activities':
        activities = await getSystemActivitiesByEntity(entityType, entityId, sortOrder)
        break
      case 'all':
      default:
        activities = await getActivityLogByEntity(entityType, entityId, sortOrder)
        break
    }

    return NextResponse.json({
      success: true,
      data: activities,
      count: activities.length
    })

  } catch (error) {
    console.error('❌ Error fetching activity log:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * POST /api/activity-log
 * Create a new activity log entry or comment
 * 
 * Request Body:
 * {
 *   entityType: 'task' | 'bug' | 'leave' | 'wfh',
 *   entityId: string,
 *   actionType: string,
 *   description: string,
 *   isComment?: boolean,
 *   fieldName?: string,
 *   oldValue?: string,
 *   newValue?: string
 * }
 * 
 * @example
 * // Create a comment
 * POST /api/activity-log
 * {
 *   "entityType": "task",
 *   "entityId": "JSR-001",
 *   "actionType": "comment",
 *   "description": "Working on the API integration",
 *   "isComment": true
 * }
 * 
 * @example
 * // Log a system activity (usually done automatically by other APIs)
 * POST /api/activity-log
 * {
 *   "entityType": "task",
 *   "entityId": "JSR-001",
 *   "actionType": "status_change",
 *   "fieldName": "status",
 *   "oldValue": "Yet to Start",
 *   "newValue": "In Progress",
 *   "description": "Status changed from 'Yet to Start' to 'In Progress'",
 *   "isComment": false
 * }
 */
export async function POST(request: NextRequest) {
  let entityType: string | undefined
  let entityId: string | undefined
  let actionType: string | undefined

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
    const body = await request.json()
    const {
      entityType: bodyEntityType,
      entityId: bodyEntityId,
      actionType: bodyActionType,
      description,
      isComment,
      fieldName,
      oldValue,
      newValue
    } = body

    // Assign to outer scope for error logging
    entityType = bodyEntityType
    entityId = bodyEntityId
    actionType = bodyActionType

    // Validate required fields
    if (!bodyEntityType || !bodyEntityId || !bodyActionType || !description) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: entityType, entityId, actionType, description'
        },
        { status: 400 }
      )
    }

    // Validate entityType
    if (!['task', 'bug', 'leave', 'wfh'].includes(bodyEntityType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid entityType. Must be one of: task, bug, leave, wfh'
        },
        { status: 400 }
      )
    }

    // Create activity log input
    const activityInput: CreateActivityLogInput = {
      entityType: bodyEntityType,
      entityId: bodyEntityId,
      userId: user.employeeId,
      actionType: bodyActionType,
      description,
      isComment: isComment || false,
      fieldName,
      oldValue,
      newValue
    }

    // Create the activity log entry
    const activity = await createActivityLog(activityInput)

    return NextResponse.json({
      success: true,
      data: activity,
      message: isComment ? 'Comment added successfully' : 'Activity logged successfully'
    })

  } catch (error) {
    console.error('❌ Error creating activity log:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Log detailed error information
    console.error('❌ Error details:', {
      entityType,
      entityId,
      actionType,
      userId: request.cookies.get('token') ? 'authenticated' : 'no token',
      errorMessage
    })

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

