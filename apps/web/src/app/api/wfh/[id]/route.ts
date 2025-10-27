import { NextRequest, NextResponse } from 'next/server'
import { updateWFH } from '@/lib/db/wfh'

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

    const wfh = await updateWFH(id, updates)

    return NextResponse.json({
      success: true,
      data: wfh,
      message: 'WFH application updated successfully'
    })
  } catch (error) {
    console.error('Failed to update WFH application:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update WFH application'
    }, { status: 500 })
  }
}
