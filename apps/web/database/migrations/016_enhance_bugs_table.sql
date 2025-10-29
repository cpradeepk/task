-- ============================================================================
-- Migration 016: Enhance Bugs Table
-- Description: Add subproject_id, change environment to VARCHAR, update constraints
-- Date: 2025-10-29
-- ============================================================================

-- Add subproject_id column
ALTER TABLE bugs 
ADD COLUMN subproject_id VARCHAR(50) AFTER project_id,
ADD INDEX idx_subproject_id (subproject_id);

-- Change environment from ENUM to VARCHAR to support settings table
ALTER TABLE bugs 
MODIFY COLUMN environment VARCHAR(50) DEFAULT 'Production';

-- Add foreign key for subproject_id (if projects table has subprojects)
-- Note: This assumes projects table exists with project_id as primary key
-- ALTER TABLE bugs 
-- ADD CONSTRAINT fk_bugs_subproject 
-- FOREIGN KEY (subproject_id) REFERENCES projects(project_id) 
-- ON DELETE SET NULL ON UPDATE CASCADE;

-- Update existing bugs to have NULL subproject_id (already NULL by default)

-- ============================================================================
-- End of Migration 016
-- ============================================================================

