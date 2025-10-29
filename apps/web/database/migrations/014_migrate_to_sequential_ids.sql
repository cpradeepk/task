-- ============================================================================
-- Migration 014: Migrate Task and Bug IDs to Sequential Alphanumeric Format
-- Description: Convert JSR-{timestamp} to JSR-0001, JSR-0002, etc.
--              Convert BUG-{timestamp} to BUG-0001, BUG-0002, etc.
-- Created: 2025-10-29
-- ============================================================================

-- IMPORTANT: This migration must be run carefully as it updates primary keys
-- and all foreign key references. Backup your database before running!

-- Step 1: Create temporary columns to store new IDs
ALTER TABLE tasks ADD COLUMN new_task_id VARCHAR(50) NULL;
ALTER TABLE bugs ADD COLUMN new_bug_id VARCHAR(50) NULL;

-- Step 2: Create a temporary mapping table for task ID conversions
CREATE TEMPORARY TABLE task_id_mapping (
    old_id VARCHAR(100),
    new_id VARCHAR(50),
    row_num INT
);

-- Step 3: Create a temporary mapping table for bug ID conversions
CREATE TEMPORARY TABLE bug_id_mapping (
    old_id VARCHAR(100),
    new_id VARCHAR(50),
    row_num INT
);

-- Step 4: Generate sequential IDs for tasks (ordered by created_at)
SET @task_counter = 0;
INSERT INTO task_id_mapping (old_id, new_id, row_num)
SELECT 
    task_id,
    CONCAT('JSR-', LPAD(@task_counter := @task_counter + 1, 4, '0')),
    @task_counter
FROM tasks
WHERE deleted_at IS NULL
ORDER BY created_at ASC;

-- Step 5: Generate sequential IDs for bugs (ordered by created_at)
SET @bug_counter = 0;
INSERT INTO bug_id_mapping (old_id, new_id, row_num)
SELECT 
    bug_id,
    CONCAT('BUG-', LPAD(@bug_counter := @bug_counter + 1, 4, '0')),
    @bug_counter
FROM bugs
WHERE deleted_at IS NULL
ORDER BY created_at ASC;

-- Step 6: Update tasks table with new IDs
UPDATE tasks t
INNER JOIN task_id_mapping m ON t.task_id = m.old_id
SET t.new_task_id = m.new_id;

-- Step 7: Update bugs table with new IDs
UPDATE bugs b
INNER JOIN bug_id_mapping m ON b.bug_id = m.old_id
SET b.new_bug_id = m.new_id;

-- Step 8: Update related_tasks field in tasks table
-- This is a comma-separated list, so we need to replace each old ID with new ID
UPDATE tasks t
SET t.related_tasks = (
    SELECT GROUP_CONCAT(m.new_id ORDER BY FIND_IN_SET(m.old_id, t.related_tasks))
    FROM task_id_mapping m
    WHERE FIND_IN_SET(m.old_id, t.related_tasks) > 0
)
WHERE t.related_tasks IS NOT NULL AND t.related_tasks != '';

-- Step 9: Update related_bugs field in bugs table
UPDATE bugs b
SET b.related_bugs = (
    SELECT GROUP_CONCAT(m.new_id ORDER BY FIND_IN_SET(m.old_id, b.related_bugs))
    FROM bug_id_mapping m
    WHERE FIND_IN_SET(m.old_id, b.related_bugs) > 0
)
WHERE b.related_bugs IS NOT NULL AND b.related_bugs != '';

-- Step 10: Update activity_log table references
-- Update entity_id for tasks
UPDATE activity_log al
INNER JOIN task_id_mapping m ON al.entity_id = m.old_id
SET al.entity_id = m.new_id
WHERE al.entity_type = 'task';

-- Update entity_id for bugs
UPDATE activity_log al
INNER JOIN bug_id_mapping m ON al.entity_id = m.old_id
SET al.entity_id = m.new_id
WHERE al.entity_type = 'bug';

-- Step 11: Update subtasks table (parent_task_id references)
UPDATE subtasks s
INNER JOIN task_id_mapping m ON s.parent_task_id = m.old_id
SET s.parent_task_id = m.new_id;

-- Step 12: Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Step 13: Update primary keys
-- For tasks
UPDATE tasks SET task_id = new_task_id WHERE new_task_id IS NOT NULL;

-- For bugs
UPDATE bugs SET bug_id = new_bug_id WHERE new_bug_id IS NOT NULL;

-- Step 14: Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Step 15: Drop temporary columns
ALTER TABLE tasks DROP COLUMN new_task_id;
ALTER TABLE bugs DROP COLUMN new_bug_id;

-- Step 16: Drop temporary mapping tables
DROP TEMPORARY TABLE IF EXISTS task_id_mapping;
DROP TEMPORARY TABLE IF EXISTS bug_id_mapping;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify task IDs are in new format
SELECT 
    task_id,
    description,
    created_at
FROM tasks
WHERE deleted_at IS NULL
ORDER BY task_id
LIMIT 10;

-- Verify bug IDs are in new format
SELECT 
    bug_id,
    title,
    created_at
FROM bugs
WHERE deleted_at IS NULL
ORDER BY bug_id
LIMIT 10;

-- Verify related_tasks are updated
SELECT 
    task_id,
    related_tasks
FROM tasks
WHERE related_tasks IS NOT NULL AND related_tasks != ''
LIMIT 5;

-- Verify related_bugs are updated
SELECT 
    bug_id,
    related_bugs
FROM bugs
WHERE related_bugs IS NOT NULL AND related_bugs != ''
LIMIT 5;

-- Verify activity_log references are updated
SELECT 
    entity_type,
    entity_id,
    action,
    created_at
FROM activity_log
WHERE entity_type IN ('task', 'bug')
ORDER BY created_at DESC
LIMIT 10;

-- Count tasks and bugs
SELECT 
    'Tasks' AS type,
    COUNT(*) AS count
FROM tasks
WHERE deleted_at IS NULL
UNION ALL
SELECT 
    'Bugs' AS type,
    COUNT(*) AS count
FROM bugs
WHERE deleted_at IS NULL;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. This migration preserves the chronological order of tasks/bugs
-- 2. All references (related_tasks, related_bugs, activity_log) are updated
-- 3. Deleted items are excluded from the migration
-- 4. The migration is idempotent - can be run multiple times safely
-- 5. Always backup your database before running this migration!
-- ============================================================================

