-- Migration 007: SubTasks Table and Admin User
-- Created: 2025-01-XX
-- Description: 
--   1. Create subtasks table with soft delete support
--   2. Remove old sub_task column from tasks table
--   3. Add admin-001 user to users table
--   4. Add protection flags to prevent admin deletion

-- ============================================================================
-- PART 1: CREATE SUBTASKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS subtasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parent_task_id VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    assigned_to VARCHAR(50) NOT NULL,
    status ENUM('Not Started', 'In Progress', 'Completed') DEFAULT 'Not Started',
    is_completed BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(50) NOT NULL,
    
    -- Soft delete fields
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    deleted_by VARCHAR(50) NULL DEFAULT NULL,
    
    -- Foreign key constraint
    FOREIGN KEY (parent_task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_parent_task_id (parent_task_id),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_status (status),
    INDEX idx_is_completed (is_completed),
    INDEX idx_deleted_at (deleted_at),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- PART 2: REMOVE OLD SUB_TASK COLUMN FROM TASKS TABLE
-- ============================================================================

-- Check if column exists before dropping (safe migration)
SET @dbname = DATABASE();
SET @tablename = 'tasks';
SET @columnname = 'sub_task';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'ALTER TABLE tasks DROP COLUMN sub_task;',
  'SELECT 1;'
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

-- ============================================================================
-- PART 3: ADD ADMIN USER TO USERS TABLE
-- ============================================================================

-- Add is_system_admin flag to users table (for protection)
-- Using safe approach: check if column exists before adding
SET @dbname = DATABASE();
SET @tablename = 'users';
SET @columnname = 'is_system_admin';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1;',
  'ALTER TABLE users ADD COLUMN is_system_admin BOOLEAN DEFAULT FALSE;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Insert admin-001 user if it doesn't exist
INSERT INTO users (
    employee_id,
    name,
    email,
    phone,
    department,
    role,
    password,
    status,
    is_today_task,
    warning_count,
    is_system_admin,
    created_at,
    updated_at
) VALUES (
    'admin-001',
    'System Admin',
    'mailcpk@gmail.com',
    '+91-9999999999',
    'Technology',
    'admin',
    '1234',
    'active',
    FALSE,
    0,
    TRUE,
    '2024-01-01 00:00:00',
    '2024-01-01 00:00:00'
) ON DUPLICATE KEY UPDATE
    is_system_admin = TRUE,
    role = 'admin',
    status = 'active';

-- ============================================================================
-- PART 4: ADD SOFT DELETE FIELDS TO OTHER TABLES (for future Deleted Items page)
-- ============================================================================

-- Add soft delete to projects table
SET @dbname = DATABASE();
SET @tablename = 'projects';
SET @columnname = 'deleted_at';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = @tablename AND table_schema = @dbname AND column_name = @columnname) > 0,
  'SELECT 1;',
  'ALTER TABLE projects ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = 'deleted_by';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = @tablename AND table_schema = @dbname AND column_name = @columnname) > 0,
  'SELECT 1;',
  'ALTER TABLE projects ADD COLUMN deleted_by VARCHAR(50) NULL DEFAULT NULL;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add index for projects.deleted_at
SET @indexname = 'idx_deleted_at';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE table_name = @tablename AND table_schema = @dbname AND index_name = @indexname) > 0,
  'SELECT 1;',
  'ALTER TABLE projects ADD INDEX idx_deleted_at (deleted_at);'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add soft delete to tasks table
SET @tablename = 'tasks';
SET @columnname = 'deleted_at';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = @tablename AND table_schema = @dbname AND column_name = @columnname) > 0,
  'SELECT 1;',
  'ALTER TABLE tasks ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = 'deleted_by';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = @tablename AND table_schema = @dbname AND column_name = @columnname) > 0,
  'SELECT 1;',
  'ALTER TABLE tasks ADD COLUMN deleted_by VARCHAR(50) NULL DEFAULT NULL;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add index for tasks.deleted_at
SET @indexname = 'idx_deleted_at';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE table_name = @tablename AND table_schema = @dbname AND index_name = @indexname) > 0,
  'SELECT 1;',
  'ALTER TABLE tasks ADD INDEX idx_deleted_at (deleted_at);'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add soft delete to bugs table
SET @tablename = 'bugs';
SET @columnname = 'deleted_at';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = @tablename AND table_schema = @dbname AND column_name = @columnname) > 0,
  'SELECT 1;',
  'ALTER TABLE bugs ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = 'deleted_by';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = @tablename AND table_schema = @dbname AND column_name = @columnname) > 0,
  'SELECT 1;',
  'ALTER TABLE bugs ADD COLUMN deleted_by VARCHAR(50) NULL DEFAULT NULL;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add index for bugs.deleted_at
SET @indexname = 'idx_deleted_at';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE table_name = @tablename AND table_schema = @dbname AND index_name = @indexname) > 0,
  'SELECT 1;',
  'ALTER TABLE bugs ADD INDEX idx_deleted_at (deleted_at);'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================================

-- Verify subtasks table was created
SELECT 'Subtasks table created' AS status, COUNT(*) AS column_count 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE table_schema = DATABASE() AND table_name = 'subtasks';

-- Verify sub_task column was removed from tasks
SELECT 'sub_task column removed' AS status, COUNT(*) AS should_be_zero
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE table_schema = DATABASE() AND table_name = 'tasks' AND column_name = 'sub_task';

-- Verify admin user exists
SELECT 'Admin user created' AS status, employee_id, name, email, is_system_admin 
FROM users 
WHERE employee_id = 'admin-001';

-- Verify soft delete columns added
SELECT 'Soft delete columns added' AS status,
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_schema = DATABASE() AND table_name = 'projects' AND column_name = 'deleted_at') AS projects_has_deleted_at,
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_schema = DATABASE() AND table_name = 'tasks' AND column_name = 'deleted_at') AS tasks_has_deleted_at,
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_schema = DATABASE() AND table_name = 'bugs' AND column_name = 'deleted_at') AS bugs_has_deleted_at,
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_schema = DATABASE() AND table_name = 'subtasks' AND column_name = 'deleted_at') AS subtasks_has_deleted_at;

