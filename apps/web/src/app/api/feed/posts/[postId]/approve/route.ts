/**
 * API Route: /api/feed/posts/[postId]/approve
 * Purpose: Approve or reject pending posts
 * Methods: POST
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db/config'
import { getAuthUser } from '@/lib/auth-server'

/**
 * POST /api/feed/posts/[postId]/approve
 * Body: { action: 'approve' | 'reject', reason?: string }
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

    // Check if user is admin or management
    if (!['admin', 'management', 'top_management'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Only management can approve posts' },
        { status: 403 }
      )
    }

    const { postId } = await params
    const body = await request.json()
    const { action, reason } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      )
    }

    // Check if post exists and is pending
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

    const post = posts[0]

    if (post.status !== 'pending_approval') {
      return NextResponse.json(
        { success: false, error: 'Post is not pending approval' },
        { status: 400 }
      )
    }

    // Update post status
    if (action === 'approve') {
      await query(
        `UPDATE feed_posts 
         SET status = 'published', approved_by = $1, approved_at = CURRENT_TIMESTAMP
         WHERE post_id = $2`,
        [user.employeeId, postId]
      )

      // Log activity (Note: activity_log doesn't support 'feed_post' entity type yet)
      // TODO: Add 'feed_post' to activity_log entity_type constraint or create separate feed_activity_log table
      // Skipping activity log for now to avoid constraint violation

      return NextResponse.json({
        success: true,
        message: 'Post approved successfully'
      })
    } else {
      // Reject post
      await query(
        `UPDATE feed_posts 
         SET status = 'rejected', approved_by = $1, approved_at = CURRENT_TIMESTAMP
         WHERE post_id = $2`,
        [user.employeeId, postId]
      )

      // Log activity (Note: activity_log doesn't support 'feed_post' entity type yet)
      // TODO: Add 'feed_post' to activity_log entity_type constraint or create separate feed_activity_log table
      // Skipping activity log for now to avoid constraint violation

      return NextResponse.json({
        success: true,
        message: 'Post rejected'
      })
    }
  } catch (error) {
    console.error('Error approving/rejecting post:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

