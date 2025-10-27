-- ============================================================================
-- Migration: Add project_id to tasks table
-- Description: Add project_id column to tasks table with foreign key constraint
-- Created: 2025-10-26
-- ============================================================================

-- Add project_id column to tasks table
ALTER TABLE tasks 
ADD COLUMN project_id VARCHAR(50) NULL COMMENT 'Project ID this task belongs to' AFTER sub_task;

-- Add index for performance
ALTER TABLE tasks
ADD INDEX idx_project_id (project_id);

-- Add foreign key constraint
ALTER TABLE tasks
ADD CONSTRAINT fk_tasks_project_id
FOREIGN KEY (project_id) REFERENCES projects(project_id)
ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- Update existing tasks with sample project assignments (optional)
-- ============================================================================

-- Assign some existing tasks to projects for testing
-- UPDATE tasks SET project_id = 'PRJ-001' WHERE task_id LIKE 'JSR-%' LIMIT 5;
-- UPDATE tasks SET project_id = 'PRJ-004' WHERE task_id LIKE 'JSR-%' AND project_id IS NULL LIMIT 3;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- View tasks with project information
-- SELECT 
--     t.task_id,
--     t.description,
--     t.assigned_to,
--     t.project_id,
--     p.project_name,
--     p.parent_project_id,
--     pp.project_name AS parent_project_name
-- FROM tasks t
-- LEFT JOIN projects p ON t.project_id = p.project_id
-- LEFT JOIN projects pp ON p.parent_project_id = pp.project_id
-- ORDER BY t.created_at DESC
-- LIMIT 10;

-- Count tasks by project
-- SELECT 
--     COALESCE(p.project_name, 'No Project') AS project_name,
--     COUNT(t.id) AS task_count
-- FROM tasks t
-- LEFT JOIN projects p ON t.project_id = p.project_id
-- GROUP BY p.project_name
-- ORDER BY task_count DESC;

