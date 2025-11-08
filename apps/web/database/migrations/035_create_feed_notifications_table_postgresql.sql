-- Migration 035: Create Feed Notifications Table (PostgreSQL)
-- Date: 2025-11-08
-- Description: Creates table for tracking all feed-related notifications (mentions, reactions, comments, approvals)

-- Feed Notifications Table
CREATE TABLE IF NOT EXISTS feed_notifications (
  id SERIAL PRIMARY KEY,
  notification_id VARCHAR(100) UNIQUE NOT NULL, -- format: 'NOTIF-{timestamp}-{random}'
  user_id VARCHAR(50) NOT NULL, -- references users.employee_id (the user receiving the notification)
  actor_id VARCHAR(50) NOT NULL, -- references users.employee_id (the user who triggered the notification)
  notification_type VARCHAR(50) NOT NULL, -- 'mention', 'comment', 'reaction', 'post_approved', 'post_rejected'
  
  -- References to related entities (at least one must be set)
  post_id VARCHAR(100), -- references feed_posts.post_id
  comment_id VARCHAR(100), -- references feed_comments.comment_id
  mention_id VARCHAR(100), -- references feed_mentions.mention_id
  
  -- Notification content
  title VARCHAR(255) NOT NULL, -- e.g., "John mentioned you in a post"
  message TEXT, -- optional detailed message
  link_url VARCHAR(500), -- URL to navigate to when clicked (e.g., /feed?post=POST-123)
  
  -- Metadata
  metadata JSONB, -- additional data (e.g., reaction emoji, comment preview, etc.)
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  deleted_by VARCHAR(50) NULL,
  
  -- Constraints
  CONSTRAINT chk_notification_type CHECK (
    notification_type IN ('mention', 'comment', 'reaction', 'post_approved', 'post_rejected', 'reply')
  ),
  CONSTRAINT chk_has_reference CHECK (
    post_id IS NOT NULL OR comment_id IS NOT NULL OR mention_id IS NOT NULL
  )
);

-- Create indexes for feed_notifications
CREATE INDEX IF NOT EXISTS idx_feed_notifications_user ON feed_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_notifications_actor ON feed_notifications(actor_id);
CREATE INDEX IF NOT EXISTS idx_feed_notifications_type ON feed_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_feed_notifications_post ON feed_notifications(post_id);
CREATE INDEX IF NOT EXISTS idx_feed_notifications_comment ON feed_notifications(comment_id);
CREATE INDEX IF NOT EXISTS idx_feed_notifications_mention ON feed_notifications(mention_id);
CREATE INDEX IF NOT EXISTS idx_feed_notifications_is_read ON feed_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_feed_notifications_created_at ON feed_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_feed_notifications_deleted ON feed_notifications(deleted_at);

-- Composite index for common query pattern (user's unread notifications)
CREATE INDEX IF NOT EXISTS idx_feed_notifications_user_unread ON feed_notifications(user_id, is_read, created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE feed_notifications IS 'Stores all feed-related notifications for users';
COMMENT ON COLUMN feed_notifications.user_id IS 'The user who receives this notification';
COMMENT ON COLUMN feed_notifications.actor_id IS 'The user who triggered this notification (e.g., who mentioned, commented, reacted)';
COMMENT ON COLUMN feed_notifications.notification_type IS 'Type of notification: mention, comment, reaction, post_approved, post_rejected, reply';
COMMENT ON COLUMN feed_notifications.post_id IS 'References feed_posts.post_id if notification is related to a post';
COMMENT ON COLUMN feed_notifications.comment_id IS 'References feed_comments.comment_id if notification is related to a comment';
COMMENT ON COLUMN feed_notifications.mention_id IS 'References feed_mentions.mention_id if notification is for a mention';
COMMENT ON COLUMN feed_notifications.title IS 'Short notification title shown in UI';
COMMENT ON COLUMN feed_notifications.message IS 'Optional detailed message or preview text';
COMMENT ON COLUMN feed_notifications.link_url IS 'URL to navigate to when notification is clicked';
COMMENT ON COLUMN feed_notifications.metadata IS 'Additional data in JSON format (e.g., reaction emoji, comment preview)';
COMMENT ON COLUMN feed_notifications.is_read IS 'Whether the user has read this notification';
COMMENT ON COLUMN feed_notifications.read_at IS 'Timestamp when the notification was marked as read';

