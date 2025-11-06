-- Migration 028: Add subproject_id column to tasks table
-- This allows tasks to be associated with subprojects (similar to bugs table)
-- Tasks can now have both project_id (main project) and subproject_id (subproject)

-- Add subproject_id column to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS subproject_id VARCHAR(50);

-- Add comment to explain the column
COMMENT ON COLUMN tasks.subproject_id IS 'Optional subproject ID this task belongs to (e.g., PRJ-001-SUB-001)';

-- Create index for faster queries by subproject
CREATE INDEX IF NOT EXISTS idx_tasks_subproject_id ON tasks(subproject_id);

-- Migration complete
-- Tasks can now be associated with subprojects
-- Example: project_id = 'PRJ-001', subproject_id = 'PRJ-001-SUB-001'

