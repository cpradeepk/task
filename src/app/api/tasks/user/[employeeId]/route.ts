import { NextRequest, NextResponse } from 'next/server'
import { TaskSheetsService } from '@/lib/sheets/tasks'

const taskService = new TaskSheetsService()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await params

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      )
    }

    // Get tasks for the specific user (both owned and supported)
    const tasks = await taskService.getTasksByUser(employeeId)

    return NextResponse.json({
      success: true,
      data: tasks,
      source: 'google_sheets'
    })
  } catch (error) {
    console.error('Failed to get tasks for user:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get tasks for user'
    }, { status: 500 })
  }
}
