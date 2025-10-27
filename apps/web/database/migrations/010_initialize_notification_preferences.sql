-- Migration 010: Initialize Notification Preferences for All Users
-- This migration creates default notification preferences for all existing users

-- Insert notification preferences for all users who don't have them yet
-- Using INSERT IGNORE to skip users who already have preferences
INSERT IGNORE INTO user_notification_preferences (employee_id) 
SELECT employee_id 
FROM users
WHERE status = 'active';

-- Verify the insertion
SELECT 
    COUNT(*) as total_users,
    (SELECT COUNT(*) FROM user_notification_preferences) as users_with_preferences
FROM users
WHERE status = 'active';

