-- ============================================================================
-- Migration 056: Release work-item type + bug release_state column
-- Date: 2026-06-27
-- Database: PostgreSQL/Supabase
-- Description:
--   1. Update the 'bug_types' setting to ["feature","bug","other","release"]
--      (drops legacy 'testcase', adds 'release').
--   2. Migrate any existing 'testcase' bugs to 'bug'.
--   3. Swap the bugs_type_check CHECK constraint to the new allowed set.
--   4. Add bugs.release_state JSONB to hold per-platform release checklist
--      snapshot, manual items, completion map, and store versions.
-- ============================================================================

-- 1) Seed/refresh the bug_types dropdown setting (JSONB key/value shape).
INSERT INTO settings (key, value, description, created_by, is_active)
VALUES (
  'bug_types',
  '["feature","bug","other","release"]'::jsonb,
  'Allowed work-item types for the development (bugs) module',
  'system',
  true
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value;

-- 2) Migrate stale 'testcase' bugs to 'bug'.
UPDATE bugs SET type = 'bug' WHERE type = 'testcase';

-- 3) Replace the type CHECK constraint with the new allowed set (NULL allowed).
ALTER TABLE bugs DROP CONSTRAINT IF EXISTS bugs_type_check;

ALTER TABLE bugs
ADD CONSTRAINT bugs_type_check
CHECK (type IS NULL OR type IN ('feature', 'bug', 'other', 'release'));

-- 4) Release state JSONB column (platforms, per-platform template snapshot +
--    manual items + completion, store versions).
ALTER TABLE bugs ADD COLUMN IF NOT EXISTS release_state JSONB;
