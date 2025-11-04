-- Migration 019: Support multiple assignees for tasks
-- Date: 2025-01-04
-- Purpose: Change assigned_to column to support JSON array of employee IDs
--          This allows a single task to be assigned to multiple people

-- Step 1: Add new column for multiple assignees (JSONB type for better performance)
ALTER TABLE tasks 
ADD COLUMN assigned_to_new JSONB;

-- Step 2: Migrate existing data - convert single assignee to array
UPDATE tasks
SET assigned_to_new = jsonb_build_array(assigned_to)
WHERE assigned_to IS NOT NULL;

-- Step 3: Drop old column and rename new column
ALTER TABLE tasks 
DROP COLUMN assigned_to;

ALTER TABLE tasks 
RENAME COLUMN assigned_to_new TO assigned_to;

-- Step 4: Make assigned_to column NOT NULL
ALTER TABLE tasks 
ALTER COLUMN assigned_to SET NOT NULL;

-- Step 5: Add check constraint to ensure it's an array
ALTER TABLE tasks
ADD CONSTRAINT tasks_assigned_to_is_array CHECK (jsonb_typeof(assigned_to) = 'array');

-- Step 6: Add index for faster querying (GIN index for JSONB)
CREATE INDEX idx_tasks_assigned_to_gin ON tasks USING GIN (assigned_to);

-- Verification queries (run these manually to verify migration)
-- SELECT task_id, assigned_to FROM tasks LIMIT 10;
-- SELECT COUNT(*) as total_tasks, COUNT(assigned_to) as tasks_with_assignees FROM tasks;

