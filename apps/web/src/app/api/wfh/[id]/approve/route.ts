import { NextRequest, NextResponse } from 'next/server'
import { approveWFH, getWFHById } from '@/lib/db/wfh'
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

    // Approve WFH in MySQL
    const wfh = await approveWFH(id, approverId, remarks)

    if (wfh) {
      // Send in-app, push & email notifications via createNotification
      try {
        const { createNotification } = await import('@/lib/notification-helper')
        const approver = await getUserByEmployeeId(approverId)
        const approverName = approver?.name || approverId

        await createNotification({
          userId: wfh.employeeId,
          actorId: approverId,
          notificationType: 'wfh_approved',
          title: 'WFH Request Approved',
          message: `Your Work From Home request for ${wfh.fromDate} has been approved by ${approverName}.`,
          linkUrl: '/wfh',
          metadata: { wfhId: id }
        })
        console.log('✅ WFH approval notification created successfully')
      } catch (notifError) {
        console.error('⚠️ Failed to create WFH approval notification:', notifError)
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
