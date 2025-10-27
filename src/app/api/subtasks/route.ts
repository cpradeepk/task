import { NextRequest, NextResponse } from 'next/server'
import {
  getSubTasksByParentTaskId,
  createSubTask,
  getSubTaskCount,
  getAllDeletedSubTasks
} from '@/lib/db/subtasks'

/**
 * GET /api/subtasks
 * Get subtasks by parent task ID or get all deleted subtasks
 * Query params:
 * - parentTaskId: string (required for normal subtasks)
 * - includeDeleted: boolean (optional, for admin)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const parentTaskId = searchParams.get('parentTaskId')
    const includeDeleted = searchParams.get('includeDeleted') === 'true'

    // Get all deleted subtasks (for admin "Deleted Items" page)
    if (includeDeleted && !parentTaskId) {
      const deletedSubTasks = await getAllDeletedSubTasks()
      return NextResponse.json({
        success: true,
        data: deletedSubTasks,
        count: deletedSubTasks.length
      })
    }

    // Get subtasks for a specific parent task
    if (!parentTaskId) {
      return NextResponse.json(
        {
          success: false,
          error: 'parentTaskId is required'
        },
        { status: 400 }
      )
    }

    const subtasks = await getSubTasksByParentTaskId(parentTaskId)
    const counts = await getSubTaskCount(parentTaskId)

    return NextResponse.json({
      success: true,
      data: subtasks,
      count: subtasks.length,
      stats: counts
    })
  } catch (error) {
    console.error('SubTasks API GET error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch subtasks'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/subtasks
 * Create a new subtask
 * Body: {
 *   parentTaskId: string
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
    const { parentTaskId, description, assignedTo, status, isCompleted, displayOrder, createdBy } = body

    // Validation
    if (!parentTaskId || !description || !assignedTo || !createdBy) {
      return NextResponse.json(
        {
          success: false,
          error: 'parentTaskId, description, assignedTo, and createdBy are required'
        },
        { status: 400 }
      )
    }

    const newSubTask = await createSubTask({
      parentTaskId,
      description,
      assignedTo,
      status,
      isCompleted,
      displayOrder,
      createdBy
    })

    return NextResponse.json({
      success: true,
      data: newSubTask,
      message: 'Subtask created successfully'
    })
  } catch (error) {
    console.error('SubTasks API POST error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create subtask'
      },
      { status: 500 }
    )
  }
}

