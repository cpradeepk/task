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
      // Send email notification for leave approval
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
              status: 'approved',
              reason: leave.reason,
              approvedBy: approver?.name || approverId,
              comments: remarks,
            })

            console.log('✅ Leave approval email sent successfully')
          }
        }
      } catch (emailError) {
        console.error('⚠️ Failed to send leave approval email:', emailError)
        // Don't fail the approval if email fails
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
