-- ============================================================================
-- Migration 031: Minimal Sequence Fix (PostgreSQL)
-- Description: Fix only the core table sequences that definitely exist
-- Date: 2025-11-06
-- Database: PostgreSQL
-- ============================================================================

-- This is the SIMPLEST version - only fixes the 6 core tables.
-- Run this if you're getting "relation does not exist" errors.

-- ============================================================================
-- BEFORE: Check current state
-- ============================================================================

SELECT 'BEFORE FIX - projects' AS info, 
       (SELECT last_value FROM projects_id_seq) AS sequence_value,
       (SELECT COALESCE(MAX(id), 0) FROM projects) AS table_max_id;

-- ============================================================================
-- FIX: Reset core sequences
-- ============================================================================

-- 1. Fix projects sequence (CRITICAL - this is causing your error)
SELECT setval('projects_id_seq', COALESCE((SELECT MAX(id) FROM projects), 0) + 1, false) AS projects_new_value;

-- 2. Fix users sequence
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 0) + 1, false) AS users_new_value;

-- 3. Fix tasks sequence
SELECT setval('tasks_id_seq', COALESCE((SELECT MAX(id) FROM tasks), 0) + 1, false) AS tasks_new_value;

-- 4. Fix bugs sequence
SELECT setval('bugs_id_seq', COALESCE((SELECT MAX(id) FROM bugs), 0) + 1, false) AS bugs_new_value;

-- 5. Fix activity_log sequence
SELECT setval('activity_log_id_seq', COALESCE((SELECT MAX(id) FROM activity_log), 0) + 1, false) AS activity_log_new_value;

-- 6. Fix settings sequence
SELECT setval('settings_id_seq', COALESCE((SELECT MAX(id) FROM settings), 0) + 1, false) AS settings_new_value;

-- ============================================================================
-- AFTER: Verify the fix
-- ============================================================================

SELECT 'AFTER FIX - projects' AS info,
       (SELECT last_value FROM projects_id_seq) AS sequence_value,
       (SELECT COALESCE(MAX(id), 0) FROM projects) AS table_max_id;

-- Final verification
SELECT 
  CASE 
    WHEN (SELECT last_value FROM projects_id_seq) > (SELECT COALESCE(MAX(id), 0) FROM projects)
    THEN '✅ SUCCESS: All sequences are fixed!'
    ELSE '❌ FAILED: Sequences still need fixing'
  END AS result;

-- ============================================================================
-- DONE!
-- ============================================================================

SELECT '✅ Core sequences have been reset!' AS message;
SELECT 'You can now create projects, tasks, bugs, etc.' AS info;

