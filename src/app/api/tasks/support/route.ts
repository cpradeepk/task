import { NextRequest, NextResponse } from 'next/server'
import { getAllTasks, getTaskById } from '@/lib/db/tasks'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mainTaskId = searchParams.get('mainTaskId')
    const supportTaskId = searchParams.get('supportTaskId')

    if (mainTaskId) {
      // Get all support tasks for a main task
      const allTasks = await getAllTasks()
      const supportTasks = allTasks.filter(task =>
        task.subTask && task.subTask.includes(mainTaskId)
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

      if (!supportTask || !supportTask.subTask || !supportTask.subTask.includes('Support for:')) {
        return NextResponse.json({
          success: false,
          error: 'Support task not found or invalid'
        }, { status: 404 })
      }

      const mainTaskId = supportTask.subTask.replace('Support for: ', '')
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
    const { createTask } = await import('@/lib/db/tasks')

    for (const supportMemberId of supportMembers) {
      const supportUser = users.find((user: any) => user.employeeId === supportMemberId)
      if (!supportUser) {
        console.warn(`Support user not found: ${supportMemberId}`)
        continue
      }

      // Generate unique task ID with better uniqueness guarantee
      const timestamp = Date.now()
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
      const microRandom = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
      const supportTaskId = `JSR-${timestamp}${random}${microRandom}`

      // Create support task
      const supportTask = {
        taskId: supportTaskId,
        selectType: mainTask.selectType,
        recursiveType: mainTask.recursiveType,
        description: `[SUPPORT] ${mainTask.description}`,
        assignedTo: supportMemberId,
        assignedBy: mainTask.assignedBy,
        support: [],
        startDate: mainTask.startDate,
        endDate: mainTask.endDate,
        priority: mainTask.priority,
        estimatedHours: 0,
        actualHours: 0,
        status: 'Yet to Start' as const,
        remarks: `Support task for main task: ${mainTask.taskId}`,
        subTask: `Support for: ${mainTask.taskId}`,
        dailyHours: '{}'
      }

      const task = await createTask(supportTask)
      createdTaskIds.push(task.taskId)
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
