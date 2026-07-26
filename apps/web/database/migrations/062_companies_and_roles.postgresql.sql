-- ============================================================================
-- Migration 062: Companies, per-project roles, platform admin
-- Date: 2026-07-26
-- Database: PostgreSQL/Supabase
--
-- The tool is moving from one internal company to many. Today there is no
-- notion of a company anywhere: users, projects, settings and every work item
-- are global, and authority comes from a single `users.role` column, so a
-- person cannot be a manager on one project and a member on another.
--
-- This introduces three tiers of authority:
--
--   platform   users.is_platform_admin      manage companies; cross-company support
--   company    user_companies.company_role  add users, edit projects / feed
--                                           topics / settings — FOR THAT COMPANY
--   project    project_users.role           manager | team_leader | member
--
-- A user may belong to SEVERAL companies (user_companies is a join table), with
-- one marked default. Projects — and therefore the sub-projects, tasks, bugs and
-- requirements that hang off them — belong to exactly one company.
--
-- This migration is ADDITIVE and backfills existing data into a single default
-- company, so behaviour is unchanged until the application starts reading the
-- new columns. Rollback: 062_companies_and_roles_rollback.postgresql.sql
--
-- SAFE TO RE-RUN. Every step is idempotent (IF NOT EXISTS / ON CONFLICT /
-- exception-guarded), and the whole thing runs in ONE TRANSACTION — so a
-- failure part-way leaves the database exactly as it was rather than
-- half-migrated.
--
-- Configure the default company before running:
-- ============================================================================

BEGIN;

DO $$ BEGIN PERFORM set_config('app.default_company_name', 'Amtariksha Tech', false); END $$;
DO $$ BEGIN PERFORM set_config('app.default_company_code', 'AM',              false); END $$;

-- ---------------------------------------------------------------------------
-- 1. companies
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    company_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    -- Employee-ID prefix for this company, e.g. 'AM' -> AM-0001. Replaces the
    -- hardcoded 'AM' in the application.
    code VARCHAR(20) NOT NULL UNIQUE,
    logo_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_companies_company_id ON companies(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);

-- ---------------------------------------------------------------------------
-- 2. user_companies — membership + company-level role
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_companies (
    employee_id VARCHAR(50) NOT NULL,
    company_id VARCHAR(50) NOT NULL,
    company_role VARCHAR(20) NOT NULL DEFAULT 'member'
        CHECK (company_role IN ('company_admin', 'member')),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (employee_id, company_id)
);

DO $$ BEGIN
    ALTER TABLE user_companies ADD CONSTRAINT fk_user_companies_user
        FOREIGN KEY (employee_id) REFERENCES users(employee_id) ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE user_companies ADD CONSTRAINT fk_user_companies_company
        FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_user_companies_company ON user_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_employee ON user_companies(employee_id);

-- At most one default company per user (partial unique index).
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_companies_one_default
    ON user_companies(employee_id) WHERE is_default;

-- ---------------------------------------------------------------------------
-- 3. Platform administrator
-- ---------------------------------------------------------------------------
-- Replaces the scattered `employeeId === 'AM-0001'` superuser checks.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- ---------------------------------------------------------------------------
-- 4. Scope projects to a company
-- ---------------------------------------------------------------------------
ALTER TABLE projects ADD COLUMN IF NOT EXISTS company_id VARCHAR(50);

-- ---------------------------------------------------------------------------
-- 5. Per-project role
-- ---------------------------------------------------------------------------
ALTER TABLE project_users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'member';

