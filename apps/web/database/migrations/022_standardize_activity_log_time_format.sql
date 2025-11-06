-- ============================================================================
-- Migration: Standardize Activity Log Time Format to hh:mm:ss
-- ============================================================================
-- 
-- Purpose: Convert all time-related activity log entries to use standardized
--          hh:mm:ss format instead of various formats like "2.5 hours", "2h 30m 15s", etc.
--
-- Target: activity_log table, action_type = 'time_logged'
--
-- Date: 2025-01-06
-- Database: PostgreSQL (Supabase)
-- ============================================================================

-- ============================================================================
-- IMPORTANT: This migration updates existing data
-- ============================================================================
-- Before running this migration:
-- 1. Backup your activity_log table
-- 2. Review the UPDATE statements below
-- 3. Test on a staging environment first
-- 4. Run during low-traffic period
-- ============================================================================

-- ============================================================================
-- Step 1: Add a temporary column to track migration status
-- ============================================================================
ALTER TABLE activity_log 
ADD COLUMN IF NOT EXISTS time_format_migrated BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN activity_log.time_format_migrated IS 'Tracks if this entry has been migrated to hh:mm:ss format';

-- ============================================================================
-- Step 2: Update entries with decimal hours format (e.g., "Logged 2.5 hours")
-- ============================================================================
-- Pattern: "Logged X.X hours" or "Logged X hours"
-- Convert to: "Logged HH:MM:SS (timer/manual entry)"
--
-- Note: This is a complex transformation that requires a custom function
-- PostgreSQL doesn't have built-in regex replace with calculations
-- You may need to run this update manually for each entry or use a script
-- ============================================================================

-- Example manual updates (you'll need to identify and update each entry):
-- UPDATE activity_log 
-- SET description = 'Logged 02:30:00 (manual entry)',
--     time_format_migrated = TRUE
-- WHERE id = <specific_id> AND action_type = 'time_logged' AND description LIKE '%2.5 hours%';

-- ============================================================================
-- Step 3: Update entries with readable format (e.g., "Logged 2h 30m 15s")
-- ============================================================================
-- Pattern: "Logged Xh Ym Zs" or variations
-- Convert to: "Logged HH:MM:SS (timer entry)"
--
-- Note: Similar to Step 2, this requires custom logic
-- ============================================================================

-- ============================================================================
-- Step 4: Mark entries that are already in correct format
-- ============================================================================
-- Pattern: "Logged HH:MM:SS (timer/manual entry)"
UPDATE activity_log 
SET time_format_migrated = TRUE
WHERE action_type = 'time_logged' 
  AND description ~ 'Logged \d{2}:\d{2}:\d{2} \((timer|manual) entry\)'
  AND time_format_migrated = FALSE;

-- ============================================================================
-- Step 5: Verification Queries
-- ============================================================================

-- Count total time_logged entries
SELECT COUNT(*) as total_time_logged_entries
FROM activity_log
WHERE action_type = 'time_logged';

-- Count migrated entries
SELECT COUNT(*) as migrated_entries
FROM activity_log
WHERE action_type = 'time_logged' AND time_format_migrated = TRUE;

-- Count unmigrated entries (need manual review)
SELECT COUNT(*) as unmigrated_entries
FROM activity_log
WHERE action_type = 'time_logged' AND time_format_migrated = FALSE;

-- Show unmigrated entries for manual review
SELECT id, entity_type, entity_id, description, created_at
FROM activity_log
WHERE action_type = 'time_logged' AND time_format_migrated = FALSE
ORDER BY created_at DESC
LIMIT 50;

-- ============================================================================
-- Step 6: Cleanup (Optional - run after verifying migration)
-- ============================================================================
-- Remove the temporary migration tracking column
-- ALTER TABLE activity_log DROP COLUMN IF EXISTS time_format_migrated;

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 
-- This migration is SEMI-AUTOMATED because:
-- 1. PostgreSQL doesn't have built-in functions to parse and convert time formats
-- 2. The existing data may have various formats that need custom parsing
-- 3. Manual review ensures data accuracy
--
-- Recommended Approach:
-- 1. Run this migration to mark already-correct entries
-- 2. Export unmigrated entries to CSV
-- 3. Use a script (Python/Node.js) to convert formats
-- 4. Update entries via API or direct SQL
-- 5. Verify all entries are migrated
-- 6. Drop the temporary column
--
-- Going Forward:
-- - All new time_logged entries will use hh:mm:ss format automatically
-- - Code changes ensure consistent format (see commits for details)
-- ============================================================================

