-- Migration 042: Relax Feed Notifications Table Constraints
-- Date: 2026-06-10
-- Description: Drops feed-specific check constraints to support task and bug notifications, and adds task/bug reference columns.

ALTER TABLE feed_notifications DROP CONSTRAINT IF EXISTS chk_notification_type;
ALTER TABLE feed_notifications DROP CONSTRAINT IF EXISTS chk_has_reference;

ALTER TABLE feed_notifications ADD COLUMN IF NOT EXISTS task_id VARCHAR(100) DEFAULT NULL;
ALTER TABLE feed_notifications ADD COLUMN IF NOT EXISTS bug_id VARCHAR(100) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_feed_notifications_task ON feed_notifications(task_id);
CREATE INDEX IF NOT EXISTS idx_feed_notifications_bug ON feed_notifications(bug_id);

COMMENT ON COLUMN feed_notifications.task_id IS 'References tasks.task_id if notification is related to a task';
COMMENT ON COLUMN feed_notifications.bug_id IS 'References bugs.bug_id if notification is related to a bug';
