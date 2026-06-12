import { NextRequest, NextResponse } from 'next/server'
import { rejectLeave, getLeaveById } from '@/lib/db/leaves'
import { getUserByEmployeeId } from '@/lib/db/users'
import { emailService } from '@/lib/email/service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { approverId } = body
    const remarks = body.remarks || body.reason

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Leave application ID is required'
      }, { status: 400 })
    }

    if (!approverId) {
      return NextResponse.json({
        success: false,
        error: 'Approver ID is required'
      }, { status: 400 })
    }

    // Reject leave in MySQL
    const leave = await rejectLeave(id, approverId, remarks)

    if (leave) {
      // Send in-app, push & email notifications via createNotification
      try {
        const { createNotification } = await import('@/lib/notification-helper')
        const approver = await getUserByEmployeeId(approverId)
        const approverName = approver?.name || approverId

        await createNotification({
          userId: leave.employeeId,
          actorId: approverId,
          notificationType: 'leave_rejected',
          title: 'Leave Application Rejected',
          message: `Your leave request for ${leave.leaveType} has been rejected by ${approverName}.`,
          linkUrl: '/leaves',
          metadata: { leaveId: id }
        })
        console.log('✅ Leave rejection notification created successfully')
      } catch (notifError) {
        console.error('⚠️ Failed to create leave rejection notification:', notifError)
      }

      return NextResponse.json({
        success: true,
        data: true,
        message: 'Leave application rejected successfully'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to reject leave application'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Failed to reject leave application:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to reject leave application'
    }, { status: 500 })
  }
}
