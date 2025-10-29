import { NextRequest, NextResponse } from 'next/server'
import { getBugById, updateBug, deleteBug } from '@/lib/db/bugs'
import { emailService } from '@/lib/email/service'
import { getUserByEmployeeId } from '@/lib/db/users'
import { logEntityChanges, createActivityLog } from '@/lib/db/activityLog'
import { verifyToken } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bugId: string }> }
) {
  try {
    const { bugId } = await params

    if (!bugId) {
      return NextResponse.json({
        success: false,
        error: 'Bug ID is required'
      }, { status: 400 })
    }

    const bug = await getBugById(bugId)

    if (!bug) {
      return NextResponse.json({
        success: false,
        error: 'Bug not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: bug
    })
  } catch (error) {
    console.error(`Failed to get bug ${(await params).bugId}:`, error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get bug'
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ bugId: string }> }
) {
  try {
    const { bugId } = await params
    const updates = await request.json()

    if (!bugId) {
      return NextResponse.json({
        success: false,
        error: 'Bug ID is required'
      }, { status: 400 })
    }

    // Get current user for activity logging
    const token = request.cookies.get('token')?.value
    const user = token ? verifyToken(token) : null
    const userId = user?.employeeId || updates.assignedBy || 'system'

    // Get the current bug state before updating
    const currentBug = await getBugById(bugId)

    // Check if assignedTo field is changing (bug is being assigned/reassigned)
    const isAssignmentChange = updates.assignedTo && updates.assignedTo !== currentBug?.assignedTo

    // Update the bug
    const bug = await updateBug(bugId, updates)

    // Log all changes to activity log
    if (currentBug) {
      try {
        await logEntityChanges('bug', bugId, userId, currentBug, updates, {
          status: 'Status',
          assignedTo: 'Assigned To',
          priority: 'Priority',
          severity: 'Severity',
          estimatedHours: 'Estimated Hours',
          actualHours: 'Actual Hours',
          title: 'Title',
          description: 'Description',
          category: 'Category',
          platform: 'Platform',
          environment: 'Environment'
        })
      } catch (activityError) {
        console.error('⚠️ Failed to log activity:', activityError)
        // Don't fail the update if activity logging fails
      }
    }

    // Send email notification if bug is being assigned to someone
    if (isAssignmentChange) {
      try {
        if (emailService.isAvailable()) {
          // Get assignee details
          const assignee = await getUserByEmployeeId(updates.assignedTo)

          // Get assignedBy details (if available)
          let assignedByUser = null
          let assignedByEmail = undefined
          if (updates.assignedBy) {
            assignedByUser = await getUserByEmployeeId(updates.assignedBy)
            assignedByEmail = assignedByUser?.email
          }

          if (assignee) {
            await emailService.sendBugAssignedEmail({
              assigneeEmail: assignee.email,
              assigneeName: assignee.name,
              assignedByEmail: assignedByEmail,
              assignedByName: assignedByUser?.name || updates.assignedBy || 'System',
              bugId: bug.bugId,
              bugTitle: bug.title,
              bugDescription: bug.description,
              severity: bug.severity,
              priority: bug.priority,
              category: bug.category,
              platform: bug.platform,
              environment: bug.environment,
            })

            console.log(`✅ Bug assignment email sent to ${assignee.email}`)
          }
        }
      } catch (emailError) {
        console.error('⚠️ Failed to send bug assignment email:', emailError)
        // Continue - don't fail bug update if email fails
      }
    }

    return NextResponse.json({
      success: true,
      data: bug,
      message: 'Bug updated successfully'
    })
  } catch (error) {
    console.error(`Failed to update bug ${(await params).bugId}:`, error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update bug'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bugId: string }> }
) {
  try {
    const { bugId } = await params

    if (!bugId) {
      return NextResponse.json({
        success: false,
        error: 'Bug ID is required'
      }, { status: 400 })
    }

    // Get current user for activity logging
    const token = request.cookies.get('token')?.value
    const user = token ? verifyToken(token) : null
    const userId = user?.employeeId || 'system'

    // Log deletion activity before deleting
    try {
      await createActivityLog({
        entityType: 'bug',
        entityId: bugId,
        userId,
        actionType: 'deleted',
        description: 'Bug deleted',
        isComment: false
      })
    } catch (activityError) {
      console.error('⚠️ Failed to log deletion activity:', activityError)
      // Continue with deletion even if logging fails
    }

    await deleteBug(bugId)

    return NextResponse.json({
      success: true,
      message: 'Bug deleted successfully'
    })
  } catch (error) {
    console.error(`Failed to delete bug ${(await params).bugId}:`, error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete bug'
    }, { status: 500 })
  }
}
