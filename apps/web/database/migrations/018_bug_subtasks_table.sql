-- Migration 018: Bug Subtasks Table
-- Created: 2025-10-30
-- Description: 
--   Create bug_subtasks table with soft delete support
--   Similar to task subtasks but for bugs

-- ============================================================================
-- CREATE BUG_SUBTASKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS bug_subtasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parent_bug_id VARCHAR(100) NOT NULL,
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
    FOREIGN KEY (parent_bug_id) REFERENCES bugs(bug_id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_parent_bug_id (parent_bug_id),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_status (status),
    INDEX idx_is_completed (is_completed),
    INDEX idx_deleted_at (deleted_at),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================================

-- Verify bug_subtasks table was created
SELECT 'Bug subtasks table created' AS status, COUNT(*) AS column_count 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE table_schema = DATABASE() AND table_name = 'bug_subtasks';

