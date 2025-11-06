-- ============================================================================
-- Migration 027: Drop bug_comments Table (PostgreSQL)
-- Description: Remove deprecated bug_comments table - replaced by activity_log
-- Date: 2025-11-06
-- Database: PostgreSQL
-- ============================================================================

-- BACKGROUND:
-- The bug_comments table was originally used to store comments on bugs.
-- This functionality has been replaced by the unified activity_log table,
-- which handles comments for all entity types (tasks, bugs, leaves, WFH).
--
-- The activity_log table provides:
-- - Unified comment storage for all entities
-- - Better tracking with action_type and field_name
-- - Support for attachments (S3 URLs)
-- - Consistent API across all entity types
-- - Better performance with proper indexing
--
-- MIGRATION STRATEGY:
-- 1. Verify that bug_comments is no longer used in the codebase
-- 2. Drop the bug_comments table
-- 3. Update any remaining references to use activity_log instead

-- ============================================================================
-- Step 1: Verify no data will be lost (Optional - for safety)
-- ============================================================================

-- Check if there are any comments in bug_comments that are NOT in activity_log
-- Run this query manually before executing the migration:
/*
SELECT bc.bug_id, bc.commented_by, bc.comment_text, bc.timestamp
FROM bug_comments bc
WHERE NOT EXISTS (
  SELECT 1 FROM activity_log al
  WHERE al.entity_type = 'bug'
    AND al.entity_id = bc.bug_id
    AND al.user_id = bc.commented_by
    AND al.description = bc.comment_text
    AND al.is_comment = 1
);
*/

-- ============================================================================
-- Step 2: Drop the bug_comments table
-- ============================================================================

-- Drop foreign key constraints first (if they exist)
ALTER TABLE bug_comments DROP CONSTRAINT IF EXISTS fk_bug_comments_bug_id;
ALTER TABLE bug_comments DROP CONSTRAINT IF EXISTS fk_bug_comments_commented_by;
ALTER TABLE bug_comments DROP CONSTRAINT IF EXISTS bug_comments_bug_id_fkey;
ALTER TABLE bug_comments DROP CONSTRAINT IF EXISTS bug_comments_commented_by_fkey;

-- Drop indexes
DROP INDEX IF EXISTS idx_bug_comments_bug_id;
DROP INDEX IF EXISTS idx_bug_comments_commented_by;
DROP INDEX IF EXISTS idx_bug_comments_created_at;
DROP INDEX IF EXISTS idx_bug_id;
DROP INDEX IF EXISTS idx_commented_by;
DROP INDEX IF EXISTS idx_timestamp;

-- Drop the table
DROP TABLE IF EXISTS bug_comments;

-- ============================================================================
-- Step 3: Verification
-- ============================================================================

-- Verify the table was dropped
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'bug_comments'
    ) 
    THEN '❌ FAILED: bug_comments table still exists'
    ELSE '✅ SUCCESS: bug_comments table has been dropped'
  END AS migration_status;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- If you need to rollback this migration, recreate the table:
/*
CREATE TABLE bug_comments (
    id SERIAL PRIMARY KEY,
    bug_id VARCHAR(100) NOT NULL,
    comment TEXT NOT NULL,
    commented_by VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bug_comments_bug_id ON bug_comments(bug_id);
CREATE INDEX idx_bug_comments_commented_by ON bug_comments(commented_by);
CREATE INDEX idx_bug_comments_created_at ON bug_comments(created_at);

ALTER TABLE bug_comments ADD CONSTRAINT fk_bug_comments_bug_id
    FOREIGN KEY (bug_id) REFERENCES bugs(bug_id) ON DELETE CASCADE;
ALTER TABLE bug_comments ADD CONSTRAINT fk_bug_comments_commented_by
    FOREIGN KEY (commented_by) REFERENCES users(employee_id) ON DELETE CASCADE ON UPDATE CASCADE;
*/

-- ============================================================================
-- NOTES FOR DEVELOPERS
-- ============================================================================

-- After running this migration:
-- 1. Remove getBugComments() and addBugComment() functions from apps/web/src/lib/db/bugs.ts
-- 2. Remove the bug comments API route: apps/web/src/app/api/bugs/[bugId]/comments/route.ts
-- 3. Update any frontend components to use UnifiedTimeline component instead
-- 4. All bug comments should now use the activity_log table via createActivityLog()

-- Example of how to add a comment to a bug using activity_log:
/*
import { createActivityLog } from '@/lib/db/activityLog'

await createActivityLog({
  entityType: 'bug',
  entityId: bugId,
  userId: employeeId,
  actionType: 'comment',
  description: commentText,
  isComment: true,
  attachments: attachmentUrls // Optional: comma-separated S3 URLs
})
*/

