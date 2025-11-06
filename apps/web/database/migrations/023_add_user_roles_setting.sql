-- ============================================================================
-- Migration 023: Add User Roles Setting
-- Description: Add user_roles setting to settings table for dynamic role management
-- Date: 2025-11-06
-- Database: PostgreSQL (Supabase)
-- ============================================================================

-- Add user_roles setting to settings table
-- This allows dynamic role management instead of hardcoded roles
INSERT INTO settings (key, value, description, is_active, created_by, created_at, updated_at)
VALUES (
    'user_roles',
    '["top_management", "management", "amtarikshain", "employee", "intern", "external"]',
    'Available user roles for the system. Order matters for display in dropdowns.',
    TRUE,
    'SYSTEM',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check if setting was added
SELECT key, value, description, is_active
FROM settings
WHERE key = 'user_roles';

-- ============================================================================
-- Usage Notes
-- ============================================================================

-- The user_roles setting contains a JSON array of role values
-- These roles will be used in:
-- 1. User creation form (role dropdown)
-- 2. User edit modal (role dropdown)
-- 3. Role filter dropdowns
-- 4. Permission management page

-- To add a new role:
-- UPDATE settings 
-- SET value = '["top_management", "management", "amtarikshain", "employee", "intern", "external", "new_role"]'
-- WHERE key = 'user_roles';

-- To remove a role:
-- UPDATE settings 
-- SET value = '["top_management", "management", "employee"]'
-- WHERE key = 'user_roles';

-- IMPORTANT: The 'admin' role is special and managed separately via is_system_admin flag
-- It should NOT be included in the user_roles setting

-- ============================================================================
-- Rollback (if needed)
-- ============================================================================

-- To rollback this migration:
-- DELETE FROM settings WHERE key = 'user_roles';

-- ============================================================================

