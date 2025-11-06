-- ============================================================================
-- Migration 026: Fix bugs_type_check Constraint to Allow NULL
-- Description: Modify the CHECK constraint on bugs.type to allow NULL values
-- Date: 2025-11-06
-- Database: MySQL/PostgreSQL
-- ============================================================================

-- Problem: The bugs_type_check constraint only allowed 'testcase', 'feature', 'other'
-- but did not allow NULL, causing bug creation to fail when type is not specified

-- For MySQL/MariaDB:
-- MySQL doesn't enforce CHECK constraints in older versions, so this is mainly for PostgreSQL

-- For PostgreSQL:
-- Drop the old constraint and add a new one that allows NULL
ALTER TABLE bugs DROP CONSTRAINT IF EXISTS bugs_type_check;

ALTER TABLE bugs 
ADD CONSTRAINT bugs_type_check 
CHECK (type IS NULL OR type IN ('testcase', 'feature', 'other'));

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check the new constraint definition
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'bugs_type_check';

-- Test that NULL is now allowed (this should succeed)
-- INSERT INTO bugs (bug_id, title, description, severity, priority, status, category, platform, assigned_to, created_by, type)
-- VALUES ('TEST-001', 'Test Bug', 'Test Description', 'Minor', 'Low', 'New', 'Other', 'Web', 'AM-0001', 'AM-0001', NULL);
-- DELETE FROM bugs WHERE bug_id = 'TEST-001';

-- ============================================================================
-- Allowed Values
-- ============================================================================

-- The type column can now have these values:
-- - NULL (default for regular bugs)
-- - 'testcase' (for test case bugs)
-- - 'feature' (for feature requests)
-- - 'other' (for other types)

-- ============================================================================
-- Impact
-- ============================================================================

-- This fix allows:
-- 1. Bug creation without specifying type (defaults to NULL)
-- 2. Regular bugs to have NULL type (treated as bugs, not features)
-- 3. Feature requests to have type = 'feature'
-- 4. Test cases to have type = 'testcase'
-- 5. Other types to have type = 'other'

-- ============================================================================
-- Rollback (if needed)
-- ============================================================================

-- To rollback to the old constraint (not recommended):
-- ALTER TABLE bugs DROP CONSTRAINT IF EXISTS bugs_type_check;
-- ALTER TABLE bugs 
-- ADD CONSTRAINT bugs_type_check 
-- CHECK (type IN ('testcase', 'feature', 'other'));

-- ============================================================================

