-- ============================================================================
-- Migration 008: Role-Based Feature Access Management System
-- ============================================================================
-- Purpose: Create tables for managing role-based and user-specific permissions
-- Author: System
-- Date: 2025-01-XX
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE ROLE_PERMISSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS role_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role ENUM('admin', 'top_management', 'management', 'employee') NOT NULL,
    feature_key VARCHAR(100) NOT NULL COMMENT 'Unique identifier for the feature/page',
    feature_name VARCHAR(200) NOT NULL COMMENT 'Human-readable feature name',
    can_view BOOLEAN DEFAULT FALSE COMMENT 'Can view/access the feature',
    can_create BOOLEAN DEFAULT FALSE COMMENT 'Can create new items',
    can_edit BOOLEAN DEFAULT FALSE COMMENT 'Can edit items',
    can_delete BOOLEAN DEFAULT FALSE COMMENT 'Can delete items',
    can_approve BOOLEAN DEFAULT FALSE COMMENT 'Can approve items (for approval workflows)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_role_feature (role, feature_key),
    INDEX idx_role (role),
    INDEX idx_feature_key (feature_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Role-based permissions for features and pages';

-- ============================================================================
-- PART 2: CREATE USER_PERMISSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL,
    feature_key VARCHAR(100) NOT NULL COMMENT 'Unique identifier for the feature/page',
    can_view BOOLEAN DEFAULT NULL COMMENT 'Override role permission for view access',
    can_create BOOLEAN DEFAULT NULL COMMENT 'Override role permission for create access',
    can_edit BOOLEAN DEFAULT NULL COMMENT 'Override role permission for edit access',
    can_delete BOOLEAN DEFAULT NULL COMMENT 'Override role permission for delete access',
    can_approve BOOLEAN DEFAULT NULL COMMENT 'Override role permission for approve access',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_feature (employee_id, feature_key),
    INDEX idx_employee_id (employee_id),
    INDEX idx_feature_key (feature_key),
    FOREIGN KEY (employee_id) REFERENCES users(employee_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User-specific permission overrides (NULL means use role permission)';

-- ============================================================================
-- PART 3: INSERT DEFAULT ROLE PERMISSIONS
-- ============================================================================

-- Dashboard & Core Features
INSERT INTO role_permissions (role, feature_key, feature_name, can_view, can_create, can_edit, can_delete, can_approve) VALUES
('admin', 'dashboard', 'Dashboard', TRUE, FALSE, FALSE, FALSE, FALSE),
('top_management', 'dashboard', 'Dashboard', TRUE, FALSE, FALSE, FALSE, FALSE),
('management', 'dashboard', 'Dashboard', TRUE, FALSE, FALSE, FALSE, FALSE),
('employee', 'dashboard', 'Dashboard', TRUE, FALSE, FALSE, FALSE, FALSE),

('admin', 'your_work', 'Your Work', TRUE, FALSE, FALSE, FALSE, FALSE),
('top_management', 'your_work', 'Your Work', TRUE, FALSE, FALSE, FALSE, FALSE),
('management', 'your_work', 'Your Work', TRUE, FALSE, FALSE, FALSE, FALSE),
('employee', 'your_work', 'Your Work', TRUE, FALSE, FALSE, FALSE, FALSE),

-- Tasks Management
('admin', 'tasks', 'Tasks', TRUE, TRUE, TRUE, TRUE, FALSE),
('top_management', 'tasks', 'Tasks', TRUE, TRUE, TRUE, TRUE, FALSE),
('management', 'tasks', 'Tasks', TRUE, TRUE, TRUE, TRUE, FALSE),
('employee', 'tasks', 'Tasks', TRUE, TRUE, TRUE, FALSE, FALSE),

('admin', 'master_tasks', 'Master Tasks', TRUE, FALSE, TRUE, TRUE, FALSE),
('top_management', 'master_tasks', 'Master Tasks', TRUE, FALSE, TRUE, TRUE, FALSE),
('management', 'master_tasks', 'Master Tasks', TRUE, FALSE, TRUE, FALSE, FALSE),
('employee', 'master_tasks', 'Master Tasks', FALSE, FALSE, FALSE, FALSE, FALSE),

('admin', 'team_tasks', 'Team Tasks', TRUE, FALSE, TRUE, FALSE, FALSE),
('top_management', 'team_tasks', 'Team Tasks', TRUE, FALSE, TRUE, FALSE, FALSE),
('management', 'team_tasks', 'Team Tasks', TRUE, FALSE, TRUE, FALSE, FALSE),
('employee', 'team_tasks', 'Team Tasks', FALSE, FALSE, FALSE, FALSE, FALSE),

-- Bugs Management
('admin', 'bugs', 'Bugs', TRUE, TRUE, TRUE, TRUE, FALSE),
('top_management', 'bugs', 'Bugs', TRUE, TRUE, TRUE, TRUE, FALSE),
('management', 'bugs', 'Bugs', TRUE, TRUE, TRUE, TRUE, FALSE),
('employee', 'bugs', 'Bugs', TRUE, TRUE, TRUE, FALSE, FALSE),

('admin', 'master_bugs', 'Master Bugs', TRUE, FALSE, TRUE, TRUE, FALSE),
('top_management', 'master_bugs', 'Master Bugs', TRUE, FALSE, TRUE, TRUE, FALSE),
('management', 'master_bugs', 'Master Bugs', TRUE, FALSE, TRUE, FALSE, FALSE),
('employee', 'master_bugs', 'Master Bugs', FALSE, FALSE, FALSE, FALSE, FALSE),

-- Projects Management
('admin', 'projects', 'Projects', TRUE, TRUE, TRUE, TRUE, FALSE),
('top_management', 'projects', 'Projects', TRUE, TRUE, TRUE, TRUE, FALSE),
('management', 'projects', 'Projects', TRUE, TRUE, TRUE, FALSE, FALSE),
('employee', 'projects', 'Projects', TRUE, FALSE, FALSE, FALSE, FALSE),

-- User Management
('admin', 'users', 'User Management', TRUE, TRUE, TRUE, TRUE, FALSE),
('top_management', 'users', 'User Management', TRUE, TRUE, TRUE, TRUE, FALSE),
('management', 'users', 'User Management', TRUE, FALSE, FALSE, FALSE, FALSE),
('employee', 'users', 'User Management', FALSE, FALSE, FALSE, FALSE, FALSE),

-- Settings & Configuration
('admin', 'settings', 'Settings', TRUE, FALSE, TRUE, FALSE, FALSE),
('top_management', 'settings', 'Settings', TRUE, FALSE, TRUE, FALSE, FALSE),
('management', 'settings', 'Settings', TRUE, FALSE, FALSE, FALSE, FALSE),
('employee', 'settings', 'Settings', FALSE, FALSE, FALSE, FALSE, FALSE),

('admin', 'settings_dropdowns', 'Settings - Dropdowns', TRUE, TRUE, TRUE, TRUE, FALSE),
('top_management', 'settings_dropdowns', 'Settings - Dropdowns', FALSE, FALSE, FALSE, FALSE, FALSE),
('management', 'settings_dropdowns', 'Settings - Dropdowns', FALSE, FALSE, FALSE, FALSE, FALSE),
('employee', 'settings_dropdowns', 'Settings - Dropdowns', FALSE, FALSE, FALSE, FALSE, FALSE),

('admin', 'settings_permissions', 'Settings - Permissions', TRUE, TRUE, TRUE, TRUE, FALSE),
('top_management', 'settings_permissions', 'Settings - Permissions', FALSE, FALSE, FALSE, FALSE, FALSE),
('management', 'settings_permissions', 'Settings - Permissions', FALSE, FALSE, FALSE, FALSE, FALSE),
('employee', 'settings_permissions', 'Settings - Permissions', FALSE, FALSE, FALSE, FALSE, FALSE),

-- Reports
('admin', 'reports', 'Reports', TRUE, FALSE, FALSE, FALSE, FALSE),
('top_management', 'reports', 'Reports', TRUE, FALSE, FALSE, FALSE, FALSE),
('management', 'reports', 'Reports', TRUE, FALSE, FALSE, FALSE, FALSE),
('employee', 'reports', 'Reports', FALSE, FALSE, FALSE, FALSE, FALSE),

-- Leave Management
('admin', 'leave_apply', 'Leave - Apply', TRUE, TRUE, FALSE, FALSE, FALSE),
('top_management', 'leave_apply', 'Leave - Apply', TRUE, TRUE, FALSE, FALSE, FALSE),
('management', 'leave_apply', 'Leave - Apply', TRUE, TRUE, FALSE, FALSE, FALSE),
('employee', 'leave_apply', 'Leave - Apply', TRUE, TRUE, FALSE, FALSE, FALSE),

('admin', 'leave_approvals', 'Leave - Approvals', TRUE, FALSE, FALSE, FALSE, TRUE),
('top_management', 'leave_approvals', 'Leave - Approvals', TRUE, FALSE, FALSE, FALSE, TRUE),
('management', 'leave_approvals', 'Leave - Approvals', TRUE, FALSE, FALSE, FALSE, TRUE),
('employee', 'leave_approvals', 'Leave - Approvals', FALSE, FALSE, FALSE, FALSE, FALSE),

-- WFH Management
('admin', 'wfh_apply', 'WFH - Apply', TRUE, TRUE, FALSE, FALSE, FALSE),
('top_management', 'wfh_apply', 'WFH - Apply', TRUE, TRUE, FALSE, FALSE, FALSE),
('management', 'wfh_apply', 'WFH - Apply', TRUE, TRUE, FALSE, FALSE, FALSE),
('employee', 'wfh_apply', 'WFH - Apply', TRUE, TRUE, FALSE, FALSE, FALSE),

('admin', 'wfh_approvals', 'WFH - Approvals', TRUE, FALSE, FALSE, FALSE, TRUE),
('top_management', 'wfh_approvals', 'WFH - Approvals', TRUE, FALSE, FALSE, FALSE, TRUE),
('management', 'wfh_approvals', 'WFH - Approvals', TRUE, FALSE, FALSE, FALSE, TRUE),
('employee', 'wfh_approvals', 'WFH - Approvals', FALSE, FALSE, FALSE, FALSE, FALSE),

-- My Applications
('admin', 'my_applications', 'My Applications', TRUE, FALSE, FALSE, FALSE, FALSE),
('top_management', 'my_applications', 'My Applications', TRUE, FALSE, FALSE, FALSE, FALSE),
('management', 'my_applications', 'My Applications', TRUE, FALSE, FALSE, FALSE, FALSE),
('employee', 'my_applications', 'My Applications', TRUE, FALSE, FALSE, FALSE, FALSE),

-- Deleted Items (Admin Only)
('admin', 'deleted_items', 'Deleted Items', TRUE, FALSE, FALSE, TRUE, FALSE),
('top_management', 'deleted_items', 'Deleted Items', FALSE, FALSE, FALSE, FALSE, FALSE),
('management', 'deleted_items', 'Deleted Items', FALSE, FALSE, FALSE, FALSE, FALSE),
('employee', 'deleted_items', 'Deleted Items', FALSE, FALSE, FALSE, FALSE, FALSE),

-- Profile
('admin', 'profile', 'Profile', TRUE, FALSE, TRUE, FALSE, FALSE),
('top_management', 'profile', 'Profile', TRUE, FALSE, TRUE, FALSE, FALSE),
('management', 'profile', 'Profile', TRUE, FALSE, TRUE, FALSE, FALSE),
('employee', 'profile', 'Profile', TRUE, FALSE, TRUE, FALSE, FALSE)

ON DUPLICATE KEY UPDATE
    can_view = VALUES(can_view),
    can_create = VALUES(can_create),
    can_edit = VALUES(can_edit),
    can_delete = VALUES(can_delete),
    can_approve = VALUES(can_approve),
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- PART 4: INSERT SPECIAL USER PERMISSION FOR AM-0001
-- ============================================================================

-- Grant AM-0001 access to settings_permissions (as per requirements)
INSERT INTO user_permissions (employee_id, feature_key, can_view, can_create, can_edit, can_delete, can_approve)
VALUES ('AM-0001', 'settings_permissions', TRUE, TRUE, TRUE, TRUE, FALSE)
ON DUPLICATE KEY UPDATE
    can_view = TRUE,
    can_create = TRUE,
    can_edit = TRUE,
    can_delete = TRUE,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

