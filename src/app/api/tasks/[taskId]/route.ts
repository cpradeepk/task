import { NextRequest, NextResponse } from 'next/server'
import { updateTask, deleteTask } from '@/lib/db/tasks'
import { calculateTotalHours } from '@/lib/dailyHours'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params
    const updates = await request.json()

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

    // Update task in MySQL
    const task = await updateTask(taskId, updates)
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
