import { NextRequest, NextResponse } from 'next/server'
import { getAllTasks, createTask, getLatestTaskId } from '@/lib/db/tasks'
import { getUserByEmployeeId } from '@/lib/db/users'
import { emailService } from '@/lib/email/service'
import { withTimeout } from '@/lib/db/config'
import { createActivityLog } from '@/lib/db/activityLog'
import { generateSequentialTaskId } from '@/lib/data'

export async function GET() {
  console.log('🔵 [TASKS-GET] API called')

  try {
    // Get tasks from MySQL with timeout
    console.log('🔵 [TASKS-GET] Fetching tasks from database...')
    const tasks = await withTimeout(
      getAllTasks(),
      10000,
      'Failed to fetch tasks - database timeout'
    )

    console.log(`✅ [TASKS-GET] Successfully fetched ${tasks.length} tasks`)

    return NextResponse.json({
      success: true,
      data: tasks,
      source: 'mysql'
    })
  } catch (error) {
    console.error('❌ [TASKS-GET] Failed to get tasks from MySQL:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to get tasks - MySQL unavailable'
    const errorStack = error instanceof Error ? error.stack : undefined

    console.error('❌ [TASKS-GET] Error details:', {
      errorMessage,
      errorStack
    })

    return NextResponse.json({
      success: false,
      error: errorMessage,
      stack: errorStack
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

    // Generate sequential task ID on server side
    const latestTaskId = await getLatestTaskId()
    const newTaskId = generateSequentialTaskId(latestTaskId)

    // Override any client-provided taskId with server-generated one
    taskData.taskId = newTaskId

    // Add task to MySQL
    const task = await createTask(taskData)

    // Log task creation activity
    try {
      await createActivityLog({
        entityType: 'task',
        entityId: task.taskId,
        userId: taskData.assignedBy || 'system',
        actionType: 'created',
        description: `Task created by ${taskData.assignedBy || 'system'}`,
        isComment: false
      })
    } catch (activityError) {
      console.error('⚠️ Failed to log task creation activity:', activityError)
      // Don't fail task creation if activity logging fails
    }

    // Send email notification for task creation
    try {
      if (emailService.isAvailable()) {
        // Get creator details
        const creator = await getUserByEmployeeId(taskData.createdBy || taskData.assignedBy)

        // Get assigned user details
        const assignedUser = await getUserByEmployeeId(taskData.assignedTo)

        // Determine if this is a support task (description starts with [SUPPORT])
        const isSupportTask = taskData.description?.startsWith('[SUPPORT]')

        if (isSupportTask && assignedUser) {
          // For support tasks, send email to the support team member
          // Extract main task ID from remarks field (format: "Support task for main task: JSR-XXX")
          const match = taskData.remarks?.match(/Support task for main task: (.+)/)
          const mainTaskId = match ? match[1] : 'Unknown'

          await emailService.sendSupportAssignedEmail({
            supportMemberEmail: assignedUser.email,
            supportMemberName: assignedUser.name,
            mainTaskId: mainTaskId,
            mainTaskDescription: taskData.description.replace('[SUPPORT] ', ''),
            priority: taskData.priority || 'Medium',
            dueDate: taskData.endDate || 'Not specified',
            assignedBy: creator?.name || taskData.assignedBy,
            supportTaskId: task.taskId,
          })

          console.log(`✅ Support assignment email sent to ${assignedUser.email}`)
        } else if (creator && assignedUser) {
          // For regular tasks, send email to creator
          await emailService.sendTaskCreatedEmail({
            creatorName: creator.name,
            creatorEmail: creator.email,
            managerEmail: creator.managerId ? (await getUserByEmployeeId(creator.managerId))?.email : undefined,
            taskTitle: taskData.description || 'New Task',
            taskDescription: taskData.description || 'No description provided',
            priority: taskData.priority || 'Medium',
            dueDate: taskData.endDate || 'Not specified',
            assignedTo: assignedUser.name || taskData.assignedTo,
            taskId: task.taskId,
          })

          console.log('✅ Task creation email sent to creator')

          // If assignee is different from creator, also send email to assignee
          if (taskData.assignedTo !== taskData.assignedBy && taskData.assignedTo !== creator.employeeId) {
            await emailService.sendTaskAssignedEmail({
              assigneeName: assignedUser.name,
              assigneeEmail: assignedUser.email,
              taskTitle: taskData.description || 'New Task',
              taskDescription: taskData.description || 'No description provided',
              priority: taskData.priority || 'Medium',
              dueDate: taskData.endDate || 'Not specified',
              assignedBy: creator.name,
              taskId: task.taskId,
            })

            console.log(`✅ Task assignment email sent to assignee ${assignedUser.email}`)
          }
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
