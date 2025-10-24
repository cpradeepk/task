import { NextRequest, NextResponse } from 'next/server'
import { WFHSheetsService } from '@/lib/sheets/wfh'

const wfhService = new WFHSheetsService()

export async function POST(request: NextRequest) {
  try {
    const { id, approverId, remarks } = await request.json()

    if (!id || !approverId) {
      return NextResponse.json({
        success: false,
        error: 'WFH application ID and approver ID are required'
      }, { status: 400 })
    }

    const success = await wfhService.rejectWFHApplication(id, approverId, remarks)

    if (success) {
      return NextResponse.json({
        success: true,
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
