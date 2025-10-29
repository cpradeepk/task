-- ============================================================================
-- Migration 011: Activity Log Table
-- ============================================================================
-- Description: Creates a unified activity log table for tracking all changes
--              and comments across tasks, bugs, leaves, and WFH applications
-- Created: 2025-10-27
-- ============================================================================

-- Create activity_log table
CREATE TABLE IF NOT EXISTS activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entity_type ENUM('task', 'bug', 'leave', 'wfh') NOT NULL COMMENT 'Type of entity this activity belongs to',
    entity_id VARCHAR(100) NOT NULL COMMENT 'ID of the task, bug, leave, or WFH application',
    user_id VARCHAR(50) NOT NULL COMMENT 'Employee ID of the user who performed the action',
    action_type VARCHAR(50) NOT NULL COMMENT 'Type of action: comment, status_change, field_update, etc.',
    field_name VARCHAR(100) DEFAULT NULL COMMENT 'Name of the field that was changed (for field_update)',
    old_value TEXT DEFAULT NULL COMMENT 'Previous value of the field',
    new_value TEXT DEFAULT NULL COMMENT 'New value of the field',
    description TEXT NOT NULL COMMENT 'Human-readable description of the activity',
    is_comment BOOLEAN DEFAULT FALSE COMMENT 'TRUE if this is a user comment, FALSE if system-generated activity',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When this activity occurred',
    
    -- Indexes for fast queries
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_action_type (action_type),
    INDEX idx_is_comment (is_comment),
    INDEX idx_entity_created (entity_type, entity_id, created_at),
    
    -- Foreign key constraint
    FOREIGN KEY (user_id) REFERENCES users(employee_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Unified activity log for all entities (tasks, bugs, leaves, WFH)';

-- ============================================================================
-- Sample Data for Testing (Optional - Comment out for production)
-- ============================================================================

-- Example: Task created
-- INSERT INTO activity_log (entity_type, entity_id, user_id, action_type, description, is_comment)
-- VALUES ('task', 'JSR-001', 'AM-0001', 'created', 'Task created by John Doe', FALSE);

-- Example: Status change
-- INSERT INTO activity_log (entity_type, entity_id, user_id, action_type, field_name, old_value, new_value, description, is_comment)
-- VALUES ('task', 'JSR-001', 'AM-0001', 'status_change', 'status', 'Yet to Start', 'In Progress', 'Status changed from ''Yet to Start'' to ''In Progress''', FALSE);

-- Example: User comment
-- INSERT INTO activity_log (entity_type, entity_id, user_id, action_type, description, is_comment)
-- VALUES ('task', 'JSR-001', 'AM-0001', 'comment', 'Working on the API integration. Should be done by EOD.', TRUE);

-- Example: Assignment change
-- INSERT INTO activity_log (entity_type, entity_id, user_id, action_type, field_name, old_value, new_value, description, is_comment)
-- VALUES ('task', 'JSR-001', 'AM-0002', 'assignment_change', 'assigned_to', 'AM-0001', 'AM-0003', 'Assigned to Jane Smith by John Manager', FALSE);

-- Example: Timer started
-- INSERT INTO activity_log (entity_type, entity_id, user_id, action_type, description, is_comment)
-- VALUES ('task', 'JSR-001', 'AM-0001', 'timer_started', 'Timer started', FALSE);

-- Example: Timer stopped with hours logged
-- INSERT INTO activity_log (entity_type, entity_id, user_id, action_type, field_name, new_value, description, is_comment)
-- VALUES ('task', 'JSR-001', 'AM-0001', 'time_logged', 'actual_hours', '2.5', 'Logged 2.5 hours', FALSE);

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check table structure
DESCRIBE activity_log;

-- Check indexes
SHOW INDEX FROM activity_log;

-- Count records (should be 0 for fresh migration)
SELECT COUNT(*) as total_records FROM activity_log;

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 
-- Action Types:
-- - comment: User-written comment (is_comment = TRUE)
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
-- 1. Run this migration: source apps/web/database/migrations/011_activity_log_table.sql
-- 2. Verify table creation: DESCRIBE activity_log;
-- 3. Start using activity log in application code
-- 
-- Future Enhancements:
-- - Migrate existing bug_comments to activity_log (optional)
-- - Add attachments support for comments
-- - Add reactions/likes to comments
-- - Add @mentions in comments
-- 
-- ============================================================================

