/**
 * API Route: /api/feed/posts/[postId]/save
 * Purpose: Save/unsave posts to user's Saved Posts topic
 * Methods: POST
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db/config'
import { getAuthUser } from '@/lib/auth-server'

/**
 * POST /api/feed/posts/[postId]/save
 * Toggle save status (add to Saved Posts topic if not saved, remove if already saved)
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

    // Get or create user's Saved Posts topic
    let savedPostsTopics = await query(
      `SELECT * FROM feed_topics 
       WHERE is_saved = 1 AND owner_user_id = $1 AND deleted_at IS NULL`,
      [user.employeeId]
    )

    let savedTopicId: number

    if (savedPostsTopics.length === 0) {
      // Create Saved Posts topic
      const newTopic = await query(
        `INSERT INTO feed_topics (
          topic_name, description, icon, display_order, 
          is_saved, owner_user_id, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
        [
          'Saved Posts',
          'Posts you have saved for later',
          '🔖',
          10000,
          1,
          user.employeeId,
          user.employeeId
        ]
      )
      savedTopicId = newTopic[0].id
    } else {
      savedTopicId = savedPostsTopics[0].id
    }

    // Check if post is already saved
    const existingSaves = await query(
      `SELECT * FROM feed_post_topics 
       WHERE post_id = $1 AND topic_id = $2`,
      [postId, savedTopicId]
    )

    if (existingSaves.length > 0) {
      // Unsave: remove from Saved Posts topic
      await query(
        `DELETE FROM feed_post_topics 
         WHERE post_id = $1 AND topic_id = $2`,
        [postId, savedTopicId]
      )

      // Log activity (Note: activity_log doesn't support 'feed_post' entity type yet)
      // TODO: Add 'feed_post' to activity_log entity_type constraint or create separate feed_activity_log table
      // Skipping activity log for now to avoid constraint violation

      return NextResponse.json({
        success: true,
        action: 'unsaved',
        message: 'Post removed from Saved Posts'
      })
    } else {
      // Save: add to Saved Posts topic
      await query(
        `INSERT INTO feed_post_topics (post_id, topic_id, created_by)
         VALUES ($1, $2, $3)`,
        [postId, savedTopicId, user.employeeId]
      )

      // Log activity (Note: activity_log doesn't support 'feed_post' entity type yet)
      // TODO: Add 'feed_post' to activity_log entity_type constraint or create separate feed_activity_log table
      // Skipping activity log for now to avoid constraint violation

      return NextResponse.json({
        success: true,
        action: 'saved',
        message: 'Post saved successfully'
      })
    }
  } catch (error) {
    console.error('Error toggling save status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to toggle save status' },
      { status: 500 }
    )
  }
}

