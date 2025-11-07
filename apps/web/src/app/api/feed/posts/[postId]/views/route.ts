/**
 * API Route: /api/feed/posts/[postId]/views
 * Purpose: Track post views
 * Methods: POST
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db/config'
import { getAuthUser } from '@/lib/auth-server'

/**
 * POST /api/feed/posts/[postId]/views
 * Track a view for a post (idempotent - only one view per user per post)
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

    // Check if user already viewed this post
    const existingViews = await query(
      `SELECT * FROM feed_views WHERE post_id = $1 AND user_id = $2`,
      [postId, user.employeeId]
    )

    if (existingViews.length > 0) {
      // Already viewed, just return success
      return NextResponse.json({
        success: true,
        message: 'View already recorded'
      })
    }

    // Record view
    await query(
      `INSERT INTO feed_views (post_id, user_id)
       VALUES ($1, $2)`,
      [postId, user.employeeId]
    )

    return NextResponse.json({
      success: true,
      message: 'View recorded'
    })
  } catch (error) {
    console.error('Error recording view:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to record view' },
      { status: 500 }
    )
  }
}

