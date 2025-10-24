import { NextRequest, NextResponse } from 'next/server'
import { WFHSheetsService } from '@/lib/sheets/wfh'
import { UserSheetsService } from '@/lib/sheets/users'
import { emailService } from '@/lib/email/service'

const wfhService = new WFHSheetsService()
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
        error: 'WFH application ID is required'
      }, { status: 400 })
    }

    if (!approverId) {
      return NextResponse.json({
        success: false,
        error: 'Approver ID is required'
      }, { status: 400 })
    }

    const success = await wfhService.rejectWFHApplication(id, approverId, remarks)

    if (success) {
      // Send email notification for WFH rejection
      try {
        if (emailService.isAvailable()) {
          // Get WFH application details
          const wfhApplication = await wfhService.getWFHApplicationById(id)

          if (wfhApplication) {
            // Get user details
            const user = await userService.getUserByEmployeeId(wfhApplication.employeeId)
            const approver = await userService.getUserByEmployeeId(approverId)

            if (user) {
              await emailService.sendWFHStatusEmail({
                userEmail: user.email,
                userName: user.name,
                wfhDate: wfhApplication.fromDate,
                reason: wfhApplication.reason,
                status: 'rejected',
                approvedBy: approver?.name || approverId,
                comments: remarks,
              })

              console.log('✅ WFH rejection email sent successfully')
            }
          }
        }
      } catch (emailError) {
        console.error('⚠️ Failed to send WFH rejection email:', emailError)
        // Don't fail the rejection if email fails
      }

      return NextResponse.json({
        success: true,
        data: true,
        message: 'WFH application rejected successfully'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to reject WFH application'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Failed to reject WFH application:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to reject WFH application'
    }, { status: 500 })
  }
}
