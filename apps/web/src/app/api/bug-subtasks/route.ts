import { NextRequest, NextResponse } from 'next/server'
import {
  getBugSubTasksByParentBugId,
  createBugSubTask,
  getBugSubTaskCount,
  getAllDeletedBugSubTasks
} from '@/lib/db/bugSubtasks'
import { withTimeout } from '@/lib/db/config'

/**
 * GET /api/bug-subtasks
 * Get bug subtasks by parent bug ID or get all deleted bug subtasks
 * Query params:
 * - parentBugId: string (required for normal subtasks)
 * - includeDeleted: boolean (optional, for admin)
 */
export async function GET(request: NextRequest) {
  console.log('🔵 [BUG-SUBTASKS-GET] API called')

  try {
    const searchParams = request.nextUrl.searchParams
    const parentBugId = searchParams.get('parentBugId')
    const includeDeleted = searchParams.get('includeDeleted') === 'true'

    console.log('🔵 [BUG-SUBTASKS-GET] Params:', { parentBugId, includeDeleted })

    // Get all deleted bug subtasks (for admin "Deleted Items" page)
    if (includeDeleted && !parentBugId) {
      console.log('🔵 [BUG-SUBTASKS-GET] Fetching deleted bug subtasks...')
      const deletedBugSubTasks = await getAllDeletedBugSubTasks()
      console.log(`✅ [BUG-SUBTASKS-GET] Found ${deletedBugSubTasks.length} deleted bug subtasks`)
      return NextResponse.json({
        success: true,
        data: deletedBugSubTasks,
        count: deletedBugSubTasks.length
      })
    }

    // Get subtasks for a specific parent bug
    if (!parentBugId) {
      console.log('❌ [BUG-SUBTASKS-GET] Missing parentBugId')
      return NextResponse.json(
        {
          success: false,
          error: 'parentBugId is required'
        },
        { status: 400 }
      )
    }

    // Fetch subtasks and stats in parallel with timeout to prevent hanging
    console.log('🔵 [BUG-SUBTASKS-GET] Fetching bug subtasks and counts...')
    const [subtasks, counts] = await Promise.all([
      withTimeout(
        getBugSubTasksByParentBugId(parentBugId),
        10000,
        'Failed to fetch bug subtasks - database timeout'
      ),
      withTimeout(
        getBugSubTaskCount(parentBugId),
        10000,
        'Failed to fetch bug subtask counts - database timeout'
      )
    ])

    console.log(`✅ [BUG-SUBTASKS-GET] Found ${subtasks.length} subtasks for parent bug ${parentBugId}`)

    return NextResponse.json({
      success: true,
      data: subtasks,
      count: subtasks.length,
      stats: counts
    })
  } catch (error) {
    console.error('❌ [BUG-SUBTASKS-GET] Bug SubTasks API GET error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch bug subtasks'
    const errorStack = error instanceof Error ? error.stack : undefined

    console.error('❌ [BUG-SUBTASKS-GET] Error details:', {
      errorMessage,
      errorStack
    })

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        stack: errorStack
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/bug-subtasks
 * Create a new bug subtask
 * Body: {
 *   parentBugId: string
 *   description: string
 *   assignedTo: string
 *   status?: 'Not Started' | 'In Progress' | 'Completed'
 *   isCompleted?: boolean
 *   displayOrder?: number
 *   createdBy: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { parentBugId, description, assignedTo, status, isCompleted, displayOrder, createdBy } = body

    // Validation
    if (!parentBugId || !description || !assignedTo || !createdBy) {
      return NextResponse.json(
        {
          success: false,
          error: 'parentBugId, description, assignedTo, and createdBy are required'
        },
        { status: 400 }
      )
    }

    const newBugSubTask = await createBugSubTask({
      parentBugId,
      description,
      assignedTo,
      status,
      isCompleted,
      displayOrder,
      createdBy
    })

    return NextResponse.json({
      success: true,
      data: newBugSubTask,
      message: 'Bug subtask created successfully'
    })
  } catch (error) {
    console.error('Bug SubTasks API POST error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create bug subtask'
      },
      { status: 500 }
    )
  }
}

