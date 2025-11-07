/**
 * API Route: /api/feed/posts
 * Purpose: Fetch and create feed posts
 * Methods: GET, POST
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db/config'
import { getAuthUser } from '@/lib/auth-server'
import { v4 as uuidv4 } from 'uuid'

/**
 * GET /api/feed/posts
 * Query params:
 * - topicId: number (optional) - Filter by topic
 * - limit: number (default: 20) - Number of posts per page
 * - offset: number (default: 0) - Pagination offset
 * - search: string (optional) - Search in title and content
 * - status: string (optional) - Filter by status (pending_approval, published, rejected)
 * - sortBy: string (optional) - Sort by: latest (default), reactions, comments, views
 * - contentType: string (optional) - Filter by content type
 * - authorId: string (optional) - Filter by author
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const topicId = searchParams.get('topicId')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const sortBy = searchParams.get('sortBy') || 'latest'
    const contentType = searchParams.get('contentType')
    const authorId = searchParams.get('authorId')

    // Build query
    let sql = `
      SELECT DISTINCT
        fp.post_id,
        fp.content_type,
        fp.title,
        fp.content,
        fp.link_url,
        fp.og_title,
        fp.og_description,
        fp.og_image,
        fp.file_url,
        fp.file_name,
        fp.file_size,
        fp.youtube_url,
        fp.status,
        fp.created_by,
        fp.created_at,
        fp.approved_by,
        fp.approved_at,
        u.name as author_name,
        u.profile_picture as author_avatar
      FROM feed_posts fp
      LEFT JOIN users u ON fp.created_by = u.employee_id
      LEFT JOIN feed_post_topics fpt ON fp.post_id = fpt.post_id
      LEFT JOIN feed_topics ft ON fpt.topic_id = ft.id
      WHERE fp.deleted_at IS NULL
    `

    const params: any[] = []
    let paramIndex = 1

    // Privacy enforcement: exclude personal posts unless owned by current user
    sql += ` AND (
      ft.is_personal IS NULL OR ft.is_personal = false OR ft.owner_user_id = $${paramIndex++}
    )`
    params.push(user.employeeId)

    // Filter by status
    if (status) {
      sql += ` AND fp.status = $${paramIndex++}`
      params.push(status)
    } else {
      // Default: only show published/approved posts
      sql += ` AND (fp.status = 'published' OR fp.status = 'approved')`
    }

    // Filter by topic
    if (topicId) {
      sql += ` AND EXISTS (
        SELECT 1 FROM feed_post_topics fpt2
        WHERE fpt2.post_id = fp.post_id AND fpt2.topic_id = $${paramIndex++}
      )`
      params.push(topicId)
    }

    // Search filter (enhanced to include author name and topics)
    if (search) {
      sql += ` AND (
        fp.title ILIKE $${paramIndex++} OR
        fp.content ILIKE $${paramIndex++} OR
        u.name ILIKE $${paramIndex++} OR
        ft.topic_name ILIKE $${paramIndex++}
      )`
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
    }

    // Filter by content type
    if (contentType) {
      sql += ` AND fp.content_type = $${paramIndex++}`
      params.push(contentType)
    }

    // Filter by author
    if (authorId) {
      sql += ` AND fp.created_by = $${paramIndex++}`
      params.push(authorId)
    }

    // Sorting
    switch (sortBy) {
      case 'reactions':
        sql += ` ORDER BY (
          SELECT COUNT(*) FROM feed_reactions fr
          WHERE fr.post_id = fp.post_id AND fr.deleted_at IS NULL
        ) DESC, fp.created_at DESC`
        break
      case 'comments':
        sql += ` ORDER BY (
          SELECT COUNT(*) FROM feed_comments fc
          WHERE fc.post_id = fp.post_id AND fc.deleted_at IS NULL
        ) DESC, fp.created_at DESC`
        break
      case 'views':
        sql += ` ORDER BY (
          SELECT COUNT(*) FROM feed_views fv
          WHERE fv.post_id = fp.post_id
        ) DESC, fp.created_at DESC`
        break
      case 'latest':
      default:
        sql += ` ORDER BY fp.approved_at DESC, fp.created_at DESC`
        break
    }

    // Pagination
    sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    params.push(limit, offset)

    const posts = await query(sql, params)

    // Fetch topics, reactions, and comments for each post
    const postsWithDetails = await Promise.all(
      posts.map(async (post: any) => {
        // Get topics
        const topics = await query(
          `SELECT ft.id, ft.topic_name, ft.icon
           FROM feed_topics ft
           JOIN feed_post_topics fpt ON ft.id = fpt.topic_id
           WHERE fpt.post_id = $1`,
          [post.post_id]
        )

        // Get reaction counts
        const reactions = await query(
          `SELECT emoji, COUNT(*) as count
           FROM feed_reactions
           WHERE post_id = $1 AND deleted_at IS NULL
           GROUP BY emoji`,
          [post.post_id]
        )

        // Check if current user reacted
        const userReactions = await query(
          `SELECT emoji FROM feed_reactions
           WHERE post_id = $1 AND user_id = $2 AND deleted_at IS NULL`,
          [post.post_id, user.employeeId]
        )

        // Get comment count
        const commentCount = await query(
          `SELECT COUNT(*) as count FROM feed_comments
           WHERE post_id = $1 AND deleted_at IS NULL`,
          [post.post_id]
        )

        // Get view count
        const viewCount = await query(
          `SELECT COUNT(*) as count FROM feed_views
           WHERE post_id = $1`,
          [post.post_id]
        )

        return {
          ...post,
          topics,
          reactions: reactions.map((r: any) => ({
            emoji: r.emoji,
            count: parseInt(r.count)
          })),
          userReactions: userReactions.map((r: any) => r.emoji),
          commentCount: parseInt(commentCount[0]?.count || '0'),
          viewCount: parseInt(viewCount[0]?.count || '0')
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: postsWithDetails,
      pagination: {
        limit,
        offset,
        hasMore: posts.length === limit
      }
    })
  } catch (error) {
    console.error('Error fetching feed posts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/feed/posts
 * Create a new feed post
 * Body: {
 *   contentType: 'text' | 'link' | 'image' | 'video' | 'pdf' | 'youtube',
 *   title?: string,
 *   content?: string,
 *   linkUrl?: string,
 *   fileUrl?: string,
 *   fileName?: string,
 *   fileSize?: number,
 *   youtubeUrl?: string,
 *   topicIds: number[]
 * }
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

    const body = await request.json()
    const {
      contentType,
      title,
      content,
      linkUrl,
      ogTitle,
      ogDescription,
      ogImage,
      fileUrl,
      fileName,
      fileSize,
      youtubeUrl,
      topicIds
    } = body

    // Validate required fields
    if (!contentType) {
      return NextResponse.json(
        { success: false, error: 'Content type is required' },
        { status: 400 }
      )
    }

    if (!topicIds || topicIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one topic is required' },
        { status: 400 }
      )
    }

    // Validate content based on type
    if (contentType === 'text' && !content) {
      return NextResponse.json(
        { success: false, error: 'Content is required for text posts' },
        { status: 400 }
      )
    }

    if (contentType === 'link' && !linkUrl) {
      return NextResponse.json(
        { success: false, error: 'Link URL is required for link posts' },
        { status: 400 }
      )
    }

    if ((contentType === 'image' || contentType === 'video' || contentType === 'pdf') && !fileUrl) {
      return NextResponse.json(
        { success: false, error: 'File URL is required for file posts' },
        { status: 400 }
      )
    }

    if (contentType === 'youtube' && !youtubeUrl) {
      return NextResponse.json(
        { success: false, error: 'YouTube URL is required for YouTube posts' },
        { status: 400 }
      )
    }

    // Generate post ID
    const postId = `post_${uuidv4()}`

    // Determine status based on user role
    // Admins and management can publish directly, others need approval
    const status = ['admin', 'management', 'top_management'].includes(user.role)
      ? 'published'
      : 'pending_approval'

    const approvedAt = status === 'published' ? new Date() : null
    const approvedBy = status === 'published' ? user.employeeId : null

    // Insert post
    await query(
      `INSERT INTO feed_posts (
        post_id, content_type, title, content, link_url,
        og_title, og_description, og_image,
        file_url, file_name, file_size, youtube_url,
        status, created_by, approved_at, approved_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        postId, contentType, title || null, content || null, linkUrl || null,
        ogTitle || null, ogDescription || null, ogImage || null,
        fileUrl || null, fileName || null, fileSize || null, youtubeUrl || null,
        status, user.employeeId, approvedAt, approvedBy
      ]
    )

    // Insert post-topic relationships
    for (const topicId of topicIds) {
      await query(
        `INSERT INTO feed_post_topics (post_id, topic_id) VALUES ($1, $2)`,
        [postId, topicId]
      )
    }

    // Log activity (Note: activity_log doesn't support 'feed_post' entity type yet)
    // TODO: Add 'feed_post' to activity_log entity_type constraint or create separate feed_activity_log table
    // Skipping activity log for now to avoid constraint violation

    return NextResponse.json({
      success: true,
      data: {
        postId,
        status,
        message: status === 'published'
          ? 'Post published successfully'
          : 'Post submitted for approval'
      }
    })
  } catch (error) {
    console.error('Error creating feed post:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create post' },
      { status: 500 }
    )
  }
}