DO $$ BEGIN
    ALTER TABLE project_users ADD CONSTRAINT project_users_role_check
        CHECK (role IN ('manager', 'team_leader', 'member'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_project_users_role ON project_users(role);

-- ---------------------------------------------------------------------------
-- 6. Per-company settings
-- ---------------------------------------------------------------------------
-- `key` was globally UNIQUE, so two companies could not have different
-- departments / roles / bug types. A NULL company_id row is the platform-wide
-- default; a row with a company_id overrides it for that company.
ALTER TABLE settings ADD COLUMN IF NOT EXISTS company_id VARCHAR(50);

DO $$ BEGIN
    ALTER TABLE settings ADD CONSTRAINT fk_settings_company
        FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Drop the old global uniqueness on key, however it happens to be named.
DO $$
DECLARE constraint_name TEXT;
BEGIN
    SELECT conname INTO constraint_name
      FROM pg_constraint
     WHERE conrelid = 'settings'::regclass
       AND contype = 'u'
       AND pg_get_constraintdef(oid) = 'UNIQUE (key)';
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE settings DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

-- NULLs compare as distinct in a composite UNIQUE, so two partial indexes are
-- needed rather than one UNIQUE(company_id, key).
CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_platform_key
    ON settings(key) WHERE company_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_company_key
    ON settings(company_id, key) WHERE company_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 7. Scope the feed to a company
-- ---------------------------------------------------------------------------
-- Feed topics carry no project_id, so they cannot inherit a company through a
-- project and need the column directly.
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feed_topics') THEN
        ALTER TABLE feed_topics ADD COLUMN IF NOT EXISTS company_id VARCHAR(50);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feed_posts') THEN
        ALTER TABLE feed_posts ADD COLUMN IF NOT EXISTS company_id VARCHAR(50);
    END IF;
END $$;

-- ============================================================================
-- 8. BACKFILL — everything that exists today becomes one company
-- ============================================================================

INSERT INTO companies (company_id, name, code, created_by)
VALUES (
    'COMP-001',
    current_setting('app.default_company_name', true),
    current_setting('app.default_company_code', true),
    'system'
)
ON CONFLICT (company_id) DO NOTHING;

-- Every existing user joins it, defaulting to it.
INSERT INTO user_companies (employee_id, company_id, company_role, is_default)
SELECT
    u.employee_id,
    'COMP-001',
    -- Today's admins and top management become company admins: they can manage
    -- users, projects, feed topics and settings for this company only.
    CASE WHEN u.role IN ('admin', 'top_management') THEN 'company_admin' ELSE 'member' END,
    TRUE
FROM users u
ON CONFLICT (employee_id, company_id) DO NOTHING;

-- Existing system admins also become platform admins, so nobody is locked out
-- of company management the moment the app starts enforcing this.
--
-- is_system_admin is INTEGER in the live database but BOOLEAN in
-- postgres_schema.sql, so a direct `= TRUE` fails with 42883 on one of them.
-- Comparing the text form works for both ('1' vs 'true') without needing to
-- know which this deployment has.
UPDATE users SET is_platform_admin = TRUE
 WHERE COALESCE(is_system_admin::text, '') IN ('1', 'true', 't')
    OR employee_id = 'AM-0001';

UPDATE projects SET company_id = 'COMP-001' WHERE company_id IS NULL;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name = 'feed_topics' AND column_name = 'company_id') THEN
        EXECUTE 'UPDATE feed_topics SET company_id = ''COMP-001'' WHERE company_id IS NULL';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name = 'feed_posts' AND column_name = 'company_id') THEN
        EXECUTE 'UPDATE feed_posts SET company_id = ''COMP-001'' WHERE company_id IS NULL';
    END IF;
END $$;

-- Existing settings stay company_id IS NULL — platform-wide defaults. Company
-- overrides are created from the UI as needed, so current behaviour is
-- preserved exactly.

-- Seed per-project roles from the manager relationships already in `users`:
-- if someone on a project is recorded as another project member's manager,
-- they are that project's manager.
UPDATE project_users pu
   SET role = 'manager'
 WHERE role = 'member'
   AND EXISTS (
       SELECT 1
         FROM project_users peer
         JOIN users u ON u.employee_id = peer.employee_id
        WHERE peer.project_id = pu.project_id
          AND u.manager_id = pu.employee_id
   );

-- Now that every row is populated, enforce it.
ALTER TABLE projects ALTER COLUMN company_id SET NOT NULL;

DO $$ BEGIN
    ALTER TABLE projects ADD CONSTRAINT fk_projects_company
        FOREIGN KEY (company_id) REFERENCES companies(company_id) ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================
-- SELECT * FROM companies;
-- SELECT company_role, count(*) FROM user_companies GROUP BY company_role;
-- SELECT role, count(*) FROM project_users GROUP BY role;
-- SELECT count(*) FROM projects WHERE company_id IS NULL;              -- expect 0
-- SELECT employee_id FROM users WHERE is_platform_admin;
