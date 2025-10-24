import { NextRequest, NextResponse } from 'next/server'
import { getAllTasks, createTask } from '@/lib/db/tasks'
import { getUserByEmployeeId } from '@/lib/db/users'
import { emailService } from '@/lib/email/service'
import { withTimeout } from '@/lib/db/config'

export async function GET() {
  try {
    // Get tasks from MySQL with timeout
    const tasks = await withTimeout(
      getAllTasks(),
      10000,
      'Failed to fetch tasks - database timeout'
    )

    return NextResponse.json({
      success: true,
      data: tasks,
      source: 'mysql'
    })
  } catch (error) {
    console.error('Failed to get tasks from MySQL:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to get tasks - MySQL unavailable'

    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const taskData = await request.json()

    // Basic validation for positive numbers
    if (taskData.estimatedHours && taskData.estimatedHours < 0) {
      return NextResponse.json({
        success: false,
        error: 'Estimated hours must be a positive number'
      }, { status: 400 })
    }

    // Basic validation for positive numbers
    if (taskData.actualHours && taskData.actualHours < 0) {
      return NextResponse.json({
        success: false,
        error: 'Actual hours must be a positive number'
      }, { status: 400 })
    }

    // Add task to MySQL
    const task = await createTask(taskData)

    // Send email notification for task creation
    try {
      if (emailService.isAvailable()) {
        // Get creator details
        const creator = await getUserByEmployeeId(taskData.createdBy || taskData.assignedBy)

        // Get assigned user details for display
        const assignedUser = await getUserByEmployeeId(taskData.assignedTo)

        if (creator) {
          await emailService.sendTaskCreatedEmail({
            creatorName: creator.name,
            creatorEmail: creator.email,
            managerEmail: creator.managerId ? (await getUserByEmployeeId(creator.managerId))?.email : undefined,
            taskTitle: taskData.description || 'New Task',
            taskDescription: taskData.description || 'No description provided',
            priority: taskData.priority || 'Medium',
            dueDate: taskData.endDate || 'Not specified',
            assignedTo: assignedUser?.name || taskData.assignedTo,
            taskId: task.taskId,
          })

          console.log('✅ Task creation email sent successfully')
        }
      }
    } catch (emailError) {
      console.error('⚠️ Failed to send task creation email:', emailError)
      // Don't fail the task creation if email fails
    }

    return NextResponse.json({
      success: true,
      data: task,
      source: 'mysql'
    })
  } catch (error) {
    console.error('Failed to add task to MySQL:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add task - MySQL unavailable'
    }, { status: 500 })
  }
}
