-- ============================================================================
-- Migration 024: Add Server Logs and Frontend Logs to Bugs Table (PostgreSQL)
-- Description: Add server_logs and frontend_logs columns to bugs table
-- Date: 2025-11-06
-- Database: PostgreSQL
-- ============================================================================

-- Add server_logs column to bugs table
-- This column stores server-side error logs and stack traces
ALTER TABLE bugs
ADD COLUMN IF NOT EXISTS server_logs TEXT NULL;

COMMENT ON COLUMN bugs.server_logs IS 'Server-side error logs and stack traces';

-- Add frontend_logs column to bugs table
-- This column stores frontend/client-side error logs and console output
ALTER TABLE bugs
ADD COLUMN IF NOT EXISTS frontend_logs TEXT NULL;

COMMENT ON COLUMN bugs.frontend_logs IS 'Frontend/client-side error logs and console output';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check if columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'bugs' AND column_name IN ('server_logs', 'frontend_logs')
ORDER BY column_name;

-- ============================================================================
-- Usage Notes
-- ============================================================================

-- These columns are used to store:
-- 1. server_logs: Backend error logs, stack traces, API errors
-- 2. frontend_logs: Browser console errors, React errors, client-side issues

-- Example usage:
-- INSERT INTO bugs (bug_id, title, description, server_logs, frontend_logs, ...)
-- VALUES ('BUG-0001', 'Login Error', 'User cannot login', 
--         'Error: Database connection failed
-- Stack trace: ...',
--         'TypeError: Cannot read property of undefined
-- Console: ...',
--         ...);

-- ============================================================================
-- Rollback (if needed)
-- ============================================================================

-- To rollback this migration:
-- ALTER TABLE bugs DROP COLUMN IF EXISTS server_logs;
-- ALTER TABLE bugs DROP COLUMN IF EXISTS frontend_logs;

-- ============================================================================

