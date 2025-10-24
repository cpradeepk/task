import { NextRequest, NextResponse } from 'next/server'
import { LeaveSheetsService } from '@/lib/sheets/leaves'

const leaveService = new LeaveSheetsService()

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const updates = await request.json()

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Leave application ID is required'
      }, { status: 400 })
    }

    const success = await leaveService.updateLeaveApplication(id, updates)
    
    if (success) {
      return NextResponse.json({
        success: true,
        data: true,
        message: 'Leave application updated successfully'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to update leave application'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Failed to update leave application:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update leave application'
    }, { status: 500 })
  }
}
