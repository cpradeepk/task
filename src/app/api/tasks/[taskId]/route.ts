import { NextRequest, NextResponse } from 'next/server'
import { TaskSheetsService } from '@/lib/sheets/tasks'
import { calculateTotalHours } from '@/lib/dailyHours'

const taskService = new TaskSheetsService()

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

    // Update task in Google Sheets
    const success = await taskService.updateTask(taskId, updates)
    return NextResponse.json({
      success,
      data: success,
      source: 'google_sheets'
    })
  } catch (error) {
    console.error('Failed to update task in Google Sheets:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update task - Google Sheets unavailable'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params

    // Delete task from Google Sheets
    const success = await taskService.deleteTask(taskId)
    return NextResponse.json({
      success,
      data: success,
      source: 'google_sheets'
    })
  } catch (error) {
    console.error('Failed to delete task from Google Sheets:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete task - Google Sheets unavailable'
    }, { status: 500 })
  }
}
