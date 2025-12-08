import { NextRequest, NextResponse } from 'next/server'
import { getAllTasks, createTask, getLatestTaskId } from '@/lib/db/tasks'
import { getUserByEmployeeId } from '@/lib/db/users'
import { emailService } from '@/lib/email/service'
import { withTimeout } from '@/lib/db/config'
import { createActivityLog } from '@/lib/db/activityLog'
import { generateSequentialTaskId } from '@/lib/data'

export async function GET(request: NextRequest) {
  console.log('🔵 [TASKS-GET] API called')

  try {
    // Parse pagination parameters from query string
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined

    // Helper to parse array params
    const getArrayParam = (key: string) => {
      const val = searchParams.get(key)
      return val ? val.split(',').filter(Boolean) : undefined
    }

    const filters = {
      limit,
      offset,
      status: getArrayParam('status'),
      priority: getArrayParam('priority'),
      assignedTo: getArrayParam('assignedTo'),
      assignedBy: getArrayParam('assignedBy'),
      projectId: searchParams.get('projectId') || undefined,
      subprojectId: searchParams.get('subprojectId') || undefined,
      search: searchParams.get('search') || undefined
    }

    console.log('🔵 [TASKS-GET] Params:', filters)

    // Get tasks from MySQL with timeout
    console.log('🔵 [TASKS-GET] Fetching tasks from database...')
    const tasks = await withTimeout(
      getAllTasks(filters),
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

    // Set assignedBy to createdBy if not provided (required field in database)
    if (!taskData.assignedBy) {
      taskData.assignedBy = taskData.createdBy
    }

    // Set default dates if not provided (required fields in database)
    if (!taskData.startDate) {
      taskData.startDate = new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
    }
    if (!taskData.endDate) {
      taskData.endDate = new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
    }

    // Add task to database - THIS IS THE CRITICAL OPERATION
    const task = await createTask(taskData)

    // PERFORMANCE FIX: Return immediately after task creation
    // Execute secondary operations asynchronously without blocking the response
    // This reduces response time from 60s to <2s

    // Fire-and-forget: Activity logging (non-blocking)
    createActivityLog({
      entityType: 'task',
      entityId: task.taskId,
      userId: taskData.assignedBy || 'system',
      actionType: 'created',
      description: `Task created by ${taskData.assignedBy || 'system'}`,
      isComment: false
    }).catch(activityError => {
      console.error('⚠️ Failed to log task creation activity:', activityError)
    })

    // Fire-and-forget: Email notifications (non-blocking)
    if (emailService.isAvailable()) {
      // Execute email sending asynchronously
      (async () => {
        try {
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
              taskTitle: taskData.name || taskData.description || 'New Task',
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
                taskTitle: taskData.name || taskData.description || 'New Task',
                taskDescription: taskData.description || 'No description provided',
                priority: taskData.priority || 'Medium',
                dueDate: taskData.endDate || 'Not specified',
                assignedBy: creator.name,
                taskId: task.taskId,
              })

              console.log(`✅ Task assignment email sent to assignee ${assignedUser.email}`)
            }
          }
        } catch (emailError) {
          console.error('⚠️ Failed to send task creation email:', emailError)
        }
      })()
    }

    // Return success immediately - emails and logging happen in background
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
