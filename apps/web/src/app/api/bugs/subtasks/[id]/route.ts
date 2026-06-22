import { NextRequest, NextResponse } from 'next/server'
import { updateBugSubTask, softDeleteBugSubTask } from '@/lib/db/bugSubtasks'

/**
 * PATCH /api/bugs/subtasks/[id]
 * Update a specific bug subtask
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid subtask ID'
      }, { status: 400 })
    }

    const updates = await request.json()

    // Assuming we don't have the user from token context here,
    // or if we do, it should be extracted. For now just pass updates.
    const updatedSubtask = await updateBugSubTask(id, updates)

    return NextResponse.json({
      success: true,
      data: updatedSubtask
    })
  } catch (error) {
    console.error('?O [BUG-SUBTASKS-PATCH] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update bug subtask'
    }, { status: 500 })
  }
}

/**
 * DELETE /api/bugs/subtasks/[id]
 * Soft delete a bug subtask
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid subtask ID'
      }, { status: 400 })
    }

    // Default to 'system' if user is not available in the request body
    // In a real app we'd get this from the session/token
    let deletedBy = 'system'
    try {
      const body = await request.json()
      if (body.deletedBy) {
        deletedBy = body.deletedBy
      }
    } catch (e) {
      // Body might be empty
    }

    await softDeleteBugSubTask(id, deletedBy)

    return NextResponse.json({
      success: true,
      data: { id, deleted: true }
    })
  } catch (error) {
    console.error('?O [BUG-SUBTASKS-DELETE] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete bug subtask'
    }, { status: 500 })
  }
}
