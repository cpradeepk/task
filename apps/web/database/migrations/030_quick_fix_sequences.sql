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
-- FIX: Reset all sequences (only for tables that exist)
-- ============================================================================

-- Fix projects sequence (includes both projects and subprojects)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'projects_id_seq') THEN
    PERFORM setval('projects_id_seq', COALESCE((SELECT MAX(id) FROM projects), 0) + 1, false);
    RAISE NOTICE '✅ Fixed projects_id_seq';
  END IF;
END $$;

-- Fix users sequence
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'users_id_seq') THEN
    PERFORM setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 0) + 1, false);
    RAISE NOTICE '✅ Fixed users_id_seq';
  END IF;
END $$;

-- Fix tasks sequence
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'tasks_id_seq') THEN
    PERFORM setval('tasks_id_seq', COALESCE((SELECT MAX(id) FROM tasks), 0) + 1, false);
    RAISE NOTICE '✅ Fixed tasks_id_seq';
  END IF;
END $$;

-- Fix bugs sequence
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'bugs_id_seq') THEN
    PERFORM setval('bugs_id_seq', COALESCE((SELECT MAX(id) FROM bugs), 0) + 1, false);
    RAISE NOTICE '✅ Fixed bugs_id_seq';
  END IF;
END $$;

-- Fix activity_log sequence
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'activity_log_id_seq') THEN
    PERFORM setval('activity_log_id_seq', COALESCE((SELECT MAX(id) FROM activity_log), 0) + 1, false);
    RAISE NOTICE '✅ Fixed activity_log_id_seq';
  END IF;
END $$;

-- Fix settings sequence
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'settings_id_seq') THEN
    PERFORM setval('settings_id_seq', COALESCE((SELECT MAX(id) FROM settings), 0) + 1, false);
    RAISE NOTICE '✅ Fixed settings_id_seq';
  END IF;
END $$;

-- Fix task_checklists sequence (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'task_checklists_id_seq') THEN
    PERFORM setval('task_checklists_id_seq', COALESCE((SELECT MAX(id) FROM task_checklists), 0) + 1, false);
    RAISE NOTICE '✅ Fixed task_checklists_id_seq';
  END IF;
END $$;

-- Fix development_checklists sequence (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'development_checklists_id_seq') THEN
    PERFORM setval('development_checklists_id_seq', COALESCE((SELECT MAX(id) FROM development_checklists), 0) + 1, false);
    RAISE NOTICE '✅ Fixed development_checklists_id_seq';
  END IF;
END $$;

-- Fix leave_applications sequence (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'leave_applications_id_seq') THEN
    PERFORM setval('leave_applications_id_seq', COALESCE((SELECT MAX(id) FROM leave_applications), 0) + 1, false);
    RAISE NOTICE '✅ Fixed leave_applications_id_seq';
  END IF;
END $$;

-- Fix wfh_applications sequence (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'wfh_applications_id_seq') THEN
    PERFORM setval('wfh_applications_id_seq', COALESCE((SELECT MAX(id) FROM wfh_applications), 0) + 1, false);
    RAISE NOTICE '✅ Fixed wfh_applications_id_seq';
  END IF;
END $$;

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

