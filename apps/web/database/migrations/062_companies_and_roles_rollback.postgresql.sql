-- ============================================================================
-- Rollback for Migration 062: companies, per-project roles, platform admin
-- ============================================================================
-- Returns the schema to its 061 state. Everything 062 added was additive, so no
-- pre-existing data is lost.
--
-- Runs inside a TRANSACTION: if any step fails the whole rollback is undone,
-- rather than leaving a half-reverted schema. (An earlier version dropped
-- settings.company_id before restoring the UNIQUE(key) constraint, so a failure
-- at that point destroyed the information needed to retry.)
--
-- The one destructive step is deliberate and called out below: company-scoped
-- settings rows are deleted, because a schema without company_id cannot
-- represent them. Review them first if you have configured any:
--
--   SELECT key, company_id, value FROM settings WHERE company_id IS NOT NULL;
--
-- Take a snapshot before running: Supabase dashboard > Database > Backups
-- ============================================================================

BEGIN;

-- 1. Settings ------------------------------------------------------------
-- Drop the partial indexes first so the deletes below are unencumbered.
DROP INDEX IF EXISTS idx_settings_company_key;
DROP INDEX IF EXISTS idx_settings_platform_key;

-- DESTRUCTIVE: per-company overrides cannot exist once company_id is gone.
-- Rows that predate 062 have company_id IS NULL and are untouched.
DELETE FROM settings WHERE company_id IS NOT NULL;

-- Any remaining duplicate keys would block the UNIQUE constraint. Keep the
-- lowest id per key — with the company rows gone this should be a no-op.
DELETE FROM settings s
 USING settings other
 WHERE s.key = other.key
   AND s.id > other.id;

ALTER TABLE settings DROP CONSTRAINT IF EXISTS fk_settings_company;
ALTER TABLE settings DROP COLUMN IF EXISTS company_id;

DO $$ BEGIN
    ALTER TABLE settings ADD CONSTRAINT settings_key_key UNIQUE (key);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Feed scoping --------------------------------------------------------
ALTER TABLE feed_topics DROP COLUMN IF EXISTS company_id;
ALTER TABLE feed_posts  DROP COLUMN IF EXISTS company_id;

-- 3. Project scoping -----------------------------------------------------
DROP INDEX IF EXISTS idx_projects_company_id;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS fk_projects_company;
ALTER TABLE projects DROP COLUMN IF EXISTS company_id;

-- 4. Per-project role ----------------------------------------------------
DROP INDEX IF EXISTS idx_project_users_role;
ALTER TABLE project_users DROP CONSTRAINT IF EXISTS project_users_role_check;
ALTER TABLE project_users DROP COLUMN IF EXISTS role;

-- 5. Platform admin ------------------------------------------------------
ALTER TABLE users DROP COLUMN IF EXISTS is_platform_admin;

-- 6. Membership and companies -------------------------------------------
DROP INDEX IF EXISTS idx_user_companies_one_default;
DROP TABLE IF EXISTS user_companies;
DROP TABLE IF EXISTS companies;

COMMIT;

-- ============================================================================
-- Verification (all should return 0)
-- ============================================================================
-- SELECT count(*) FROM information_schema.columns WHERE table_name='users'    AND column_name='is_platform_admin';
-- SELECT count(*) FROM information_schema.columns WHERE table_name='settings' AND column_name='company_id';
-- SELECT count(*) FROM information_schema.tables  WHERE table_name IN ('companies','user_companies');
