import { NextRequest, NextResponse } from 'next/server'
import { approveWFH } from '@/lib/db/wfh'

export async function POST(request: NextRequest) {
  try {
    const { id, approverId, remarks } = await request.json()

    if (!id || !approverId) {
      return NextResponse.json({
        success: false,
        error: 'WFH application ID and approver ID are required'
      }, { status: 400 })
    }

    const wfh = await approveWFH(id, approverId, remarks)

    return NextResponse.json({
      success: true,
      data: wfh,
      message: 'WFH application approved successfully'
    })
  } catch (error) {
    console.error('Failed to approve WFH application:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to approve WFH application'
    }, { status: 500 })
  }
}
