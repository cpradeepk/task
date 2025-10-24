import { NextRequest, NextResponse } from 'next/server'
import { BugSheetsService } from '@/lib/sheets/bugs'

const bugService = new BugSheetsService()

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

    const bug = await bugService.getBugById(bugId)

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

    const success = await bugService.updateBug(bugId, updates)

    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update bug'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
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

    const success = await bugService.deleteBug(bugId)

    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to delete bug'
      }, { status: 500 })
    }

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
