import { NextRequest, NextResponse } from 'next/server'
import { updateTask, deleteTask, getTaskById } from '@/lib/db/tasks'
import { calculateTotalHours } from '@/lib/dailyHours'
import { logEntityChanges, createActivityLog } from '@/lib/db/activityLog'
import { verifyToken } from '@/lib/auth-server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params
    const updates = await request.json()

    // Get current user for activity logging
    const token = request.cookies.get('token')?.value
    const user = token ? verifyToken(token) : null
    const userId = user?.employeeId || 'system'

    // Basic validation for positive numbers
    if (updates.estimatedHours && updates.estimatedHours < 0) {
      return NextResponse.json({
        success: false,
        error: 'Estimated hours must be a positive number'
      }, { status: 400 })
    }

    // Basic validation for positive numbers
    if (updates.actualHours && updates.actualHours < 0) {
      return NextResponse.json({
        success: false,
        error: 'Actual hours must be a positive number'
      }, { status: 400 })
    }

    // Get current task state before updating (for activity logging)
    const currentTask = await getTaskById(taskId)

    // Update task in MySQL
    const task = await updateTask(taskId, updates)

    // Log all changes to activity log
    if (currentTask) {
      try {
        await logEntityChanges('task', taskId, userId, currentTask, updates, {
          status: 'Status',
          assignedTo: 'Assigned To',
          priority: 'Priority',
          estimatedHours: 'Estimated Hours',
          actualHours: 'Actual Hours',
          description: 'Description',
          startDate: 'Start Date',
          endDate: 'End Date',
          selectType: 'Task Type',
          recursiveType: 'Recursive Type'
        })
      } catch (activityError) {
        console.error('⚠️ Failed to log activity:', activityError)
        // Don't fail the update if activity logging fails
      }
    }

    return NextResponse.json({
      success: true,
      data: task,
      source: 'mysql'
    })
  } catch (error) {
    console.error('Failed to update task in MySQL:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update task - MySQL unavailable'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params

    // Get current user for activity logging
    const token = request.cookies.get('token')?.value
    const user = token ? verifyToken(token) : null
    const userId = user?.employeeId || 'system'

    // Log deletion activity before deleting
    try {
      await createActivityLog({
        entityType: 'task',
        entityId: taskId,
        userId,
        actionType: 'deleted',
        description: 'Task deleted',
        isComment: false
      })
    } catch (activityError) {
      console.error('⚠️ Failed to log deletion activity:', activityError)
      // Continue with deletion even if logging fails
    }

    // Delete task from MySQL
    await deleteTask(taskId)
    return NextResponse.json({
      success: true,
      data: true,
      source: 'mysql'
    })
  } catch (error) {
    console.error('Failed to delete task from MySQL:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete task - MySQL unavailable'
    }, { status: 500 })
  }
}
