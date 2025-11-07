/**
 * API Route: /api/feed/posts/[postId]/reactions
 * Purpose: Add/remove reactions to posts
 * Methods: POST, DELETE
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db/config'
import { getAuthUser } from '@/lib/auth-server'

/**
 * POST /api/feed/posts/[postId]/reactions
 * Body: { emoji: string }
 * Toggles reaction (add if not exists, remove if exists)
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
    const { emoji } = body

    if (!emoji) {
      return NextResponse.json(
        { success: false, error: 'Emoji is required' },
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

    // Check if user already reacted with this emoji
    const existingReactions = await query(
      `SELECT * FROM feed_reactions 
       WHERE post_id = $1 AND user_id = $2 AND emoji = $3 AND deleted_at IS NULL`,
      [postId, user.employeeId, emoji]
    )

    if (existingReactions.length > 0) {
      // Remove reaction (toggle off)
      await query(
        `UPDATE feed_reactions 
         SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $1
         WHERE post_id = $2 AND user_id = $3 AND emoji = $4`,
        [user.employeeId, postId, user.employeeId, emoji]
      )

      return NextResponse.json({
        success: true,
        action: 'removed',
        message: 'Reaction removed'
      })
    } else {
      // Add reaction
      await query(
        `INSERT INTO feed_reactions (post_id, user_id, emoji)
         VALUES ($1, $2, $3)`,
        [postId, user.employeeId, emoji]
      )

      // Log activity (Note: activity_log doesn't support 'feed_post' entity type yet)
      // TODO: Add 'feed_post' to activity_log entity_type constraint or create separate feed_activity_log table
      // Skipping activity log for now to avoid constraint violation

      return NextResponse.json({
        success: true,
        action: 'added',
        message: 'Reaction added'
      })
    }
  } catch (error) {
    console.error('Error toggling reaction:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to toggle reaction' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/feed/posts/[postId]/reactions
 * Get all reactions for a post with user details
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

    // Get all reactions with user details
    const reactions = await query(
      `SELECT 
        fr.emoji,
        fr.user_id,
        fr.created_at,
        u.name as user_name,
        u.profile_picture as user_avatar
       FROM feed_reactions fr
       LEFT JOIN users u ON fr.user_id = u.employee_id
       WHERE fr.post_id = $1 AND fr.deleted_at IS NULL
       ORDER BY fr.created_at DESC`,
      [postId]
    )

    // Group by emoji
    const groupedReactions: Record<string, any[]> = {}
    reactions.forEach((reaction: any) => {
      if (!groupedReactions[reaction.emoji]) {
        groupedReactions[reaction.emoji] = []
      }
      groupedReactions[reaction.emoji].push({
        userId: reaction.user_id,
        userName: reaction.user_name,
        userAvatar: reaction.user_avatar,
        createdAt: reaction.created_at
      })
    })

    return NextResponse.json({
      success: true,
      data: groupedReactions
    })
  } catch (error) {
    console.error('Error fetching reactions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reactions' },
      { status: 500 }
    )
  }
}

