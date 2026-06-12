/**
 * Notification Helper Functions
 *
 * Utilities for creating and managing feed notifications
 */

import { getPool } from '@/lib/db'
import { sendPushNotification, getNotificationPriority } from './push-notification-service'
import { shouldNotify } from '@/lib/db/notificationPreferences'

const getPoolInstance = () => getPool()

export interface CreateNotificationParams {
  userId: string // recipient
  actorId: string // who triggered the notification
  notificationType: string
  postId?: string
  commentId?: string
  mentionId?: string
  taskId?: string
  bugId?: string
  title: string
  message?: string
  linkUrl?: string
  metadata?: Record<string, any>
}

function mapNotificationTypeToPrefKey(type: string): string | null {
  switch (type) {
    case 'mention': return 'taskCommented'
    case 'comment': return 'taskCommented'
    case 'reaction': return 'taskCommented'
    case 'task_assigned': return 'taskAssigned'
    case 'task_updated': return 'taskUpdated'
    case 'task_completed': return 'taskCompleted'
    case 'task_support_assigned': return 'taskSupportAssigned'
    case 'task_due_soon': return 'taskDueSoon'
    case 'task_overdue': return 'taskOverdue'
    case 'bug_assigned': return 'bugAssigned'
    case 'bug_updated': return 'bugUpdated'
    case 'bug_status_changed': return 'bugStatusChanged'
    case 'bug_severity_changed': return 'bugSeverityChanged'
    case 'leave_approved': return 'leaveApproved'
    case 'leave_rejected': return 'leaveRejected'
    case 'wfh_approved': return 'wfhApproved'
    case 'wfh_rejected': return 'wfhRejected'
    default: return null
  }
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
    taskId,
    bugId,
    title,
    message,
    linkUrl,
    metadata
  } = params

  // Don't create notification if user is notifying themselves
  if (userId === actorId) {
    return ''
  }

  // Check user preferences
  const prefKey = mapNotificationTypeToPrefKey(notificationType)
  if (prefKey) {
    const isAllowed = await shouldNotify(userId, prefKey as any, 'in_app')
    if (!isAllowed) {
      console.log(`[createNotification] Notification of type ${notificationType} to user ${userId} is disabled by preferences`)
      return ''
    }
  }

  // Generate notification ID
  const notificationId = `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

  const result = await getPoolInstance().query(
    `INSERT INTO feed_notifications (
      notification_id, user_id, actor_id, notification_type,
      post_id, comment_id, mention_id, task_id, bug_id,
      title, message, link_url, metadata,
      is_read, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, false, CURRENT_TIMESTAMP)
    RETURNING notification_id`,
    [
      notificationId,
      userId,
      actorId,
      notificationType,
      postId || null,
      commentId || null,
      mentionId || null,
      taskId || null,
      bugId || null,
      title,
      message || null,
      linkUrl || null,
      metadata ? JSON.stringify(metadata) : null
    ]
  )

  // Map notification type to push notification type
  const mapNotificationTypeToPushType = (type: string): 'task' | 'bug' | 'leave' | 'wfh' | 'feed' | 'mention' | 'comment' | 'reaction' | undefined => {
    if (['mention', 'comment', 'reaction', 'reply', 'post_approved', 'post_rejected'].includes(type)) {
      return 'feed'
    }
    if (type.startsWith('task_')) return 'task'
    if (type.startsWith('bug_')) return 'bug'
    return type as any
  }

  // Send push notification (don't await - fire and forget)
  sendPushNotification(userId, {
    title,
    body: message || title,
    data: {
      notificationId,
      type: mapNotificationTypeToPushType(notificationType),
      postId,
      commentId,
      taskId,
      bugId,
      linkUrl
    },
    priority: getNotificationPriority(notificationType.startsWith('task_') ? 'task' : (notificationType.startsWith('bug_') ? 'bug' : notificationType))
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

