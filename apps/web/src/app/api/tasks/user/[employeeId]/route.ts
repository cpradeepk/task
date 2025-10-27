import { NextRequest, NextResponse } from 'next/server'
import { getTasksByEmployeeId, getSupportTasksForEmployee } from '@/lib/db/tasks'

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
    const ownedTasks = await getTasksByEmployeeId(employeeId)
    const supportTasks = await getSupportTasksForEmployee(employeeId)

    // Combine and deduplicate tasks
    const allTasks = [...ownedTasks, ...supportTasks]
    const uniqueTasks = Array.from(new Map(allTasks.map(task => [task.taskId, task])).values())

    return NextResponse.json({
      success: true,
      data: uniqueTasks,
      source: 'mysql'
    })
  } catch (error) {
    console.error('Failed to get tasks for user:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get tasks for user'
    }, { status: 500 })
  }
}
