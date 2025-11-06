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

-- Show current state of key sequences
SELECT 'projects_id_seq' AS sequence_name, last_value, (SELECT MAX(id) FROM projects) AS table_max_id FROM projects_id_seq
UNION ALL
SELECT 'users_id_seq', last_value, (SELECT MAX(id) FROM users) FROM users_id_seq
UNION ALL
SELECT 'tasks_id_seq', last_value, (SELECT MAX(id) FROM tasks) FROM tasks_id_seq
UNION ALL
SELECT 'bugs_id_seq', last_value, (SELECT MAX(id) FROM bugs) FROM bugs_id_seq
UNION ALL
SELECT 'activity_log_id_seq', last_value, (SELECT MAX(id) FROM activity_log) FROM activity_log_id_seq
UNION ALL
SELECT 'settings_id_seq', last_value, (SELECT MAX(id) FROM settings) FROM settings_id_seq
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
  'projects_id_seq' AS sequence_name,
  last_value AS sequence_value,
  (SELECT MAX(id) FROM projects) AS table_max_id,
  CASE WHEN last_value > (SELECT COALESCE(MAX(id), 0) FROM projects) THEN '✅ OK' ELSE '❌ NEEDS FIX' END AS status
FROM projects_id_seq
UNION ALL
SELECT
  'users_id_seq',
  last_value,
  (SELECT MAX(id) FROM users),
  CASE WHEN last_value > (SELECT COALESCE(MAX(id), 0) FROM users) THEN '✅ OK' ELSE '❌ NEEDS FIX' END
FROM users_id_seq
UNION ALL
SELECT
  'tasks_id_seq',
  last_value,
  (SELECT MAX(id) FROM tasks),
  CASE WHEN last_value > (SELECT COALESCE(MAX(id), 0) FROM tasks) THEN '✅ OK' ELSE '❌ NEEDS FIX' END
FROM tasks_id_seq
UNION ALL
SELECT
  'bugs_id_seq',
  last_value,
  (SELECT MAX(id) FROM bugs),
  CASE WHEN last_value > (SELECT COALESCE(MAX(id), 0) FROM bugs) THEN '✅ OK' ELSE '❌ NEEDS FIX' END
FROM bugs_id_seq
UNION ALL
SELECT
  'activity_log_id_seq',
  last_value,
  (SELECT MAX(id) FROM activity_log),
  CASE WHEN last_value > (SELECT COALESCE(MAX(id), 0) FROM activity_log) THEN '✅ OK' ELSE '❌ NEEDS FIX' END
FROM activity_log_id_seq
UNION ALL
SELECT
  'settings_id_seq',
  last_value,
  (SELECT MAX(id) FROM settings),
  CASE WHEN last_value > (SELECT COALESCE(MAX(id), 0) FROM settings) THEN '✅ OK' ELSE '❌ NEEDS FIX' END
FROM settings_id_seq
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

