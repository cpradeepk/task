import { NextRequest, NextResponse } from 'next/server'
import { getBugById, updateBug, deleteBug } from '@/lib/db/bugs'
import { emailService } from '@/lib/email/service'
import { getUserByEmployeeId } from '@/lib/db/users'

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

    // Get the current bug state before updating
    const currentBug = await getBugById(bugId)

    // Check if assignedTo field is changing (bug is being assigned/reassigned)
    const isAssignmentChange = updates.assignedTo && updates.assignedTo !== currentBug?.assignedTo

    // Update the bug
    const bug = await updateBug(bugId, updates)

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
