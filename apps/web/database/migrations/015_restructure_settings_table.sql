-- Migration 015: Restructure Settings Table to Key-Value JSON Format
-- 
-- This migration transforms the settings table from:
--   - Multiple rows per setting type (setting_type, setting_value)
--   - Limited to ENUM types
--   - Only string values
-- 
-- To:
--   - One row per setting key
--   - Flexible key names (no ENUM restriction)
--   - JSON values for complex data
--
-- Example transformation:
-- OLD:
--   | id | setting_type | setting_value      | display_order |
--   |----|--------------|-------------------|---------------|
--   | 1  | department   | Frontend - iOS    | 1             |
--   | 2  | department   | Frontend - Android| 2             |
--   | 3  | severity     | Critical          | 1             |
--
-- NEW:
--   | id | key        | value                                    | description          |
--   |----|------------|------------------------------------------|----------------------|
--   | 1  | departments| ["Frontend - iOS", "Frontend - Android"] | Department options   |
--   | 2  | severities | ["Critical", "High", "Medium", "Low"]    | Bug severity levels  |

-- Step 1: Create new settings table with key-value JSON structure
CREATE TABLE IF NOT EXISTS settings_new (
    id INT AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(100) NOT NULL UNIQUE COMMENT 'Unique setting key (e.g., departments, severities)',
    value JSON NOT NULL COMMENT 'Setting value as JSON (can be array, object, string, number, boolean)',
    description TEXT COMMENT 'Human-readable description of what this setting controls',
    metadata JSON COMMENT 'Additional metadata (e.g., validation rules, UI hints)',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether this setting is active',
    created_by VARCHAR(50) NOT NULL COMMENT 'Employee ID who created this setting',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_key (`key`),
    INDEX idx_is_active (is_active),
    INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 2: Migrate data from old settings table to new structure
-- Group setting values by type into JSON arrays

-- Departments
INSERT INTO settings_new (`key`, value, description, created_by)
SELECT
    'departments' as `key`,
    CONCAT('[', GROUP_CONCAT(CONCAT('"', setting_value, '"') ORDER BY display_order SEPARATOR ','), ']') as value,
    'Department options for user assignment' as description,
    'SYSTEM' as created_by
FROM settings
WHERE setting_type = 'department' AND is_active = TRUE
HAVING COUNT(*) > 0;

-- Severities
INSERT INTO settings_new (`key`, value, description, created_by)
SELECT
    'severities' as `key`,
    CONCAT('[', GROUP_CONCAT(CONCAT('"', setting_value, '"') ORDER BY display_order SEPARATOR ','), ']') as value,
    'Bug severity levels' as description,
    'SYSTEM' as created_by
FROM settings
WHERE setting_type = 'severity' AND is_active = TRUE
HAVING COUNT(*) > 0;

-- Priorities
INSERT INTO settings_new (`key`, value, description, created_by)
SELECT
    'priorities' as `key`,
    CONCAT('[', GROUP_CONCAT(CONCAT('"', setting_value, '"') ORDER BY display_order SEPARATOR ','), ']') as value,
    'Bug priority levels' as description,
    'SYSTEM' as created_by
FROM settings
WHERE setting_type = 'priority' AND is_active = TRUE
HAVING COUNT(*) > 0;

-- Categories
INSERT INTO settings_new (`key`, value, description, created_by)
SELECT
    'categories' as `key`,
    CONCAT('[', GROUP_CONCAT(CONCAT('"', setting_value, '"') ORDER BY display_order SEPARATOR ','), ']') as value,
    'Bug category options' as description,
    'SYSTEM' as created_by
FROM settings
WHERE setting_type = 'category' AND is_active = TRUE
HAVING COUNT(*) > 0;

-- Platforms
INSERT INTO settings_new (`key`, value, description, created_by)
SELECT
    'platforms' as `key`,
    CONCAT('[', GROUP_CONCAT(CONCAT('"', setting_value, '"') ORDER BY display_order SEPARATOR ','), ']') as value,
    'Platform options for bugs' as description,
    'SYSTEM' as created_by
FROM settings
WHERE setting_type = 'platform' AND is_active = TRUE
HAVING COUNT(*) > 0;

-- Task Priorities
INSERT INTO settings_new (`key`, value, description, created_by)
SELECT
    'task_priorities' as `key`,
    CONCAT('[', GROUP_CONCAT(CONCAT('"', setting_value, '"') ORDER BY display_order SEPARATOR ','), ']') as value,
    'Task priority levels (Eisenhower Matrix)' as description,
    'SYSTEM' as created_by
FROM settings
WHERE setting_type = 'task_priority' AND is_active = TRUE
HAVING COUNT(*) > 0;

-- Task Statuses
INSERT INTO settings_new (`key`, value, description, created_by)
SELECT
    'task_statuses' as `key`,
    CONCAT('[', GROUP_CONCAT(CONCAT('"', setting_value, '"') ORDER BY display_order SEPARATOR ','), ']') as value,
    'Task status options' as description,
    'SYSTEM' as created_by
FROM settings
WHERE setting_type = 'task_status' AND is_active = TRUE
HAVING COUNT(*) > 0;

-- Bug Statuses
INSERT INTO settings_new (`key`, value, description, created_by)
SELECT
    'bug_statuses' as `key`,
    CONCAT('[', GROUP_CONCAT(CONCAT('"', setting_value, '"') ORDER BY display_order SEPARATOR ','), ']') as value,
    'Bug status options' as description,
    'SYSTEM' as created_by
FROM settings
WHERE setting_type = 'bug_status' AND is_active = TRUE
HAVING COUNT(*) > 0;

-- Bug Types
INSERT INTO settings_new (`key`, value, description, created_by)
SELECT
    'bug_types' as `key`,
    CONCAT('[', GROUP_CONCAT(CONCAT('"', setting_value, '"') ORDER BY display_order SEPARATOR ','), ']') as value,
    'Bug type classifications' as description,
    'SYSTEM' as created_by
FROM settings
WHERE setting_type = 'bug_type' AND is_active = TRUE
HAVING COUNT(*) > 0;

-- Step 3: Add some useful default settings that weren't in the old structure
INSERT INTO settings_new (`key`, value, description, created_by, metadata)
VALUES
    ('app_name', '"Task Management System"', 'Application name displayed in UI', 'SYSTEM', '{"type": "string", "editable": true}'),
    ('max_file_upload_size_mb', '10', 'Maximum file upload size in megabytes', 'SYSTEM', '{"type": "number", "min": 1, "max": 100}'),
    ('session_timeout_minutes', '60', 'Session timeout in minutes', 'SYSTEM', '{"type": "number", "min": 15, "max": 480}'),
    ('enable_email_notifications', 'true', 'Enable email notifications globally', 'SYSTEM', '{"type": "boolean"}'),
    ('default_task_priority', '"NU&NI"', 'Default priority for new tasks', 'SYSTEM', '{"type": "string", "options": ["U&I", "U&NI", "NU&I", "NU&NI"]}'),
    ('default_bug_status', '"New"', 'Default status for new bugs', 'SYSTEM', '{"type": "string"}')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- Step 4: Rename tables (backup old, activate new)
RENAME TABLE settings TO settings_old;
RENAME TABLE settings_new TO settings;

-- Step 5: Verification queries (these will show errors if run as part of migration, but are useful for manual verification)
-- SELECT * FROM settings ORDER BY `key`;
-- SELECT `key`, JSON_LENGTH(value) as item_count, description FROM settings WHERE JSON_TYPE(value) = 'ARRAY';
-- SELECT COUNT(*) as old_count FROM settings_old;
-- SELECT COUNT(*) as new_count FROM settings;

