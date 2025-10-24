import { NextRequest, NextResponse } from 'next/server'
import { TaskSheetsService } from '@/lib/sheets/tasks'
import { UserSheetsService } from '@/lib/sheets/users'
import { emailService } from '@/lib/email/service'

const taskService = new TaskSheetsService()
const userService = new UserSheetsService()

export async function GET() {
  try {
    // Get tasks from Google Sheets
    const tasks = await taskService.getAllTasks()
    return NextResponse.json({
      success: true,
      data: tasks,
      source: 'google_sheets'
    })
  } catch (error) {
    console.error('Failed to get tasks from Google Sheets:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get tasks - Google Sheets unavailable'
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

    // Add task to Google Sheets
    const taskId = await taskService.addTask(taskData)

    // Send email notification for task creation
    try {
      if (emailService.isAvailable()) {
        // Get creator details
        const creator = await userService.getUserByEmployeeId(taskData.createdBy)

        // Get assigned user details for display
        const assignedUser = await userService.getUserByEmployeeId(taskData.assignedTo)

        if (creator) {
          await emailService.sendTaskCreatedEmail({
            creatorName: creator.name,
            creatorEmail: creator.email,
            managerEmail: creator.managerId ? (await userService.getUserByEmployeeId(creator.managerId))?.email : undefined,
            taskTitle: taskData.title,
            taskDescription: taskData.description || 'No description provided',
            priority: taskData.priority || 'Medium',
            dueDate: taskData.dueDate || 'Not specified',
            assignedTo: assignedUser?.name || taskData.assignedTo,
            taskId: taskId,
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
      data: taskId,
      source: 'google_sheets'
    })
  } catch (error) {
    console.error('Failed to add task to Google Sheets:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add task - Google Sheets unavailable'
    }, { status: 500 })
  }
}
