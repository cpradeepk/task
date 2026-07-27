-- ============================================================================
-- Rollback for Migration 063: work-item company scoping
-- ============================================================================
-- 063 was purely additive — it added a column, a foreign key and an index to
-- tasks, bugs and requirements, and populated the column from data that already
-- existed. Dropping them loses nothing that cannot be recomputed by re-running
-- 063.
--
-- Runs in a transaction so a failure leaves the schema untouched.
-- ============================================================================

BEGIN;

DROP TRIGGER IF EXISTS trg_tasks_set_company ON tasks;
DROP TRIGGER IF EXISTS trg_bugs_set_company ON bugs;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'requirements') THEN
        DROP TRIGGER IF EXISTS trg_requirements_set_company ON requirements;
    END IF;
END $$;
DROP FUNCTION IF EXISTS set_work_item_company();

DROP INDEX IF EXISTS idx_tasks_company_id;
DROP INDEX IF EXISTS idx_bugs_company_id;
DROP INDEX IF EXISTS idx_requirements_company_id;

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS fk_tasks_company;
ALTER TABLE bugs  DROP CONSTRAINT IF EXISTS fk_bugs_company;

ALTER TABLE tasks DROP COLUMN IF EXISTS company_id;
ALTER TABLE bugs  DROP COLUMN IF EXISTS company_id;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'requirements') THEN
        ALTER TABLE requirements DROP CONSTRAINT IF EXISTS fk_requirements_company;
        ALTER TABLE requirements DROP COLUMN IF EXISTS company_id;
    END IF;
END $$;

COMMIT;
