import { NextRequest, NextResponse } from 'next/server'
import { LeaveSheetsService } from '@/lib/sheets/leaves'
import { UserSheetsService } from '@/lib/sheets/users'
import { emailService } from '@/lib/email/service'

const leaveService = new LeaveSheetsService()
const userService = new UserSheetsService()

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

    const success = await leaveService.rejectLeaveApplication(id, approverId, remarks)

    if (success) {
      // Send email notification for leave rejection
      try {
        if (emailService.isAvailable()) {
          // Get leave application details
          const leaveApplication = await leaveService.getLeaveApplicationById(id)

          if (leaveApplication) {
            // Get user details
            const user = await userService.getUserByEmployeeId(leaveApplication.employeeId)
            const approver = await userService.getUserByEmployeeId(approverId)

            if (user) {
              // Calculate days between fromDate and toDate
              const fromDate = new Date(leaveApplication.fromDate)
              const toDate = new Date(leaveApplication.toDate)
              const timeDiff = toDate.getTime() - fromDate.getTime()
              const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1

              await emailService.sendLeaveStatusEmail({
                userEmail: user.email,
                userName: user.name,
                leaveType: leaveApplication.leaveType,
                startDate: leaveApplication.fromDate,
                endDate: leaveApplication.toDate,
                days: daysDiff,
                status: 'rejected',
                reason: leaveApplication.reason,
                approvedBy: approver?.name || approverId,
                comments: remarks,
              })

              console.log('✅ Leave rejection email sent successfully')
            }
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
