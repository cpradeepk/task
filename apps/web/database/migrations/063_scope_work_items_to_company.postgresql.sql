-- ============================================================================
-- Migration 063: Scope work items directly to a company
-- Date: 2026-07-27
-- Database: PostgreSQL/Supabase
--
-- After 062, tasks, bugs and requirements inherit tenant isolation INDIRECTLY,
-- through the project they belong to. That is correct but fragile:
--
--   * tasks.project_id and bugs.project_id are NULLABLE, so an item with no
--     project has no company at all and cannot be scoped by a join;
--   * every read path has to remember to join projects, and one that forgets
--     silently returns another tenant's rows;
--   * the join cannot be enforced by the database.
--
-- A direct company_id makes scoping a WHERE clause the DB layer applies once,
-- and lets a future RLS policy express the rule declaratively.
--
-- SAFE TO RE-RUN. Idempotent throughout and wrapped in ONE TRANSACTION, so a
-- failure leaves the database untouched rather than half-migrated.
--
-- Requires migration 062. Rollback: 063_scope_work_items_to_company_rollback.postgresql.sql
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------
ALTER TABLE tasks        ADD COLUMN IF NOT EXISTS company_id VARCHAR(50);
ALTER TABLE bugs         ADD COLUMN IF NOT EXISTS company_id VARCHAR(50);

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'requirements') THEN
        ALTER TABLE requirements ADD COLUMN IF NOT EXISTS company_id VARCHAR(50);
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Backfill from the owning project
-- ---------------------------------------------------------------------------
-- A sub-project row carries the same company_id as its parent (062 enforced
-- that on create), so a single join covers both levels.
UPDATE tasks t
   SET company_id = p.company_id
  FROM projects p
 WHERE p.project_id = t.project_id
   AND t.company_id IS NULL;

UPDATE bugs b
   SET company_id = p.company_id
  FROM projects p
 WHERE p.project_id = b.project_id
   AND b.company_id IS NULL;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name = 'requirements' AND column_name = 'company_id') THEN
        EXECUTE $sql$
            UPDATE requirements r
               SET company_id = p.company_id
              FROM projects p
             WHERE p.project_id = r.project_id
               AND r.company_id IS NULL
        $sql$;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Backfill project-less items from their creator's default company
-- ---------------------------------------------------------------------------
-- tasks.project_id and bugs.project_id are nullable, so items created before
-- projects were mandatory have nothing to join to.
UPDATE tasks t
   SET company_id = uc.company_id
  FROM user_companies uc
 WHERE uc.employee_id = t.assigned_by
   AND uc.is_default
   AND t.company_id IS NULL;

UPDATE bugs b
   SET company_id = uc.company_id
  FROM user_companies uc
 WHERE uc.employee_id = b.assigned_by
   AND uc.is_default
   AND b.company_id IS NULL;

-- ---------------------------------------------------------------------------
-- 4. Last resort: a single-company deployment
-- ---------------------------------------------------------------------------
-- If exactly one company exists, anything still unscoped can only belong to it.
-- With two or more we deliberately leave the rows NULL rather than guess — the
-- application treats NULL as "not visible to a scoped query", which fails
-- closed. Report them with the verification query at the end.
DO $$
DECLARE only_company VARCHAR(50);
BEGIN
    SELECT company_id INTO only_company FROM companies LIMIT 2;
    IF (SELECT count(*) FROM companies) = 1 THEN
        EXECUTE format('UPDATE tasks SET company_id = %L WHERE company_id IS NULL', only_company);
        EXECUTE format('UPDATE bugs  SET company_id = %L WHERE company_id IS NULL', only_company);
        IF EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'requirements' AND column_name = 'company_id') THEN
            EXECUTE format('UPDATE requirements SET company_id = %L WHERE company_id IS NULL', only_company);
        END IF;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Constraints and indexes
-- ---------------------------------------------------------------------------
-- NOT NULL is deliberately NOT applied: a multi-company deployment may still
-- have unresolvable legacy rows, and failing the migration over historical data
-- would be worse than leaving them out of scoped results.
DO $$ BEGIN
    ALTER TABLE tasks ADD CONSTRAINT fk_tasks_company
        FOREIGN KEY (company_id) REFERENCES companies(company_id) ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE bugs ADD CONSTRAINT fk_bugs_company
        FOREIGN KEY (company_id) REFERENCES companies(company_id) ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name = 'requirements' AND column_name = 'company_id') THEN
        BEGIN
            ALTER TABLE requirements ADD CONSTRAINT fk_requirements_company
                FOREIGN KEY (company_id) REFERENCES companies(company_id) ON UPDATE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_bugs_company_id  ON bugs(company_id);

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name = 'requirements' AND column_name = 'company_id') THEN
        CREATE INDEX IF NOT EXISTS idx_requirements_company_id ON requirements(company_id);
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. Keep company_id correct on INSERT
-- ---------------------------------------------------------------------------
-- Work items are created from several places — REST routes, GraphQL resolvers
-- and one-off scripts — so setting company_id in application code would mean
-- remembering it in each, and any path that forgot would silently write an
-- unscoped row. A trigger derives it from the owning project instead, falling
-- back to the creator's default company for items with no project. An explicit
-- company_id supplied by the caller is always respected.
CREATE OR REPLACE FUNCTION set_work_item_company()
RETURNS TRIGGER AS $$
DECLARE
    creator TEXT;
BEGIN
    IF NEW.company_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.project_id IS NOT NULL THEN
        SELECT p.company_id INTO NEW.company_id
          FROM projects p
         WHERE p.project_id = NEW.project_id;
    END IF;

    -- TG_ARGV[0] names the creator column, which differs per table
    -- (tasks/bugs: assigned_by, requirements: created_by). Reading it via
    -- to_jsonb keeps one function usable for all three.
    IF NEW.company_id IS NULL AND TG_NARGS > 0 THEN
        creator := to_jsonb(NEW) ->> TG_ARGV[0];
        IF creator IS NOT NULL THEN
            SELECT uc.company_id INTO NEW.company_id
              FROM user_companies uc
             WHERE uc.employee_id = creator AND uc.is_default
             LIMIT 1;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tasks_set_company ON tasks;
CREATE TRIGGER trg_tasks_set_company
    BEFORE INSERT ON tasks
    FOR EACH ROW EXECUTE FUNCTION set_work_item_company('assigned_by');

DROP TRIGGER IF EXISTS trg_bugs_set_company ON bugs;
CREATE TRIGGER trg_bugs_set_company
    BEFORE INSERT ON bugs
    FOR EACH ROW EXECUTE FUNCTION set_work_item_company('assigned_by');

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name = 'requirements' AND column_name = 'company_id') THEN
        DROP TRIGGER IF EXISTS trg_requirements_set_company ON requirements;
        CREATE TRIGGER trg_requirements_set_company
            BEFORE INSERT ON requirements
            FOR EACH ROW EXECUTE FUNCTION set_work_item_company('created_by');
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- Verification — any rows left unscoped need a manual decision
-- ============================================================================
-- SELECT 'tasks' AS t, count(*) FROM tasks WHERE company_id IS NULL
-- UNION ALL SELECT 'bugs', count(*) FROM bugs WHERE company_id IS NULL
-- UNION ALL SELECT 'requirements', count(*) FROM requirements WHERE company_id IS NULL;
