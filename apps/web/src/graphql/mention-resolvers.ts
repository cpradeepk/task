/**
 * GraphQL Resolvers for Feed Mentions
 */

import { getPool } from '@/lib/db'
import {
  logResolverStart,
  logResolverSuccess,
  logResolverError,
  logDatabaseQuery,
  logDatabaseResult
} from '@/lib/graphql-logger'

const getPoolInstance = () => getPool()

export const mentionQueries = {
  /**
   * Get mentions for a user
   * @param userId - Filter by mentioned user ID (optional)
   * @param isRead - Filter by read status (optional)
   * @param limit - Number of mentions to return (default: 20)
   * @param offset - Offset for pagination (default: 0)
   */
  feedMentions: async (_: any, { userId: requestedUserId, isRead, limit = 20, offset = 0 }: any, context: any) => {
    const authUserId = context?.user?.employeeId
    if (!authUserId) throw new Error('UNAUTHENTICATED: You must be signed in.')
    // Non-admins may only read their own mentions
    const userId = context.user.role === 'admin' ? (requestedUserId || authUserId) : authUserId
    const { startTime } = logResolverStart('feedMentions', { userId, isRead, limit, offset })

    try {
      let query = 'SELECT * FROM feed_mentions WHERE deleted_at IS NULL'
      const params: any[] = []
      let paramIndex = 1

      if (userId) {
        query += ` AND mentioned_user_id = $${paramIndex++}`
        params.push(userId)
      }

      if (isRead !== undefined && isRead !== null) {
        query += ` AND is_read = $${paramIndex++}`
        params.push(isRead)
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
      params.push(limit, offset)

      const dbStart = logDatabaseQuery(query, params, 'feedMentions')
      const result = await getPoolInstance().query(query, params)
      logDatabaseResult(result.rows.length, dbStart.startTime, 'feedMentions')

      logResolverSuccess('feedMentions', result.rows, startTime)
      return result.rows
    } catch (error) {
      logResolverError('feedMentions', error, startTime)
      throw error
    }
  },

  /**
   * Get a single mention by ID
   */
  feedMention: async (_: any, { mentionId }: any) => {
    const { startTime } = logResolverStart('feedMention', { mentionId })

    try {
      const dbStart = logDatabaseQuery(
        'SELECT * FROM feed_mentions WHERE mention_id = $1 AND deleted_at IS NULL',
        [mentionId],
        'feedMention'
      )
      const result = await getPoolInstance().query(
        'SELECT * FROM feed_mentions WHERE mention_id = $1 AND deleted_at IS NULL',
        [mentionId]
      )
      logDatabaseResult(result.rows.length, dbStart.startTime, 'feedMention')

      const mention = result.rows[0] || null
      logResolverSuccess('feedMention', mention, startTime)
      return mention
    } catch (error) {
      logResolverError('feedMention', error, startTime)
      throw error
    }
  }
}

export const mentionMutations = {
  /**
   * Mark a mention as read
   */
  markMentionAsRead: async (_: any, { mentionId }: any) => {
    const { startTime } = logResolverStart('markMentionAsRead', { mentionId })

    try {
      const dbStart = logDatabaseQuery(
        'UPDATE feed_mentions SET is_read = true WHERE mention_id = $1 AND deleted_at IS NULL RETURNING *',
        [mentionId],
        'markMentionAsRead'
      )
      const result = await getPoolInstance().query(
        'UPDATE feed_mentions SET is_read = true WHERE mention_id = $1 AND deleted_at IS NULL RETURNING *',
        [mentionId]
      )
      logDatabaseResult(result.rows.length, dbStart.startTime, 'markMentionAsRead')

      const mention = result.rows[0]
      if (!mention) {
        throw new Error(`Mention ${mentionId} not found`)
      }

      logResolverSuccess('markMentionAsRead', mention, startTime)
      return mention
    } catch (error) {
      logResolverError('markMentionAsRead', error, startTime)
      throw error
    }
  },

  /**
   * Mark all mentions as read for a user
   */
  markAllMentionsAsRead: async (_: any, { userId: requestedUserId }: any, context: any) => {
    const authUserId = context?.user?.employeeId
    if (!authUserId) throw new Error('UNAUTHENTICATED: You must be signed in.')
    const userId = context.user.role === 'admin' ? (requestedUserId || authUserId) : authUserId
    const { startTime } = logResolverStart('markAllMentionsAsRead', { userId })

    try {
      const dbStart = logDatabaseQuery(
        'UPDATE feed_mentions SET is_read = true WHERE mentioned_user_id = $1 AND is_read = false AND deleted_at IS NULL',
        [userId],
        'markAllMentionsAsRead'
      )
      const result = await getPoolInstance().query(
        'UPDATE feed_mentions SET is_read = true WHERE mentioned_user_id = $1 AND is_read = false AND deleted_at IS NULL',
        [userId]
      )
      logDatabaseResult(result.rowCount || 0, dbStart.startTime, 'markAllMentionsAsRead')

      logResolverSuccess('markAllMentionsAsRead', true, startTime)
      return true
    } catch (error) {
      logResolverError('markAllMentionsAsRead', error, startTime)
      throw error
    }
  }
}

export const mentionFieldResolvers = {
  FeedMention: {
    mentionId: (mention: any) => mention.mention_id,
    postId: (mention: any) => mention.post_id,
    commentId: (mention: any) => mention.comment_id,
    mentionedUserId: (mention: any) => mention.mentioned_user_id,
    mentionedByUserId: (mention: any) => mention.mentioned_by_user_id,
    mentionText: (mention: any) => mention.mention_text,
    contextText: (mention: any) => mention.context_text,
    isRead: (mention: any) => mention.is_read || false,
    createdAt: (mention: any) => mention.created_at,

    // Resolve mentioned user
    mentionedUser: async (mention: any, _: any, { loaders }: any) => {
      if (!mention.mentioned_user_id) return null
      try {
        return await loaders.userLoader.load(mention.mentioned_user_id)
      } catch (error) {
        console.error('[FeedMention.mentionedUser] Failed to load user:', error)
        return null
      }
    },

    // Resolve user who created the mention
    mentionedByUser: async (mention: any, _: any, { loaders }: any) => {
      if (!mention.mentioned_by_user_id) return null
      try {
        return await loaders.userLoader.load(mention.mentioned_by_user_id)
      } catch (error) {
        console.error('[FeedMention.mentionedByUser] Failed to load user:', error)
        return null
      }
    },

    // Resolve post (if mention is in a post)
    post: async (mention: any) => {
      if (!mention.post_id) return null
      try {
        const result = await getPoolInstance().query(
          'SELECT * FROM feed_posts WHERE post_id = $1 AND deleted_at IS NULL',
          [mention.post_id]
        )
        return result.rows[0] || null
      } catch (error) {
        console.error('[FeedMention.post] Failed to load post:', error)
        return null
      }
    },

    // Resolve comment (if mention is in a comment)
    comment: async (mention: any) => {
      if (!mention.comment_id) return null
      try {
        const result = await getPoolInstance().query(
          'SELECT * FROM feed_comments WHERE comment_id = $1 AND deleted_at IS NULL',
          [mention.comment_id]
        )
        return result.rows[0] || null
      } catch (error) {
        console.error('[FeedMention.comment] Failed to load comment:', error)
        return null
      }
    }
  }
}

