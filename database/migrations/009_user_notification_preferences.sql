-- ============================================================================
-- Migration 009: User Notification Preferences System
-- ============================================================================
-- Purpose: Create table for managing user notification preferences
-- Author: System
-- Date: 2025-01-XX
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE USER_NOTIFICATION_PREFERENCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL,
    
    -- Notification Channels (TRUE = enabled, FALSE = disabled)
    email_enabled BOOLEAN DEFAULT TRUE COMMENT 'Receive email notifications',
    telegram_enabled BOOLEAN DEFAULT FALSE COMMENT 'Receive Telegram notifications',
    in_app_enabled BOOLEAN DEFAULT TRUE COMMENT 'Receive in-app notifications',
    
    -- Task Notifications
    task_assigned BOOLEAN DEFAULT TRUE COMMENT 'Notify when task is assigned to me',
    task_updated BOOLEAN DEFAULT TRUE COMMENT 'Notify when my task is updated',
    task_commented BOOLEAN DEFAULT TRUE COMMENT 'Notify when someone comments on my task',
    task_due_soon BOOLEAN DEFAULT TRUE COMMENT 'Notify when task due date is approaching',
    task_overdue BOOLEAN DEFAULT TRUE COMMENT 'Notify when task becomes overdue',
    task_completed BOOLEAN DEFAULT TRUE COMMENT 'Notify when task is marked complete',
    task_support_assigned BOOLEAN DEFAULT TRUE COMMENT 'Notify when added to task support team',
    
    -- Bug Notifications
    bug_assigned BOOLEAN DEFAULT TRUE COMMENT 'Notify when bug is assigned to me',
    bug_updated BOOLEAN DEFAULT TRUE COMMENT 'Notify when my bug is updated',
    bug_commented BOOLEAN DEFAULT TRUE COMMENT 'Notify when someone comments on my bug',
    bug_status_changed BOOLEAN DEFAULT TRUE COMMENT 'Notify when bug status changes',
    bug_severity_changed BOOLEAN DEFAULT TRUE COMMENT 'Notify when bug severity changes',
    
    -- Leave & WFH Notifications
    leave_approved BOOLEAN DEFAULT TRUE COMMENT 'Notify when leave is approved',
    leave_rejected BOOLEAN DEFAULT TRUE COMMENT 'Notify when leave is rejected',
    leave_pending_approval BOOLEAN DEFAULT TRUE COMMENT 'Notify when leave needs approval (for managers)',
    wfh_approved BOOLEAN DEFAULT TRUE COMMENT 'Notify when WFH is approved',
    wfh_rejected BOOLEAN DEFAULT TRUE COMMENT 'Notify when WFH is rejected',
    wfh_pending_approval BOOLEAN DEFAULT TRUE COMMENT 'Notify when WFH needs approval (for managers)',
    
    -- Project Notifications
    project_assigned BOOLEAN DEFAULT TRUE COMMENT 'Notify when assigned to project',
    project_updated BOOLEAN DEFAULT TRUE COMMENT 'Notify when project is updated',
    
    -- Team Notifications
    team_member_added BOOLEAN DEFAULT TRUE COMMENT 'Notify when added to a team',
    team_task_created BOOLEAN DEFAULT TRUE COMMENT 'Notify when task is created for my team',
    
    -- System Notifications
    system_announcements BOOLEAN DEFAULT TRUE COMMENT 'Receive system announcements',
    daily_summary BOOLEAN DEFAULT FALSE COMMENT 'Receive daily summary email',
    weekly_summary BOOLEAN DEFAULT FALSE COMMENT 'Receive weekly summary email',
    
    -- Notification Timing
    quiet_hours_enabled BOOLEAN DEFAULT FALSE COMMENT 'Enable quiet hours (no notifications)',
    quiet_hours_start TIME DEFAULT '22:00:00' COMMENT 'Quiet hours start time',
    quiet_hours_end TIME DEFAULT '08:00:00' COMMENT 'Quiet hours end time',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_employee (employee_id),
    INDEX idx_employee_id (employee_id),
    
    FOREIGN KEY (employee_id) REFERENCES users(employee_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User notification preferences for all notification types';

-- ============================================================================
-- PART 2: INSERT DEFAULT PREFERENCES FOR EXISTING USERS
-- ============================================================================

-- Insert default preferences for all existing users who don't have preferences yet
INSERT INTO user_notification_preferences (employee_id)
SELECT employee_id 
FROM users 
WHERE employee_id NOT IN (SELECT employee_id FROM user_notification_preferences)
ON DUPLICATE KEY UPDATE employee_id = employee_id;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

