-- ============================================================================
-- Migration 021: Add Attachments to Activity Log
-- Description: Add attachments column to activity_log table for comment attachments
-- Date: 2025-11-05
-- Database: PostgreSQL (Supabase)
-- ============================================================================

-- Add attachments column to activity_log table
-- Stores comma-separated S3 URLs for files attached to comments
ALTER TABLE activity_log 
ADD COLUMN attachments TEXT DEFAULT NULL;

-- Add comment to column for documentation
COMMENT ON COLUMN activity_log.attachments IS 'Comma-separated S3 URLs for files attached to comments';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'activity_log'
ORDER BY ordinal_position;

-- ============================================================================
-- Usage Examples
-- ============================================================================

-- Example: Comment with single attachment
-- INSERT INTO activity_log (entity_type, entity_id, user_id, action_type, description, is_comment, attachments)
-- VALUES ('task', 'JSR-001', 'AM-0001', 'comment', 'Screenshot of the issue', 1, 'https://amtariksha.s3.ap-south-1.amazonaws.com/comments/1730812345-abc123-screenshot.png');

-- Example: Comment with multiple attachments
-- INSERT INTO activity_log (entity_type, entity_id, user_id, action_type, description, is_comment, attachments)
-- VALUES ('bug', 'BUG-001', 'AM-0002', 'comment', 'Video showing the bug', 1, 'https://amtariksha.s3.ap-south-1.amazonaws.com/comments/1730812345-abc123-video.mp4, https://amtariksha.s3.ap-south-1.amazonaws.com/comments/1730812346-def456-screenshot.png');

-- ============================================================================
-- Rollback (if needed)
-- ============================================================================

-- To rollback this migration:
-- ALTER TABLE activity_log DROP COLUMN attachments;

-- ============================================================================

