-- ============================================================================
-- Migration 061: Make users.department optional
-- Date: 2026-07-26
-- Database: PostgreSQL/Supabase
-- Description:
--   The tool is moving from a single internal company to multiple companies.
--   `department` was NOT NULL and the picker fell back to a hardcoded list of
--   Amtariksha-specific values ('Frontend - iOS', 'Mar-Tech', 'Backend - UBAR',
--   'Brand Partnerships', ...), which is meaningless for another company and
--   blocked user creation until someone edited the settings row.
--
--   Departments remain available and settings-driven; they are simply no longer
--   mandatory. Existing values are untouched.
--
-- Rollback: see 061_optional_department_rollback.postgresql.sql
-- ============================================================================

ALTER TABLE users ALTER COLUMN department DROP NOT NULL;

-- ============================================================================
-- Verification
-- ============================================================================
-- Expect is_nullable = 'YES'
--
--   SELECT column_name, is_nullable, data_type
--     FROM information_schema.columns
--    WHERE table_name = 'users' AND column_name = 'department';
