import { NextRequest, NextResponse } from 'next/server'
import { LeaveSheetsService } from '@/lib/sheets/leaves'

const leaveService = new LeaveSheetsService()

export async function POST(request: NextRequest) {
  try {
    const { id, approverId, remarks } = await request.json()

    if (!id || !approverId) {
      return NextResponse.json({
        success: false,
        error: 'Leave application ID and approver ID are required'
      }, { status: 400 })
    }

    const success = await leaveService.approveLeaveApplication(id, approverId, remarks)

    if (success) {
      return NextResponse.json({
        success: true,
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
