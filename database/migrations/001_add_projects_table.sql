-- ============================================================================
-- Migration: Add Projects Table
-- Description: Create projects table with 2-level hierarchy support and soft delete
-- Created: 2025-10-26
-- ============================================================================

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL UNIQUE COMMENT 'Unique project identifier (e.g., PRJ-001, PRJ-002)',
    project_name VARCHAR(255) NOT NULL COMMENT 'Project name (displayed in UI)',
    parent_project_id VARCHAR(50) NULL COMMENT 'Parent project ID for sub-projects (NULL for main projects)',
    description TEXT NULL COMMENT 'Project description',
    status ENUM('Active', 'Inactive', 'Deleted') DEFAULT 'Active' COMMENT 'Project status',
    created_by VARCHAR(50) NOT NULL COMMENT 'Employee ID of creator',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation timestamp',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
    deleted_at TIMESTAMP NULL COMMENT 'Soft delete timestamp',
    deleted_by VARCHAR(50) NULL COMMENT 'Employee ID of who deleted the project',
    
    -- Indexes for performance
    INDEX idx_project_id (project_id),
    INDEX idx_parent_project_id (parent_project_id),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by),
    INDEX idx_created_at (created_at),
    
    -- Foreign key constraints
    FOREIGN KEY (parent_project_id) REFERENCES projects(project_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    FOREIGN KEY (created_by) REFERENCES users(employee_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    FOREIGN KEY (deleted_by) REFERENCES users(employee_id)
        ON DELETE SET NULL ON UPDATE CASCADE
        
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Projects table with 2-level hierarchy and soft delete support';

-- ============================================================================
-- Insert sample projects for testing
-- ============================================================================

-- Main Projects
INSERT INTO projects (project_id, project_name, parent_project_id, description, status, created_by) VALUES
('PRJ-001', 'JSR Task Management System', NULL, 'Main task management and bug tracking system', 'Active', 'AM-0001'),
('PRJ-002', 'Mobile App Development', NULL, 'iOS and Android mobile applications', 'Active', 'AM-0001'),
('PRJ-003', 'Website Redesign', NULL, 'Company website redesign project', 'Active', 'AM-0001');

-- Sub-Projects for JSR Task Management System
INSERT INTO projects (project_id, project_name, parent_project_id, description, status, created_by) VALUES
('PRJ-004', 'Authentication Module', 'PRJ-001', 'User authentication and authorization', 'Active', 'AM-0001'),
('PRJ-005', 'Bug Tracking Module', 'PRJ-001', 'Bug tracking and management features', 'Active', 'AM-0001'),
('PRJ-006', 'Reporting Module', 'PRJ-001', 'Analytics and reporting features', 'Active', 'AM-0001');

-- Sub-Projects for Mobile App Development
INSERT INTO projects (project_id, project_name, parent_project_id, description, status, created_by) VALUES
('PRJ-007', 'iOS App', 'PRJ-002', 'iOS native application', 'Active', 'AM-0001'),
('PRJ-008', 'Android App', 'PRJ-002', 'Android native application', 'Active', 'AM-0001');

-- Sub-Projects for Website Redesign
INSERT INTO projects (project_id, project_name, parent_project_id, description, status, created_by) VALUES
('PRJ-009', 'UI/UX Design', 'PRJ-003', 'User interface and experience design', 'Active', 'AM-0001'),
('PRJ-010', 'Frontend Development', 'PRJ-003', 'Frontend implementation', 'Active', 'AM-0001');

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- View all projects with hierarchy
-- SELECT 
--     p1.project_id,
--     p1.project_name,
--     p1.parent_project_id,
--     p2.project_name AS parent_project_name,
--     p1.status,
--     p1.created_by,
--     p1.created_at
-- FROM projects p1
-- LEFT JOIN projects p2 ON p1.parent_project_id = p2.project_id
-- ORDER BY 
--     COALESCE(p1.parent_project_id, p1.project_id),
--     p1.parent_project_id IS NOT NULL,
--     p1.project_id;

-- Count projects by type
-- SELECT 
--     CASE 
--         WHEN parent_project_id IS NULL THEN 'Main Project'
--         ELSE 'Sub-Project'
--     END AS project_type,
--     COUNT(*) AS count
-- FROM projects
-- WHERE status != 'Deleted'
-- GROUP BY project_type;

