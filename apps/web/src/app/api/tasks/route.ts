import { NextRequest, NextResponse } from 'next/server'
import { getAllTasks, createTask, getLatestTaskId } from '@/lib/db/tasks'
import { getUserByEmployeeId } from '@/lib/db/users'
import { emailService } from '@/lib/email/service'
import { withTimeout } from '@/lib/db/config'
import { createActivityLog } from '@/lib/db/activityLog'
import { generateSequentialTaskId } from '@/lib/data'
import { getAuthUser } from '@/lib/auth-server'
import { getUserProjectIds } from '@/lib/db/project-users'
import { createNotification } from '@/lib/notification-helper'

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
    let tasks = await withTimeout(
      getAllTasks(filters),
      10000,
      'Failed to fetch tasks - database timeout'
    )

    // Optional project-access scoping (used by Reports — option B)
    // When scopeByUserProjects=true, filter to projects the user is assigned to
    // (admin/top_management always see all)
    if (searchParams.get('scopeByUserProjects') === 'true') {
      const authUser = await getAuthUser(request)
      if (authUser && !['admin', 'top_management'].includes(authUser.role)) {
        const accessibleProjectIds = await getUserProjectIds(authUser.employeeId)
        const accessibleSet = new Set(accessibleProjectIds)
        tasks = tasks.filter((t: any) => !t.projectId || accessibleSet.has(t.projectId))
      }
    }

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
    // Fire-and-forget: In-app & Push notification (non-blocking)
    if (task.assignedTo && Array.isArray(task.assignedTo) && task.assignedTo.length > 0) {
      (async () => {
        try {
          const creator = await getUserByEmployeeId(task.assignedBy || 'system')
          const title = 'New Task Assigned'
          const message = `${creator?.name || task.assignedBy || 'Someone'} assigned you task: ${task.name || task.description || 'New Task'}`
          
          for (const assigneeId of task.assignedTo) {
            await createNotification({
              userId: assigneeId,
              actorId: task.assignedBy || 'system',
              notificationType: taskData.description?.startsWith('[SUPPORT]') ? 'task_support_assigned' : 'task_assigned',
              taskId: task.taskId,
              title,
              message,
              linkUrl: `/tasks/${task.taskId}`
            })
          }
        } catch (notifError) {
          console.error('⚠️ Failed to create task assignment notifications:', notifError)
        }
      })()
    }

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

          if (!isSupportTask && creator && assignedUser) {
            // For regular tasks, send email to creator to confirm creation
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
