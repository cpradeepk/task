import { NextRequest, NextResponse } from 'next/server'
import { updateLeave } from '@/lib/db/leaves'

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

    const leave = await updateLeave(id, updates)

    return NextResponse.json({
      success: true,
      data: leave,
      message: 'Leave application updated successfully'
    })
  } catch (error) {
    console.error('Failed to update leave application:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update leave application'
    }, { status: 500 })
  }
}
