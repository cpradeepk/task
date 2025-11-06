-- ============================================================================
-- Migration 030: Quick Fix for All Sequences (PostgreSQL)
-- Description: Simple, working version to fix all sequence errors
-- Date: 2025-11-06
-- Database: PostgreSQL
-- ============================================================================

-- This is a simplified version that just fixes the sequences without
-- complex verification queries. Run this if migrations 028/029 have errors.

-- ============================================================================
-- BEFORE: Check current state
-- ============================================================================

-- Check projects sequence
SELECT 'BEFORE FIX - projects_id_seq' AS info, last_value FROM projects_id_seq;
SELECT 'BEFORE FIX - projects max id' AS info, COALESCE(MAX(id), 0) AS last_value FROM projects;

-- ============================================================================
-- FIX: Reset all sequences
-- ============================================================================

-- Fix projects sequence (includes both projects and subprojects)
SELECT setval('projects_id_seq', COALESCE((SELECT MAX(id) FROM projects), 0) + 1, false);

-- Fix users sequence
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 0) + 1, false);

-- Fix tasks sequence
SELECT setval('tasks_id_seq', COALESCE((SELECT MAX(id) FROM tasks), 0) + 1, false);

-- Fix bugs sequence
SELECT setval('bugs_id_seq', COALESCE((SELECT MAX(id) FROM bugs), 0) + 1, false);

-- Fix activity_log sequence
SELECT setval('activity_log_id_seq', COALESCE((SELECT MAX(id) FROM activity_log), 0) + 1, false);

-- Fix settings sequence
SELECT setval('settings_id_seq', COALESCE((SELECT MAX(id) FROM settings), 0) + 1, false);

-- Fix task_checklists sequence (if exists)
SELECT setval('task_checklists_id_seq', COALESCE((SELECT MAX(id) FROM task_checklists), 0) + 1, false);

-- Fix development_checklists sequence (if exists)
SELECT setval('development_checklists_id_seq', COALESCE((SELECT MAX(id) FROM development_checklists), 0) + 1, false);

-- Fix leave_applications sequence (if exists)
SELECT setval('leave_applications_id_seq', COALESCE((SELECT MAX(id) FROM leave_applications), 0) + 1, false);

-- Fix wfh_applications sequence (if exists)
SELECT setval('wfh_applications_id_seq', COALESCE((SELECT MAX(id) FROM wfh_applications), 0) + 1, false);

-- ============================================================================
-- AFTER: Verify the fix
-- ============================================================================

-- Check projects sequence after fix
SELECT 'AFTER FIX - projects_id_seq' AS info, last_value FROM projects_id_seq;
SELECT 'AFTER FIX - projects max id' AS info, COALESCE(MAX(id), 0) AS last_value FROM projects;

-- Verify: sequence should be > max id
SELECT 
  CASE 
    WHEN (SELECT last_value FROM projects_id_seq) > (SELECT COALESCE(MAX(id), 0) FROM projects)
    THEN '✅ SUCCESS: Projects sequence is fixed!'
    ELSE '❌ FAILED: Projects sequence still needs fixing'
  END AS result;

-- ============================================================================
-- TEST: Try inserting a test project (optional)
-- ============================================================================

-- Uncomment to test:
/*
INSERT INTO projects (project_id, project_name, status, created_by)
VALUES ('TEST-001', 'Test Project', 'active', 'AM-0001');

SELECT 'Test insert successful!' AS result;

-- Clean up test data
DELETE FROM projects WHERE project_id = 'TEST-001';
*/

-- ============================================================================
-- DONE!
-- ============================================================================

SELECT '✅ All sequences have been reset!' AS result;
SELECT 'You can now create projects, tasks, bugs, etc. without errors.' AS info;

