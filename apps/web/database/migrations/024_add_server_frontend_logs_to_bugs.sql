-- ============================================================================
-- Migration 024: Add Server Logs and Frontend Logs to Bugs Table
-- Description: Add server_logs and frontend_logs columns to bugs table
-- Date: 2025-11-06
-- Database: MySQL/PostgreSQL
-- ============================================================================

-- Add server_logs column to bugs table
-- This column stores server-side error logs and stack traces
ALTER TABLE bugs
ADD COLUMN server_logs TEXT NULL
COMMENT 'Server-side error logs and stack traces';

-- Add frontend_logs column to bugs table
-- This column stores frontend/client-side error logs and console output
ALTER TABLE bugs
ADD COLUMN frontend_logs TEXT NULL
COMMENT 'Frontend/client-side error logs and console output';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check if columns were added
SHOW COLUMNS FROM bugs LIKE '%logs%';

-- Or for PostgreSQL:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'bugs' AND column_name LIKE '%logs%';

-- ============================================================================
-- Usage Notes
-- ============================================================================

-- These columns are used to store:
-- 1. server_logs: Backend error logs, stack traces, API errors
-- 2. frontend_logs: Browser console errors, React errors, client-side issues

-- Example usage:
-- INSERT INTO bugs (bug_id, title, description, server_logs, frontend_logs, ...)
-- VALUES ('BUG-0001', 'Login Error', 'User cannot login', 
--         'Error: Database connection failed\nStack trace: ...',
--         'TypeError: Cannot read property of undefined\nConsole: ...',
--         ...);

-- ============================================================================
-- Rollback (if needed)
-- ============================================================================

-- To rollback this migration:
-- ALTER TABLE bugs DROP COLUMN server_logs;
-- ALTER TABLE bugs DROP COLUMN frontend_logs;

-- ============================================================================

