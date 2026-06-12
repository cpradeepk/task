import { NextRequest, NextResponse } from 'next/server'
import { approveLeave, getLeaveById } from '@/lib/db/leaves'
import { getUserByEmployeeId } from '@/lib/db/users'
import { emailService } from '@/lib/email/service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { approverId, remarks } = await request.json()

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

    // Approve leave in MySQL
    const leave = await approveLeave(id, approverId, remarks)

    if (leave) {
      // Send in-app, push & email notifications via createNotification
      try {
        const { createNotification } = await import('@/lib/notification-helper')
        const approver = await getUserByEmployeeId(approverId)
        const approverName = approver?.name || approverId

        await createNotification({
          userId: leave.employeeId,
          actorId: approverId,
          notificationType: 'leave_approved',
          title: 'Leave Application Approved',
          message: `Your leave request for ${leave.leaveType} has been approved by ${approverName}.`,
          linkUrl: '/leaves',
          metadata: { leaveId: id }
        })
        console.log('✅ Leave approval notification created successfully')
      } catch (notifError) {
        console.error('⚠️ Failed to create leave approval notification:', notifError)
      }

      return NextResponse.json({
        success: true,
        data: true,
        message: 'Leave application approved successfully'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to approve leave application'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Failed to approve leave application:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to approve leave application'
    }, { status: 500 })
  }
}
