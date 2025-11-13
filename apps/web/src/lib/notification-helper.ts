/**
 * Notification Helper Functions
 *
 * Utilities for creating and managing feed notifications
 */

import { getPool } from '@/lib/db'
import { sendPushNotification, getNotificationPriority } from './push-notification-service'

const getPoolInstance = () => getPool()

export interface CreateNotificationParams {
  userId: string // recipient
  actorId: string // who triggered the notification
  notificationType: 'mention' | 'comment' | 'reaction' | 'post_approved' | 'post_rejected' | 'reply'
  postId?: string
  commentId?: string
  mentionId?: string
  title: string
  message?: string
  linkUrl?: string
  metadata?: Record<string, any>
}

/**
 * Create a notification in the database
 */
export async function createNotification(params: CreateNotificationParams): Promise<string> {
  const {
    userId,
    actorId,
    notificationType,
    postId,
    commentId,
    mentionId,
    title,
    message,
    linkUrl,
    metadata
  } = params

  // Don't create notification if user is notifying themselves
  if (userId === actorId) {
    return ''
  }

  // Generate notification ID
  const notificationId = `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

  const result = await getPoolInstance().query(
    `INSERT INTO feed_notifications (
      notification_id, user_id, actor_id, notification_type,
      post_id, comment_id, mention_id,
      title, message, link_url, metadata,
      is_read, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, CURRENT_TIMESTAMP)
    RETURNING notification_id`,
    [
      notificationId,
      userId,
      actorId,
      notificationType,
      postId || null,
      commentId || null,
      mentionId || null,
      title,
      message || null,
      linkUrl || null,
      metadata ? JSON.stringify(metadata) : null
    ]
  )

  // Send push notification (don't await - fire and forget)
  sendPushNotification(userId, {
    title,
    body: message || title,
    data: {
      notificationId,
      type: notificationType === 'mention' || notificationType === 'comment' || notificationType === 'reaction' ? 'feed' : notificationType,
      postId,
      commentId,
      linkUrl
    },
    priority: getNotificationPriority(notificationType)
  }).catch(error => {
    // Don't fail the notification creation if push notification fails
    console.error('[createNotification] Failed to send push notification:', error)
  })

  return result.rows[0]?.notification_id || ''
}

/**
 * Create notification for a mention
 */
export async function createMentionNotification(
  mentionedUserId: string,
  mentionedByUserId: string,
  mentionId: string,
  postId?: string,
  commentId?: string,
  mentionedByUserName?: string
): Promise<string> {
  const actorName = mentionedByUserName || 'Someone'
  const title = commentId
    ? `${actorName} mentioned you in a comment`
    : `${actorName} mentioned you in a post`

  const linkUrl = postId ? `/feed?post=${postId}` : `/feed`

  return createNotification({
    userId: mentionedUserId,
    actorId: mentionedByUserId,
    notificationType: 'mention',
    postId,
    commentId,
    mentionId,
    title,
    linkUrl
  })
}

/**
 * Create notification for a comment
 */
export async function createCommentNotification(
  postAuthorId: string,
  commentAuthorId: string,
  postId: string,
  commentId: string,
  commentAuthorName?: string
): Promise<string> {
  const actorName = commentAuthorName || 'Someone'
  const title = `${actorName} commented on your post`

  return createNotification({
    userId: postAuthorId,
    actorId: commentAuthorId,
    notificationType: 'comment',
    postId,
    commentId,
    title,
    linkUrl: `/feed?post=${postId}`
  })
}

/**
 * Create notification for a reaction
 */
export async function createReactionNotification(
  postAuthorId: string,
  reactorId: string,
  postId: string,
  emoji: string,
  reactorName?: string
): Promise<string> {
  const actorName = reactorName || 'Someone'
  const title = `${actorName} reacted ${emoji} to your post`

  return createNotification({
    userId: postAuthorId,
    actorId: reactorId,
    notificationType: 'reaction',
    postId,
    title,
    linkUrl: `/feed?post=${postId}`,
    metadata: { emoji }
  })
}

/**
 * Create notification for post approval/rejection
 */
export async function createPostStatusNotification(
  postAuthorId: string,
  reviewerId: string,
  postId: string,
  status: 'approved' | 'rejected',
  reviewerName?: string
): Promise<string> {
  const actorName = reviewerName || 'Someone'
  const title = status === 'approved'
    ? `${actorName} approved your post`
    : `${actorName} rejected your post`

  return createNotification({
    userId: postAuthorId,
    actorId: reviewerId,
    notificationType: status === 'approved' ? 'post_approved' : 'post_rejected',
    postId,
    title,
    linkUrl: `/feed?post=${postId}`
  })
}

