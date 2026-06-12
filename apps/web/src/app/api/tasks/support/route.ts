import { NextRequest, NextResponse } from 'next/server'
import { getAllTasks, getTaskById } from '@/lib/db/tasks'
import { emailService } from '@/lib/email/service'
import { getUserByEmployeeId } from '@/lib/db/users'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mainTaskId = searchParams.get('mainTaskId')
    const supportTaskId = searchParams.get('supportTaskId')

    if (mainTaskId) {
      // Get all support tasks for a main task
      // Support tasks have [SUPPORT] prefix and remarks containing the main task ID
      const allTasks = await getAllTasks()
      const supportTasks = allTasks.filter(task =>
        task.description?.startsWith('[SUPPORT]') &&
        task.remarks?.includes(mainTaskId)
      )

      return NextResponse.json({
        success: true,
        data: supportTasks,
        source: 'mysql'
      })
    }

    if (supportTaskId) {
      // Get main task for a support task
      const supportTask = await getTaskById(supportTaskId)

      if (!supportTask || !supportTask.description?.startsWith('[SUPPORT]') || !supportTask.remarks) {
        return NextResponse.json({
          success: false,
          error: 'Support task not found or invalid'
        }, { status: 404 })
      }

      // Extract main task ID from remarks (format: "Support task for main task: JSR-XXX")
      const match = supportTask.remarks.match(/Support task for main task: (.+)/)
      if (!match) {
        return NextResponse.json({
          success: false,
          error: 'Could not extract main task ID from support task'
        }, { status: 400 })
      }

      const mainTaskId = match[1]
      const mainTask = await getTaskById(mainTaskId)

      return NextResponse.json({
        success: true,
        data: {
          supportTask,
          mainTask
        },
        source: 'mysql'
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Missing required parameters: mainTaskId or supportTaskId'
    }, { status: 400 })

  } catch (error) {
    console.error('Failed to get support tasks:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get support tasks'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { mainTaskId, supportMembers, users } = await request.json()

    if (!mainTaskId || !supportMembers || !Array.isArray(supportMembers)) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: mainTaskId, supportMembers'
      }, { status: 400 })
    }

    // Get the main task
    const mainTask = await getTaskById(mainTaskId)

    if (!mainTask) {
      return NextResponse.json({
        success: false,
        error: 'Main task not found'
      }, { status: 404 })
    }

    const createdTaskIds: string[] = []

    // Create support tasks for each support member
    const { createTask, getLatestTaskId } = await import('@/lib/db/tasks')
    const { generateSequentialTaskId } = await import('@/lib/data')

    for (const supportMemberId of supportMembers) {
      const supportUser = users.find((user: any) => user.employeeId === supportMemberId)
      if (!supportUser) {
        console.warn(`Support user not found: ${supportMemberId}`)
        continue
      }

      // Generate sequential task ID (same as main task creation)
      const latestTaskId = await getLatestTaskId()
      const supportTaskId = generateSequentialTaskId(latestTaskId)

      // Create support task
      const supportTask = {
        taskId: supportTaskId,
        name: `[SUPPORT] ${mainTask.name || mainTask.description}`,
        selectType: mainTask.selectType,
        recursiveType: mainTask.recursiveType,
        description: `[SUPPORT] ${mainTask.description}`,
        assignedTo: [supportMemberId], // Array for multiple assignees
        assignedBy: mainTask.assignedBy,
        support: [],
        startDate: mainTask.startDate,
        endDate: mainTask.endDate,
        priority: mainTask.priority,
        estimatedHours: 0,
        actualHours: 0,
        status: 'Yet to Start' as const,
        remarks: `Support task for main task: ${mainTask.taskId}`,
        dailyHours: '{}'
      }

      const task = await createTask(supportTask)
      createdTaskIds.push(task.taskId)

      // Send in-app, push & email notifications via createNotification
      try {
        const { createNotification } = await import('@/lib/notification-helper')
        const assignedByUser = await getUserByEmployeeId(mainTask.assignedBy)
        await createNotification({
          userId: supportMemberId,
          actorId: mainTask.assignedBy || 'system',
          notificationType: 'task_support_assigned',
          taskId: task.taskId,
          title: `You've been assigned as support`,
          message: `${assignedByUser?.name || mainTask.assignedBy} assigned you to support task: ${mainTask.name || mainTask.description}`,
          linkUrl: `/tasks/${task.taskId}`
        })
      } catch (notifError) {
        console.error('⚠️ Failed to create support task notifications:', notifError)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        createdTasks: createdTaskIds.length,
        taskIds: createdTaskIds
      },
      source: 'mysql'
    })

  } catch (error) {
    console.error('Failed to create support tasks:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create support tasks'
    }, { status: 500 })
  }
}
