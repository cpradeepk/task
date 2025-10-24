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

    // Reject leave in MySQL
    const leave = await rejectLeave(id, approverId, remarks)

    if (leave) {
      // Send email notification for leave rejection
      try {
        if (emailService.isAvailable()) {
          // Get user details
          const user = await getUserByEmployeeId(leave.employeeId)
          const approver = await getUserByEmployeeId(approverId)

          if (user) {
            // Calculate days between fromDate and toDate
            const fromDate = new Date(leave.fromDate)
            const toDate = new Date(leave.toDate)
            const timeDiff = toDate.getTime() - fromDate.getTime()
            const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1

            await emailService.sendLeaveStatusEmail({
              userEmail: user.email,
              userName: user.name,
              leaveType: leave.leaveType,
              startDate: leave.fromDate,
              endDate: leave.toDate,
              days: daysDiff,
              status: 'rejected',
              reason: leave.reason,
              approvedBy: approver?.name || approverId,
              comments: remarks,
            })

            console.log('✅ Leave rejection email sent successfully')
          }
        }
      } catch (emailError) {
        console.error('⚠️ Failed to send leave rejection email:', emailError)
        // Don't fail the rejection if email fails
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
