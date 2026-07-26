-- ============================================================================
-- Rollback for Migration 061: restore users.department NOT NULL
-- ============================================================================
-- Any rows created while department was optional may hold NULL. Backfill them
-- first, otherwise the ALTER fails.
--
-- Inspect what would be affected before running:
--   SELECT employee_id, name, email FROM users WHERE department IS NULL;
-- ============================================================================

UPDATE users SET department = 'Unassigned' WHERE department IS NULL;

ALTER TABLE users ALTER COLUMN department SET NOT NULL;
