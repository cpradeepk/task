/**
 * API Route: /api/feed/posts/[postId]/comments
 * Purpose: Get and create comments on posts
 * Methods: GET, POST
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db/config'
import { getAuthUser } from '@/lib/auth-server'
import { v4 as uuidv4 } from 'uuid'

/**
 * GET /api/feed/posts/[postId]/comments
 * Get all comments for a post (threaded)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    // Authenticate user
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { postId } = await params

    // Get all comments with user details
    const comments = await query(
      `SELECT 
        fc.comment_id,
        fc.post_id,
        fc.parent_comment_id,
        fc.content,
        fc.created_by,
        fc.created_at,
        fc.updated_at,
        u.name as author_name,
        u.profile_picture as author_avatar
       FROM feed_comments fc
       LEFT JOIN users u ON fc.created_by = u.employee_id
       WHERE fc.post_id = $1 AND fc.deleted_at IS NULL
       ORDER BY fc.created_at ASC`,
      [postId]
    )

    // Build threaded structure
    const commentMap: Record<string, any> = {}
    const rootComments: any[] = []

    // First pass: create comment objects
    comments.forEach((comment: any) => {
      commentMap[comment.comment_id] = {
        ...comment,
        replies: []
      }
    })

    // Second pass: build tree structure
    comments.forEach((comment: any) => {
      if (comment.parent_comment_id) {
        // This is a reply
        const parent = commentMap[comment.parent_comment_id]
        if (parent) {
          parent.replies.push(commentMap[comment.comment_id])
        }
      } else {
        // This is a root comment
        rootComments.push(commentMap[comment.comment_id])
      }
    })

    return NextResponse.json({
      success: true,
      data: rootComments
    })
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/feed/posts/[postId]/comments
 * Create a new comment
 * Body: { content: string, parentCommentId?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    // Authenticate user
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { postId } = await params
    const body = await request.json()
    const { content, parentCommentId } = body

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: 'Comment content is required' },
        { status: 400 }
      )
    }

    // Check if post exists
    const posts = await query(
      `SELECT * FROM feed_posts WHERE post_id = $1 AND deleted_at IS NULL`,
      [postId]
    )

    if (posts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      )
    }

    // If parentCommentId provided, verify it exists
    if (parentCommentId) {
      const parentComments = await query(
        `SELECT * FROM feed_comments 
         WHERE comment_id = $1 AND post_id = $2 AND deleted_at IS NULL`,
        [parentCommentId, postId]
      )

      if (parentComments.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Parent comment not found' },
          { status: 404 }
        )
      }
    }

    // Generate comment ID
    const commentId = `comment_${uuidv4()}`

    // Insert comment
    await query(
      `INSERT INTO feed_comments (
        comment_id, post_id, parent_comment_id, content, created_by
      ) VALUES ($1, $2, $3, $4, $5)`,
      [commentId, postId, parentCommentId || null, content.trim(), user.employeeId]
    )

    // Log activity (Note: activity_log doesn't support 'feed_post' entity type yet)
    // TODO: Add 'feed_post' to activity_log entity_type constraint or create separate feed_activity_log table
    // Skipping activity log for now to avoid constraint violation

    return NextResponse.json({
      success: true,
      data: { commentId },
      message: 'Comment added successfully'
    })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}

