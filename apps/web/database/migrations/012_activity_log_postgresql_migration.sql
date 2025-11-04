-- ============================================================================
-- Migration 012: Activity Log Table - PostgreSQL Schema Update
-- ============================================================================
-- Description: Updates the activity_log table to match the application's
--              expected schema with proper columns for tracking changes
--              and comments across tasks, bugs, leaves, and WFH applications
-- Created: 2025-11-04
-- Database: PostgreSQL (Supabase)
-- ============================================================================

-- IMPORTANT: This migration transforms the existing activity_log table
-- from the old schema (action, performed_by, changes) to the new schema
-- (action_type, user_id, field_name, old_value, new_value, description, is_comment)

-- Step 1: Backup existing data (if any)
-- CREATE TABLE activity_log_backup AS SELECT * FROM activity_log;

-- Step 2: Drop the old table (since it has incompatible structure)
DROP TABLE IF EXISTS activity_log CASCADE;

-- Step 3: Create the new activity_log table with correct schema
CREATE TABLE activity_log (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('task', 'bug', 'leave', 'wfh')),
    entity_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    field_name VARCHAR(100) DEFAULT NULL,
    old_value TEXT DEFAULT NULL,
    new_value TEXT DEFAULT NULL,
    description TEXT NOT NULL,
    is_comment SMALLINT DEFAULT 0 CHECK (is_comment IN (0, 1)),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 4: Add comments to columns for documentation
COMMENT ON TABLE activity_log IS 'Unified activity log for all entities (tasks, bugs, leaves, WFH)';
COMMENT ON COLUMN activity_log.entity_type IS 'Type of entity this activity belongs to';
COMMENT ON COLUMN activity_log.entity_id IS 'ID of the task, bug, leave, or WFH application';
COMMENT ON COLUMN activity_log.user_id IS 'Employee ID of the user who performed the action';
COMMENT ON COLUMN activity_log.action_type IS 'Type of action: comment, status_change, field_update, etc.';
COMMENT ON COLUMN activity_log.field_name IS 'Name of the field that was changed (for field_update)';
COMMENT ON COLUMN activity_log.old_value IS 'Previous value of the field';
COMMENT ON COLUMN activity_log.new_value IS 'New value of the field';
COMMENT ON COLUMN activity_log.description IS 'Human-readable description of the activity';
COMMENT ON COLUMN activity_log.is_comment IS '1 if this is a user comment, 0 if system-generated activity';
COMMENT ON COLUMN activity_log.created_at IS 'When this activity occurred';

-- Step 5: Create indexes for fast queries
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at);
CREATE INDEX idx_activity_log_action_type ON activity_log(action_type);
CREATE INDEX idx_activity_log_is_comment ON activity_log(is_comment);
CREATE INDEX idx_activity_log_entity_created ON activity_log(entity_type, entity_id, created_at);

-- Step 6: Add foreign key constraint
ALTER TABLE activity_log ADD CONSTRAINT fk_activity_log_user_id
    FOREIGN KEY (user_id) REFERENCES users(employee_id) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check table structure
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'activity_log'
ORDER BY ordinal_position;

-- Check indexes
SELECT 
    indexname, 
    indexdef
FROM pg_indexes
WHERE tablename = 'activity_log';

-- Count records (should be 0 after fresh migration)
SELECT COUNT(*) as total_records FROM activity_log;

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 
-- Action Types:
-- - comment: User-written comment (is_comment = 1)
-- - status_change: Status field updated
-- - field_update: Any other field changed
-- - assignment_change: Assignee changed
-- - time_logged: Hours logged to task/bug
-- - timer_started: Timer started
-- - timer_stopped: Timer stopped
-- - timer_paused: Timer paused
-- - created: Entity created
-- - deleted: Entity soft-deleted
-- - priority_change: Priority updated
-- - estimated_hours_change: Estimated hours updated
-- 
-- Usage:
-- 1. Connect to Supabase PostgreSQL database
-- 2. Run this migration file
-- 3. Verify table structure with verification queries above
-- 4. Application code will now work correctly with activity_log
-- 
-- IMPORTANT:
-- - This migration DROPS the existing activity_log table
-- - All existing activity log data will be LOST
-- - If you need to preserve data, uncomment the backup step and migrate data manually
-- - The is_comment column uses SMALLINT (0/1) instead of BOOLEAN for consistency
-- 
-- ============================================================================

