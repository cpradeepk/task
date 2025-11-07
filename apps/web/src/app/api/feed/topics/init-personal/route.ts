/**
 * API Route: /api/feed/topics/init-personal
 * Purpose: Initialize personal topics for a user (Personal Notes, Saved Posts)
 * Methods: POST
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db/config'
import { getAuthUser } from '@/lib/auth-server'

/**
 * POST /api/feed/topics/init-personal
 * Auto-create Personal Notes and Saved Posts topics for current user if they don't exist
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const createdTopics: string[] = []

    // Check if Personal Notes topic exists for this user
    const personalNotesTopics = await query(
      `SELECT * FROM feed_topics
       WHERE is_personal = true AND owner_user_id = $1 AND deleted_at IS NULL`,
      [user.employeeId]
    )

    if (personalNotesTopics.length === 0) {
      // Create Personal Notes topic
      await query(
        `INSERT INTO feed_topics (
          topic_name, description, icon, display_order, 
          is_personal, owner_user_id, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'Personal Notes',
          'Your private notes and thoughts',
          '🔒',
          9999, // High display order to show at bottom
          true, // is_personal
          user.employeeId,
          user.employeeId
        ]
      )
      createdTopics.push('Personal Notes')
    }

    // Check if Saved Posts topic exists for this user
    const savedPostsTopics = await query(
      `SELECT * FROM feed_topics
       WHERE is_saved = true AND owner_user_id = $1 AND deleted_at IS NULL`,
      [user.employeeId]
    )

    if (savedPostsTopics.length === 0) {
      // Create Saved Posts topic
      await query(
        `INSERT INTO feed_topics (
          topic_name, description, icon, display_order, 
          is_saved, owner_user_id, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'Saved Posts',
          'Posts you have saved for later',
          '🔖',
          10000, // High display order to show at bottom
          true, // is_saved
          user.employeeId,
          user.employeeId
        ]
      )
      createdTopics.push('Saved Posts')
    }

    if (createdTopics.length > 0) {
      return NextResponse.json({
        success: true,
        message: `Created topics: ${createdTopics.join(', ')}`,
        created: createdTopics
      })
    } else {
      return NextResponse.json({
        success: true,
        message: 'Personal topics already exist',
        created: []
      })
    }
  } catch (error) {
    console.error('Error initializing personal topics:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to initialize personal topics' },
      { status: 500 }
    )
  }
}

