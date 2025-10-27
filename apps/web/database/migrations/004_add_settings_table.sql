-- ============================================================================
-- Migration: Add Settings Table
-- Description: Create settings table for configurable dropdown options
-- Created: 2025-10-26
-- ============================================================================

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_type ENUM('department', 'severity', 'priority', 'category', 'platform', 'task_priority') NOT NULL COMMENT 'Type of setting',
    setting_value VARCHAR(255) NOT NULL COMMENT 'Value for the setting',
    display_order INT DEFAULT 0 COMMENT 'Order for display in dropdowns',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether this setting is active',
    created_by VARCHAR(50) NOT NULL COMMENT 'Employee ID of creator',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation timestamp',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
    
    -- Indexes for performance
    INDEX idx_setting_type (setting_type),
    INDEX idx_is_active (is_active),
    INDEX idx_display_order (display_order),
    
    -- Unique constraint to prevent duplicate values per type
    UNIQUE KEY unique_setting (setting_type, setting_value),
    
    -- Foreign key constraints
    FOREIGN KEY (created_by) REFERENCES users(employee_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Configurable dropdown settings for forms';

-- ============================================================================
-- Insert Default Settings
-- ============================================================================

-- Department Settings (from existing DEPARTMENTS constant)
INSERT INTO settings (setting_type, setting_value, display_order, created_by) VALUES
('department', 'Frontend - iOS', 1, 'AM-0001'),
('department', 'Frontend - Android', 2, 'AM-0001'),
('department', 'Frontend - Webapp', 3, 'AM-0001'),
('department', 'Traditional Marketing', 4, 'AM-0001'),
('department', 'Admin panel', 5, 'AM-0001'),
('department', 'Backend - Node js', 6, 'AM-0001'),
('department', 'Server config', 7, 'AM-0001'),
('department', 'Frontend - SP Webapp', 8, 'AM-0001'),
('department', 'Digital Marketing', 9, 'AM-0001'),
('department', 'Creatives', 10, 'AM-0001'),
('department', 'Technology', 11, 'AM-0001'),
('department', 'Mar-Tech', 12, 'AM-0001'),
('department', 'Frontend - Flutter', 13, 'AM-0001'),
('department', 'Frontend - UBAR', 14, 'AM-0001'),
('department', 'Backend - UBAR', 15, 'AM-0001'),
('department', 'Management', 16, 'AM-0001'),
('department', 'Design', 17, 'AM-0001'),
('department', 'Brand Partnerships', 18, 'AM-0001'),
('department', 'Finance', 19, 'AM-0001'),
('department', 'Customer grievances', 20, 'AM-0001'),
('department', 'CRM', 21, 'AM-0001'),
('department', 'Operations', 22, 'AM-0001'),
('department', 'Finances', 23, 'AM-0001'),
('department', 'CEO', 24, 'AM-0001'),
('department', 'Team Leader', 25, 'AM-0001'),
('department', 'HR', 26, 'AM-0001');

-- Severity Settings (for Bug Report)
INSERT INTO settings (setting_type, setting_value, display_order, created_by) VALUES
('severity', 'Critical', 1, 'AM-0001'),
('severity', 'Major', 2, 'AM-0001'),
('severity', 'Minor', 3, 'AM-0001');

-- Priority Settings (for Bug Report)
INSERT INTO settings (setting_type, setting_value, display_order, created_by) VALUES
('priority', 'High', 1, 'AM-0001'),
('priority', 'Medium', 2, 'AM-0001'),
('priority', 'Low', 3, 'AM-0001');

-- Category Settings (for Bug Report)
INSERT INTO settings (setting_type, setting_value, display_order, created_by) VALUES
('category', 'UI', 1, 'AM-0001'),
('category', 'API', 2, 'AM-0001'),
('category', 'Backend', 3, 'AM-0001'),
('category', 'Performance', 4, 'AM-0001'),
('category', 'Security', 5, 'AM-0001'),
('category', 'Database', 6, 'AM-0001'),
('category', 'Integration', 7, 'AM-0001'),
('category', 'Other', 8, 'AM-0001');

-- Platform Settings (for Bug Report)
INSERT INTO settings (setting_type, setting_value, display_order, created_by) VALUES
('platform', 'Web', 1, 'AM-0001'),
('platform', 'iOS', 2, 'AM-0001'),
('platform', 'Android', 3, 'AM-0001'),
('platform', 'All', 4, 'AM-0001');

-- Task Priority Settings (for Add Task)
INSERT INTO settings (setting_type, setting_value, display_order, created_by) VALUES
('task_priority', 'High', 1, 'AM-0001'),
('task_priority', 'Medium', 2, 'AM-0001'),
('task_priority', 'Low', 3, 'AM-0001');

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- View all settings grouped by type
-- SELECT 
--     setting_type,
--     setting_value,
--     display_order,
--     is_active
-- FROM settings
-- WHERE is_active = TRUE
-- ORDER BY setting_type, display_order;

-- Count settings by type
-- SELECT 
--     setting_type,
--     COUNT(*) as count
-- FROM settings
-- WHERE is_active = TRUE
-- GROUP BY setting_type
-- ORDER BY setting_type;

-- Get all active departments
-- SELECT setting_value
-- FROM settings
-- WHERE setting_type = 'department' AND is_active = TRUE
-- ORDER BY display_order;

