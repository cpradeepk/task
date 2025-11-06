-- ============================================================================
-- Migration 029: Fix All Table Sequences (PostgreSQL)
-- Description: Reset all SERIAL sequences to prevent duplicate key errors
-- Date: 2025-11-06
-- Database: PostgreSQL
-- ============================================================================

-- PROBLEM:
-- When migrating from MySQL to PostgreSQL, or when importing data with
-- specific ID values, the SERIAL sequences can get out of sync with the
-- actual data in the tables. This causes "duplicate key" errors when
-- inserting new rows.

-- SOLUTION:
-- Reset all sequences to MAX(id) + 1 for all tables with SERIAL primary keys

-- ============================================================================
-- Step 1: Check current state of all sequences
-- ============================================================================

-- IMPORTANT: For projects table, MAX(id) includes BOTH projects AND subprojects
-- since they share the same table and same id column. This is correct!

-- Show all sequences and their current values
SELECT
  sequence_name,
  last_value,
  (SELECT COALESCE(MAX(id), 0) FROM projects) AS projects_max_id,
  (SELECT COUNT(*) FROM projects WHERE parent_project_id IS NULL) AS projects_count,
  (SELECT COUNT(*) FROM projects WHERE parent_project_id IS NOT NULL) AS subprojects_count,
  (SELECT COALESCE(MAX(id), 0) FROM users) AS users_max_id,
  (SELECT COALESCE(MAX(id), 0) FROM tasks) AS tasks_max_id,
  (SELECT COALESCE(MAX(id), 0) FROM bugs) AS bugs_max_id,
  (SELECT COALESCE(MAX(id), 0) FROM activity_log) AS activity_log_max_id,
  (SELECT COALESCE(MAX(id), 0) FROM settings) AS settings_max_id
FROM information_schema.sequences
WHERE sequence_schema = 'public'
  AND sequence_name LIKE '%_id_seq'
ORDER BY sequence_name;

-- Show detailed projects table info
SELECT
  'Projects Table Analysis' AS info,
  COUNT(*) AS total_rows,
  COUNT(CASE WHEN parent_project_id IS NULL THEN 1 END) AS projects,
  COUNT(CASE WHEN parent_project_id IS NOT NULL THEN 1 END) AS subprojects,
  MAX(id) AS max_id,
  (SELECT last_value FROM projects_id_seq) AS sequence_value,
  CASE
    WHEN (SELECT last_value FROM projects_id_seq) > MAX(id) THEN '✅ Sequence OK'
    ELSE '❌ Sequence needs fix'
  END AS status
FROM projects;

-- ============================================================================
-- Step 2: Reset all sequences
-- ============================================================================

-- Reset projects sequence
SELECT setval('projects_id_seq', COALESCE((SELECT MAX(id) FROM projects), 0) + 1, false);

-- Reset users sequence (if exists)
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 0) + 1, false);

-- Reset tasks sequence (if exists)
SELECT setval('tasks_id_seq', COALESCE((SELECT MAX(id) FROM tasks), 0) + 1, false);

-- Reset bugs sequence (if exists)
SELECT setval('bugs_id_seq', COALESCE((SELECT MAX(id) FROM bugs), 0) + 1, false);

-- Reset activity_log sequence (if exists)
SELECT setval('activity_log_id_seq', COALESCE((SELECT MAX(id) FROM activity_log), 0) + 1, false);

-- Reset settings sequence (if exists)
SELECT setval('settings_id_seq', COALESCE((SELECT MAX(id) FROM settings), 0) + 1, false);

-- Reset task_checklists sequence (if exists)
SELECT setval('task_checklists_id_seq', COALESCE((SELECT MAX(id) FROM task_checklists), 0) + 1, false);

-- Reset development_checklists sequence (if exists)
SELECT setval('development_checklists_id_seq', COALESCE((SELECT MAX(id) FROM development_checklists), 0) + 1, false);

-- Reset leave_applications sequence (if exists)
SELECT setval('leave_applications_id_seq', COALESCE((SELECT MAX(id) FROM leave_applications), 0) + 1, false);

-- Reset wfh_applications sequence (if exists)
SELECT setval('wfh_applications_id_seq', COALESCE((SELECT MAX(id) FROM wfh_applications), 0) + 1, false);

-- ============================================================================
-- Step 3: Verification
-- ============================================================================

-- Verify all sequences were reset correctly
SELECT 
  sequence_name,
  last_value AS sequence_value,
  CASE sequence_name
    WHEN 'projects_id_seq' THEN (SELECT COALESCE(MAX(id), 0) FROM projects)
    WHEN 'users_id_seq' THEN (SELECT COALESCE(MAX(id), 0) FROM users)
    WHEN 'tasks_id_seq' THEN (SELECT COALESCE(MAX(id), 0) FROM tasks)
    WHEN 'bugs_id_seq' THEN (SELECT COALESCE(MAX(id), 0) FROM bugs)
    WHEN 'activity_log_id_seq' THEN (SELECT COALESCE(MAX(id), 0) FROM activity_log)
    WHEN 'settings_id_seq' THEN (SELECT COALESCE(MAX(id), 0) FROM settings)
    WHEN 'task_checklists_id_seq' THEN (SELECT COALESCE(MAX(id), 0) FROM task_checklists)
    WHEN 'development_checklists_id_seq' THEN (SELECT COALESCE(MAX(id), 0) FROM development_checklists)
    WHEN 'leave_applications_id_seq' THEN (SELECT COALESCE(MAX(id), 0) FROM leave_applications)
    WHEN 'wfh_applications_id_seq' THEN (SELECT COALESCE(MAX(id), 0) FROM wfh_applications)
  END AS table_max_id,
  CASE 
    WHEN last_value > CASE sequence_name
      WHEN 'projects_id_seq' THEN (SELECT COALESCE(MAX(id), 0) FROM projects)
      WHEN 'users_id_seq' THEN (SELECT COALESCE(MAX(id), 0) FROM users)
      WHEN 'tasks_id_seq' THEN (SELECT COALESCE(MAX(id), 0) FROM tasks)
      WHEN 'bugs_id_seq' THEN (SELECT COALESCE(MAX(id), 0) FROM bugs)
      WHEN 'activity_log_id_seq' THEN (SELECT COALESCE(MAX(id), 0) FROM activity_log)
      WHEN 'settings_id_seq' THEN (SELECT COALESCE(MAX(id), 0) FROM settings)
      WHEN 'task_checklists_id_seq' THEN (SELECT COALESCE(MAX(id), 0) FROM task_checklists)
      WHEN 'development_checklists_id_seq' THEN (SELECT COALESCE(MAX(id), 0) FROM development_checklists)
      WHEN 'leave_applications_id_seq' THEN (SELECT COALESCE(MAX(id), 0) FROM leave_applications)
      WHEN 'wfh_applications_id_seq' THEN (SELECT COALESCE(MAX(id), 0) FROM wfh_applications)
    END 
    THEN '✅ OK'
    ELSE '❌ NEEDS FIX'
  END AS status
FROM information_schema.sequences
WHERE sequence_schema = 'public'
  AND sequence_name LIKE '%_id_seq'
ORDER BY sequence_name;

-- ============================================================================
-- NOTES
-- ============================================================================

-- This migration should be run:
-- 1. After migrating from MySQL to PostgreSQL
-- 2. After importing data with specific ID values
-- 3. Whenever you see "duplicate key" errors on SERIAL columns

-- To prevent this issue in the future:
-- 1. Never manually specify ID values in INSERT statements
-- 2. Always let PostgreSQL auto-generate IDs using sequences
-- 3. After bulk imports, run this migration to reset sequences

