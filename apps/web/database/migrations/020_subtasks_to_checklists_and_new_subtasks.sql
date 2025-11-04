-- Migration 020: Rename subtasks to checklists and implement true subtasks
-- Date: 2025-01-04
-- Purpose: 
--   Part A: Rename existing subtasks tables to checklists (simple todo items)
--   Part B: Add parent_task_id and parent_dev_id columns to support true subtasks (full tasks/bugs that are children of other tasks/bugs)

-- ============================================================================
-- PART A: RENAME SUBTASKS TO CHECKLISTS
-- ============================================================================

-- Step 1: Rename task subtasks table
ALTER TABLE subtasks RENAME TO task_checklists;

-- Step 2: Rename bug subtasks table
ALTER TABLE bug_subtasks RENAME TO development_checklists;

-- Step 3: Rename indexes for task_checklists
ALTER INDEX idx_subtasks_parent_task_id RENAME TO idx_task_checklists_parent_task_id;
ALTER INDEX idx_subtasks_assigned_to RENAME TO idx_task_checklists_assigned_to;
ALTER INDEX idx_subtasks_deleted_at RENAME TO idx_task_checklists_deleted_at;

-- Step 4: Rename indexes for development_checklists
ALTER INDEX idx_bug_subtasks_parent_bug_id RENAME TO idx_development_checklists_parent_dev_id;
ALTER INDEX idx_bug_subtasks_assigned_to RENAME TO idx_development_checklists_assigned_to;
ALTER INDEX idx_bug_subtasks_deleted_at RENAME TO idx_development_checklists_deleted_at;

-- Step 5: Rename foreign key constraints for task_checklists
ALTER TABLE task_checklists 
  DROP CONSTRAINT IF EXISTS subtasks_parent_task_id_fkey;

ALTER TABLE task_checklists 
  ADD CONSTRAINT task_checklists_parent_task_id_fkey 
  FOREIGN KEY (parent_task_id) REFERENCES tasks(task_id) ON DELETE CASCADE;

-- Step 6: Clean up orphaned development_checklists (bug_subtasks with non-existent parent bugs)
DELETE FROM development_checklists
WHERE parent_bug_id NOT IN (SELECT bug_id FROM bugs);

-- Step 7: Rename foreign key constraints for development_checklists
ALTER TABLE development_checklists
  DROP CONSTRAINT IF EXISTS bug_subtasks_parent_bug_id_fkey;

ALTER TABLE development_checklists
  ADD CONSTRAINT development_checklists_parent_dev_id_fkey
  FOREIGN KEY (parent_bug_id) REFERENCES bugs(bug_id) ON DELETE CASCADE;

-- ============================================================================
-- PART B: ADD PARENT COLUMNS FOR TRUE SUBTASKS
-- ============================================================================

-- Step 8: Add parent_task_id column to tasks table (for task subtasks)
ALTER TABLE tasks
ADD COLUMN parent_task_id VARCHAR(50);

-- Step 9: Add parent_dev_id column to bugs table (for development item subtasks)
ALTER TABLE bugs
ADD COLUMN parent_dev_id VARCHAR(50);

-- Step 10: Add foreign key constraint for task parent relationship
ALTER TABLE tasks
ADD CONSTRAINT tasks_parent_task_id_fkey
FOREIGN KEY (parent_task_id) REFERENCES tasks(task_id) ON DELETE CASCADE;

-- Step 11: Add foreign key constraint for development item parent relationship
ALTER TABLE bugs
ADD CONSTRAINT bugs_parent_dev_id_fkey
FOREIGN KEY (parent_dev_id) REFERENCES bugs(bug_id) ON DELETE CASCADE;

-- Step 12: Add indexes for faster querying of subtasks
CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;
CREATE INDEX idx_bugs_parent_dev_id ON bugs(parent_dev_id) WHERE parent_dev_id IS NOT NULL;

-- ============================================================================
-- VERIFICATION QUERIES (run these manually to verify migration)
-- ============================================================================

-- Verify table renames
-- SELECT COUNT(*) as checklist_count FROM task_checklists;
-- SELECT COUNT(*) as dev_checklist_count FROM development_checklists;

-- Verify new columns exist
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'parent_task_id';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'bugs' AND column_name = 'parent_dev_id';

-- Verify indexes exist
-- SELECT indexname FROM pg_indexes WHERE tablename = 'tasks' AND indexname = 'idx_tasks_parent_task_id';
-- SELECT indexname FROM pg_indexes WHERE tablename = 'bugs' AND indexname = 'idx_bugs_parent_dev_id';

