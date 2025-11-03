import { NextRequest, NextResponse } from 'next/server'
import { updateTask, deleteTask, getTaskById, getAllTasks } from '@/lib/db/tasks'
import { calculateTotalHours } from '@/lib/dailyHours'
import { logEntityChanges, createActivityLog } from '@/lib/db/activityLog'
import { verifyToken } from '@/lib/auth-server'
import { getUserByEmployeeId } from '@/lib/db/users'
import { emailService } from '@/lib/email/service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params

    // Get task from MySQL
    const task = await getTaskById(taskId)

    if (!task) {
      return NextResponse.json({
        success: false,
        error: 'Task not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: task,
      source: 'mysql'
    })
  } catch (error) {
    console.error('Failed to fetch task from MySQL:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch task - MySQL unavailable'
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params
    const updates = await request.json()

    // Get current user for activity logging
    const token = request.cookies.get('token')?.value
    const user = token ? verifyToken(token) : null
    const userId = user?.employeeId || 'system'

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

    // Get current task state before updating (for activity logging)
    const currentTask = await getTaskById(taskId)

    // Update task in MySQL
    const task = await updateTask(taskId, updates)

    // Log all changes to activity log
    if (currentTask) {
      try {
        await logEntityChanges('task', taskId, userId, currentTask, updates, {
          status: 'Status',
          assignedTo: 'Assigned To',
          priority: 'Priority',
          estimatedHours: 'Estimated Hours',
          actualHours: 'Actual Hours',
          description: 'Description',
          startDate: 'Start Date',
          endDate: 'End Date',
          selectType: 'Task Type',
          recursiveType: 'Recursive Type'
        })
      } catch (activityError) {
        console.error('⚠️ Failed to log activity:', activityError)
        // Don't fail the update if activity logging fails
      }
    }

    // Handle support task closure notifications
    if (updates.status && currentTask && currentTask.status !== updates.status) {
      try {
        // Check if this is a support task being closed
        const isSupportTask = currentTask.description?.startsWith('[SUPPORT]')
        const isClosedStatus = updates.status === 'Done' || updates.status === 'Cancel' || updates.status === 'Stop'

        if (isSupportTask && isClosedStatus) {
          // Extract main task ID from remarks
          const match = currentTask.remarks?.match(/Support task for main task: (.+)/)
          const mainTaskId = match ? match[1] : null

          if (mainTaskId) {
            const mainTask = await getTaskById(mainTaskId)
            if (mainTask) {
              // Get support member and main task assignee details
              const supportMember = await getUserByEmployeeId(currentTask.assignedTo)
              const mainTaskAssignee = await getUserByEmployeeId(mainTask.assignedTo)

              // Add activity log to main task
              await createActivityLog({
                entityType: 'task',
                entityId: mainTaskId,
                userId: currentTask.assignedTo,
                actionType: 'support_task_closed',
                description: `Support task ${currentTask.taskId} completed by ${supportMember?.name || currentTask.assignedTo}`,
                isComment: false
              })

              // Add comment to main task
              await createActivityLog({
                entityType: 'task',
                entityId: mainTaskId,
                userId: currentTask.assignedTo,
                actionType: 'comment',
                description: `Support task ${currentTask.taskId} has been ${updates.status.toLowerCase()}. ${supportMember?.name || currentTask.assignedTo} has completed their support work.`,
                isComment: true
              })

              // Send email notification to main task assignee
              if (emailService.isAvailable() && mainTaskAssignee) {
                try {
                  await emailService.sendEmail({
                    to: mainTaskAssignee.email,
                    subject: `✅ Support Task Completed: ${mainTask.description}`,
                    html: `
                      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #10b981;">Support Task Completed</h2>
                        <p>Hi ${mainTaskAssignee.name},</p>
                        <p><strong>${supportMember?.name || currentTask.assignedTo}</strong> has completed their support work on your task:</p>
                        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                          <p style="margin: 5px 0;"><strong>Main Task:</strong> ${mainTask.description}</p>
                          <p style="margin: 5px 0;"><strong>Task ID:</strong> ${mainTaskId}</p>
                          <p style="margin: 5px 0;"><strong>Support Task ID:</strong> ${currentTask.taskId}</p>
                          <p style="margin: 5px 0;"><strong>Status:</strong> ${updates.status}</p>
                        </div>
                        <p>You can view the task details and activity log for more information.</p>
                        <p style="margin-top: 30px; color: #6b7280; font-size: 12px;">
                          This is an automated notification from JSR Task Management System.
                        </p>
                      </div>
                    `,
                    priority: 'normal',
                    type: 'task_created'
                  })
                  console.log(`✅ Support task closure notification sent to ${mainTaskAssignee.email}`)
                } catch (emailError) {
                  console.error('⚠️ Failed to send support task closure email:', emailError)
                }
              }
            }
          }
        }

        // Check if main task is being closed - auto-close all support tasks
        if (isClosedStatus && !isSupportTask) {
          const allTasks = await getAllTasks()
          const supportTasks = allTasks.filter((t: any) =>
            t.description?.startsWith('[SUPPORT]') &&
            t.remarks?.includes(`Support task for main task: ${taskId}`) &&
            t.status !== 'Done' &&
            t.status !== 'Cancel' &&
            t.status !== 'Stop'
          )

          for (const supportTask of supportTasks) {
            try {
              await updateTask(supportTask.taskId, { status: updates.status })
              await createActivityLog({
                entityType: 'task',
                entityId: supportTask.taskId,
                userId: 'system',
                actionType: 'status_changed',
                description: `Auto-closed because main task ${taskId} was ${updates.status.toLowerCase()}`,
                isComment: false
              })
              console.log(`✅ Auto-closed support task ${supportTask.taskId}`)
            } catch (error) {
              console.error(`⚠️ Failed to auto-close support task ${supportTask.taskId}:`, error)
            }
          }
        }
      } catch (supportError) {
        console.error('⚠️ Failed to handle support task logic:', supportError)
        // Don't fail the main update if support task logic fails
      }
    }

    return NextResponse.json({
      success: true,
      data: task,
      source: 'mysql'
    })
  } catch (error) {
    console.error('Failed to update task in MySQL:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update task - MySQL unavailable'
    }, { status: 500 })
  }
}

// PATCH handler (alias for PUT to support both methods)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  return PUT(request, { params })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params

    // Get current user for activity logging
    const token = request.cookies.get('token')?.value
    const user = token ? verifyToken(token) : null
    const userId = user?.employeeId || 'system'

    // Log deletion activity before deleting
    try {
      await createActivityLog({
        entityType: 'task',
        entityId: taskId,
        userId,
        actionType: 'deleted',
        description: 'Task deleted',
        isComment: false
      })
    } catch (activityError) {
      console.error('⚠️ Failed to log deletion activity:', activityError)
      // Continue with deletion even if logging fails
    }

    // Delete task from MySQL
    await deleteTask(taskId)
    return NextResponse.json({
      success: true,
      data: true,
      source: 'mysql'
    })
  } catch (error) {
    console.error('Failed to delete task from MySQL:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete task - MySQL unavailable'
    }, { status: 500 })
  }
}
