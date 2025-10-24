import { NextRequest, NextResponse } from 'next/server'
import { getBugById, updateBug, deleteBug } from '@/lib/db/bugs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bugId: string }> }
) {
  try {
    const { bugId } = await params

    if (!bugId) {
      return NextResponse.json({
        success: false,
        error: 'Bug ID is required'
      }, { status: 400 })
    }

    const bug = await getBugById(bugId)

    if (!bug) {
      return NextResponse.json({
        success: false,
        error: 'Bug not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: bug
    })
  } catch (error) {
    console.error(`Failed to get bug ${(await params).bugId}:`, error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get bug'
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ bugId: string }> }
) {
  try {
    const { bugId } = await params
    const updates = await request.json()

    if (!bugId) {
      return NextResponse.json({
        success: false,
        error: 'Bug ID is required'
      }, { status: 400 })
    }

    const bug = await updateBug(bugId, updates)

    return NextResponse.json({
      success: true,
      data: bug,
      message: 'Bug updated successfully'
    })
  } catch (error) {
    console.error(`Failed to update bug ${(await params).bugId}:`, error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update bug'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bugId: string }> }
) {
  try {
    const { bugId } = await params

    if (!bugId) {
      return NextResponse.json({
        success: false,
        error: 'Bug ID is required'
      }, { status: 400 })
    }

    await deleteBug(bugId)

    return NextResponse.json({
      success: true,
      message: 'Bug deleted successfully'
    })
  } catch (error) {
    console.error(`Failed to delete bug ${(await params).bugId}:`, error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete bug'
    }, { status: 500 })
  }
}
