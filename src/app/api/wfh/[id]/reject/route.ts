import { NextRequest, NextResponse } from 'next/server'
import { rejectWFH, getWFHById } from '@/lib/db/wfh'
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
        error: 'WFH application ID is required'
      }, { status: 400 })
    }

    if (!approverId) {
      return NextResponse.json({
        success: false,
        error: 'Approver ID is required'
      }, { status: 400 })
    }

    // Reject WFH in MySQL
    const wfh = await rejectWFH(id, approverId, remarks)

    if (wfh) {
      // Send email notification for WFH rejection
      try {
        if (emailService.isAvailable()) {
          // Get user details
          const user = await getUserByEmployeeId(wfh.employeeId)
          const approver = await getUserByEmployeeId(approverId)

          if (user) {
            await emailService.sendWFHStatusEmail({
              userEmail: user.email,
              userName: user.name,
              wfhDate: wfh.fromDate,
              reason: wfh.reason,
              status: 'rejected',
              approvedBy: approver?.name || approverId,
              comments: remarks,
            })

            console.log('✅ WFH rejection email sent successfully')
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
