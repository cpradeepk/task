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

    let success = false
    try {
      success = await wfhService.approveWFHApplication(id, approverId, remarks)
    } catch (error) {
      console.error('Error during WFH approval:', error)

      // If it's a quota error, return a more specific error message
      if (error instanceof Error && error.message.includes('quota exceeded')) {
        return NextResponse.json({
          success: false,
          error: 'Google Sheets quota exceeded. Please try again in a few minutes.',
          retryAfter: 300 // 5 minutes
        }, { status: 429 })
      }

      // Re-throw other errors
      throw error
    }

    if (success) {
      // Send email notification for WFH approval
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
                status: 'approved',
                approvedBy: approver?.name || approverId,
                comments: remarks,
              })

              console.log('✅ WFH approval email sent successfully')
            }
          }
        }
      } catch (emailError) {
        console.error('⚠️ Failed to send WFH approval email:', emailError)
        // Don't fail the approval if email fails
      }

      return NextResponse.json({
        success: true,
        data: true,
        message: 'WFH application approved successfully'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to approve WFH application'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Failed to approve WFH application:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to approve WFH application'
    }, { status: 500 })
  }
}
