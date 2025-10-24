import { NextRequest, NextResponse } from 'next/server'
import { rejectLeave } from '@/lib/db/leaves'

export async function POST(request: NextRequest) {
  try {
    const { id, approverId, remarks } = await request.json()

    if (!id || !approverId) {
      return NextResponse.json({
        success: false,
        error: 'Leave application ID and approver ID are required'
      }, { status: 400 })
    }

    const leave = await rejectLeave(id, approverId, remarks)

    return NextResponse.json({
      success: true,
      data: leave,
      message: 'Leave application rejected successfully'
    })
  } catch (error) {
    console.error('Failed to reject leave application:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to reject leave application'
    }, { status: 500 })
  }
}
