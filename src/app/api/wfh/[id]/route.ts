import { NextRequest, NextResponse } from 'next/server'
import { WFHSheetsService } from '@/lib/sheets/wfh'

const wfhService = new WFHSheetsService()

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
        error: 'WFH application ID is required'
      }, { status: 400 })
    }

    const success = await wfhService.updateWFHApplication(id, updates)
    
    if (success) {
      return NextResponse.json({
        success: true,
        data: true,
        message: 'WFH application updated successfully'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to update WFH application'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Failed to update WFH application:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update WFH application'
    }, { status: 500 })
  }
}
