import { NextRequest, NextResponse } from 'next/server'
import { BugCommentsService } from '@/lib/sheets/bugs'

const commentsService = new BugCommentsService()

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

    const comments = await commentsService.getCommentsByBugId(bugId)

    return NextResponse.json({
      success: true,
      data: comments
    })
  } catch (error) {
    console.error(`Failed to get comments for bug ${(await params).bugId}:`, error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get comments'
    }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bugId: string }> }
) {
  try {
    const { bugId } = await params
    const { commentedBy, commentText } = await request.json()

    if (!bugId) {
      return NextResponse.json({
        success: false,
        error: 'Bug ID is required'
      }, { status: 400 })
    }

    if (!commentedBy || !commentText) {
      return NextResponse.json({
        success: false,
        error: 'commentedBy and commentText are required'
      }, { status: 400 })
    }

    const success = await commentsService.addComment(bugId, commentedBy, commentText)

    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to add comment'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Comment added successfully'
    })
  } catch (error) {
    console.error(`Failed to add comment to bug ${(await params).bugId}:`, error)
    return NextResponse.json({
      success: false,
      error: 'Failed to add comment'
    }, { status: 500 })
  }
}
