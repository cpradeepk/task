import { NextRequest, NextResponse } from 'next/server'
import { getLeaveById, updateLeave, deleteLeave } from '@/lib/db/leaves'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Leave application ID is required'
      }, { status: 400 })
    }

    const leave = await getLeaveById(id)

    if (!leave) {
      return NextResponse.json({
        success: false,
        error: 'Leave application not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: leave
    })
  } catch (error) {
    console.error('Failed to get leave application:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get leave application'
    }, { status: 500 })
  }
}

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

// PATCH handler (alias for PUT to support both methods)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PUT(request, { params })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Leave application ID is required'
      }, { status: 400 })
    }

    const deleted = await deleteLeave(id)

    if (!deleted) {
      return NextResponse.json({
        success: false,
        error: 'Leave application not found or failed to delete'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Leave application deleted successfully'
    })
  } catch (error) {
    console.error('Failed to delete leave application:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete leave application'
    }, { status: 500 })
  }
}

