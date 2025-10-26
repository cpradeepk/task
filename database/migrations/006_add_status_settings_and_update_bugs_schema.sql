-- Migration 006: Add Task Status, Bug Status, and Bug Type settings
-- Also update bugs table to use VARCHAR instead of ENUM for dynamic values

-- ============================================================================
-- PART 1: Update settings table to add new setting types
-- ============================================================================

-- Add new ENUM values to setting_type column
ALTER TABLE settings
MODIFY COLUMN setting_type ENUM('department','severity','priority','category','platform','task_priority','task_status','bug_status','bug_type')
NOT NULL COMMENT 'Type of setting';

-- ============================================================================
-- PART 2: Add new setting types for task_status, bug_status, bug_type
-- ============================================================================

-- Insert Task Status settings (created_by AM-0001)
INSERT INTO settings (setting_type, setting_value, display_order, is_active, created_by, created_at, updated_at) VALUES
('task_status', 'Yet to Start', 1, 1, 'AM-0001', NOW(), NOW()),
('task_status', 'In Progress', 2, 1, 'AM-0001', NOW(), NOW()),
('task_status', 'Delayed', 3, 1, 'AM-0001', NOW(), NOW()),
('task_status', 'Done', 4, 1, 'AM-0001', NOW(), NOW()),
('task_status', 'Hold', 5, 1, 'AM-0001', NOW(), NOW()),
('task_status', 'ReOpened', 6, 1, 'AM-0001', NOW(), NOW()),
('task_status', 'Cancel', 7, 1, 'AM-0001', NOW(), NOW()),
('task_status', 'Stop', 8, 1, 'AM-0001', NOW(), NOW());

-- Insert Bug Status settings (created_by AM-0001)
INSERT INTO settings (setting_type, setting_value, display_order, is_active, created_by, created_at, updated_at) VALUES
('bug_status', 'New', 1, 1, 'AM-0001', NOW(), NOW()),
('bug_status', 'In Progress', 2, 1, 'AM-0001', NOW(), NOW()),
('bug_status', 'Resolved', 3, 1, 'AM-0001', NOW(), NOW()),
('bug_status', 'Closed', 4, 1, 'AM-0001', NOW(), NOW()),
('bug_status', 'Reopened', 5, 1, 'AM-0001', NOW(), NOW());

-- Insert Bug Type settings (created_by AM-0001)
INSERT INTO settings (setting_type, setting_value, display_order, is_active, created_by, created_at, updated_at) VALUES
('bug_type', 'testcase', 1, 1, 'AM-0001', NOW(), NOW()),
('bug_type', 'feature', 2, 1, 'AM-0001', NOW(), NOW()),
('bug_type', 'other', 3, 1, 'AM-0001', NOW(), NOW());

-- ============================================================================
-- PART 3: Update bugs table schema to use VARCHAR instead of ENUM
-- ============================================================================

-- Step 1: Add new VARCHAR columns
ALTER TABLE bugs 
ADD COLUMN severity_new VARCHAR(50) DEFAULT 'Minor' AFTER severity,
ADD COLUMN priority_new VARCHAR(50) DEFAULT 'Low' AFTER priority,
ADD COLUMN status_new VARCHAR(50) DEFAULT 'New' AFTER status,
ADD COLUMN category_new VARCHAR(100) DEFAULT 'Other' AFTER category,
ADD COLUMN platform_new VARCHAR(50) DEFAULT 'Web' AFTER platform;

-- Step 2: Copy data from ENUM columns to VARCHAR columns
UPDATE bugs SET severity_new = severity;
UPDATE bugs SET priority_new = priority;
UPDATE bugs SET status_new = status;
UPDATE bugs SET category_new = category;
UPDATE bugs SET platform_new = platform;

-- Step 3: Drop old ENUM columns
ALTER TABLE bugs 
DROP COLUMN severity,
DROP COLUMN priority,
DROP COLUMN status,
DROP COLUMN category,
DROP COLUMN platform;

-- Step 4: Rename new VARCHAR columns to original names
ALTER TABLE bugs 
CHANGE COLUMN severity_new severity VARCHAR(50) DEFAULT 'Minor',
CHANGE COLUMN priority_new priority VARCHAR(50) DEFAULT 'Low',
CHANGE COLUMN status_new status VARCHAR(50) DEFAULT 'New',
CHANGE COLUMN category_new category VARCHAR(100) DEFAULT 'Other',
CHANGE COLUMN platform_new platform VARCHAR(50) DEFAULT 'Web';

-- Step 5: Add indexes for better query performance
ALTER TABLE bugs 
ADD INDEX idx_severity (severity),
ADD INDEX idx_priority (priority),
ADD INDEX idx_status (status),
ADD INDEX idx_category (category),
ADD INDEX idx_platform (platform);

-- ============================================================================
-- PART 4: Update tasks table to use VARCHAR for status (if not already)
-- ============================================================================

-- Check if tasks.status is ENUM, if so convert to VARCHAR
-- Note: This is safe because we're clearing test data

-- Add new VARCHAR column
ALTER TABLE tasks 
ADD COLUMN status_new VARCHAR(50) DEFAULT 'Yet to Start' AFTER status;

-- Copy data
UPDATE tasks SET status_new = status;

-- Drop old column
ALTER TABLE tasks DROP COLUMN status;

-- Rename new column
ALTER TABLE tasks 
CHANGE COLUMN status_new status VARCHAR(50) DEFAULT 'Yet to Start';

-- Add index
ALTER TABLE tasks ADD INDEX idx_status (status);

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify migration)
-- ============================================================================

-- Verify settings were added
-- SELECT setting_type, setting_value, display_order FROM settings WHERE setting_type IN ('task_status', 'bug_status', 'bug_type') ORDER BY setting_type, display_order;

-- Verify bugs table schema
-- DESCRIBE bugs;

-- Verify tasks table schema
-- DESCRIBE tasks;

