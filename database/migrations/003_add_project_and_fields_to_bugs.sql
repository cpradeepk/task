-- ============================================================================
-- Migration: Add project_id, feature, and type to bugs table
-- Description: Add project tracking and categorization fields to bugs table
-- Created: 2025-10-26
-- ============================================================================

-- Add project_id column to bugs table
ALTER TABLE bugs 
ADD COLUMN project_id VARCHAR(50) NULL COMMENT 'Project ID this bug belongs to' AFTER related_bugs;

-- Add feature column to bugs table
ALTER TABLE bugs
ADD COLUMN feature VARCHAR(255) NULL COMMENT 'Feature name this bug is related to' AFTER project_id;

-- Add type column to bugs table
ALTER TABLE bugs
ADD COLUMN type ENUM('testcase', 'feature', 'other') NULL COMMENT 'Bug type categorization' AFTER feature;

-- Add indexes for performance
ALTER TABLE bugs
ADD INDEX idx_project_id (project_id),
ADD INDEX idx_type (type);

-- Add foreign key constraint for project_id
ALTER TABLE bugs
ADD CONSTRAINT fk_bugs_project_id
FOREIGN KEY (project_id) REFERENCES projects(project_id)
ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- Update existing bugs with sample data (optional)
-- ============================================================================

-- Assign some existing bugs to projects for testing
-- UPDATE bugs SET project_id = 'PRJ-001', type = 'feature' WHERE bug_id LIKE 'BUG-%' LIMIT 3;
-- UPDATE bugs SET project_id = 'PRJ-005', type = 'testcase' WHERE bug_id LIKE 'BUG-%' AND project_id IS NULL LIMIT 2;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- View bugs with project information
-- SELECT 
--     b.bug_id,
--     b.title,
--     b.severity,
--     b.status,
--     b.project_id,
--     p.project_name,
--     b.feature,
--     b.type,
--     b.assigned_to
-- FROM bugs b
-- LEFT JOIN projects p ON b.project_id = p.project_id
-- ORDER BY b.created_at DESC
-- LIMIT 10;

-- Count bugs by project
-- SELECT 
--     COALESCE(p.project_name, 'No Project') AS project_name,
--     COUNT(b.id) AS bug_count
-- FROM bugs b
-- LEFT JOIN projects p ON b.project_id = p.project_id
-- GROUP BY p.project_name
-- ORDER BY bug_count DESC;

-- Count bugs by type
-- SELECT 
--     COALESCE(type, 'Unspecified') AS bug_type,
--     COUNT(*) AS count
-- FROM bugs
-- GROUP BY type
-- ORDER BY count DESC;

