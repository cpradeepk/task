-- ============================================================================
-- Migration: Add related_tasks field to tasks table
-- Description: Add related_tasks column to support multi-user task assignment
-- Created: 2025-10-26
-- ============================================================================

-- Add related_tasks column to tasks table
ALTER TABLE tasks 
ADD COLUMN related_tasks VARCHAR(500) NULL COMMENT 'Comma-separated list of related task IDs for multi-user assignments' AFTER sub_task;

-- Add index for performance
ALTER TABLE tasks
ADD INDEX idx_related_tasks (related_tasks);

-- ============================================================================
-- Notes:
-- - related_tasks stores comma-separated task IDs (e.g., "JSR-123,JSR-456")
-- - Used when a task is assigned to multiple users
-- - Each user gets their own task record, linked via related_tasks field
-- - Bugs table already has related_bugs field, so no changes needed there
-- ============================================================================

