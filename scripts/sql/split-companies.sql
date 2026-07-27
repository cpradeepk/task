-- ============================================================================
-- OPERATIONAL RUNBOOK — Split one company into three
-- ============================================================================
-- Paste into the Supabase SQL editor and run ONE STEP AT A TIME, top to bottom.
-- Read the output of each step before running the next.
--
-- This is NOT a migration. It is a one-off data change that reflects a decision
-- only you can make: migration 062 put every existing row into a single company
-- (COMP-001, "Amtariksha Tech"), because that is the only assumption a
-- migration can safely make. This splits the deployment into the three
-- businesses actually running on it:
--
--     AM   Amtariksha Tech    (already exists as COMP-001)
--     SW   Swarg Food
--     TS   Tattva Silicon
--
-- The `code` becomes that company's employee-ID prefix — AM-0001, SW-0001,
-- TS-0001 — so each numbers its people independently.
--
-- Steps 1, 3 and 6 are READ-ONLY. Steps 2, 4 and 5 write, and each runs in its
-- own transaction. Take a Supabase snapshot before step 4.
--
-- Prerequisites: migrations 061, 062 and 063 applied.
-- ============================================================================


-- ============================================================================
-- STEP 1 — INSPECT (read-only). What exists right now?
-- ============================================================================

SELECT company_id, code, name, status FROM companies ORDER BY company_id;

-- Where every project sits, and how much work hangs off it.
SELECT
    COALESCE(p.parent_project_id, '—')                       AS parent,
    p.project_id,
    p.project_name,
    p.company_id,
    (SELECT count(*) FROM tasks t WHERE t.project_id = p.project_id) AS tasks,
    (SELECT count(*) FROM bugs  b WHERE b.project_id = p.project_id) AS bugs
FROM projects p
WHERE p.deleted_at IS NULL
ORDER BY p.parent_project_id NULLS FIRST, p.project_id;

-- Who belongs to what today.
SELECT uc.company_id, uc.company_role, count(*) AS users
FROM user_companies uc
GROUP BY uc.company_id, uc.company_role
ORDER BY uc.company_id;


-- ============================================================================
-- STEP 2 — CREATE the missing companies (idempotent, safe to re-run)
-- ============================================================================
-- Skips any company whose code already exists, and allocates the next free
-- COMP-### rather than hardcoding one.

DO $$
DECLARE
    next_num INT;
    c        RECORD;
BEGIN
    FOR c IN
        SELECT * FROM (VALUES
            ('Amtariksha Tech', 'AM'),
            ('Swarg Food',      'SW'),
            ('Tattva Silicon',  'TS')
        ) AS t(name, code)
    LOOP
        IF NOT EXISTS (SELECT 1 FROM companies WHERE upper(code) = upper(c.code)) THEN
            SELECT COALESCE(MAX(CAST(SUBSTRING(company_id FROM '^COMP-([0-9]+)$') AS INTEGER)), 0) + 1
              INTO next_num
              FROM companies
             WHERE company_id ~ '^COMP-[0-9]+$';

            INSERT INTO companies (company_id, name, code, created_by)
            VALUES ('COMP-' || lpad(next_num::text, 3, '0'), c.name, upper(c.code), 'system');

            RAISE NOTICE 'created % (%) as COMP-%', c.name, upper(c.code), lpad(next_num::text, 3, '0');
        ELSE
            RAISE NOTICE 'skipped % (%) — code already exists', c.name, upper(c.code);
        END IF;
    END LOOP;
END $$;

-- Confirm:
SELECT company_id, code, name FROM companies ORDER BY company_id;


-- ============================================================================
-- STEP 2b — FIND the real project identifier (read-only). Run this first.
-- ============================================================================
-- Steps 3-5 below assume the project is literally 'swarg'. It may not be:
-- tasks.project_id has no foreign key to projects, so the value stored on a
-- task can be a label that does not exist as a project row at all. If step 4
-- reported `Project "swarg" not found`, run this to see what is actually there.

-- Every project, with anything that looks like a match:
SELECT project_id, project_name, parent_project_id, company_id,
       CASE WHEN lower(project_id) LIKE '%swarg%'
              OR lower(project_name) LIKE '%swarg%' THEN '  <-- looks like Swarg' END AS hint
FROM projects
WHERE deleted_at IS NULL
ORDER BY parent_project_id NULLS FIRST, project_id;

-- What work items actually reference, and whether that value is a real project.
-- A "NO — orphan" row means the label was never a project, so migration 063
-- could not scope it by project and fell back to the creator's company.
SELECT ref AS project_ref,
       CASE WHEN EXISTS (SELECT 1 FROM projects p WHERE p.project_id = ref)
            THEN 'yes' ELSE 'NO — orphan' END AS is_a_real_project,
       count(*) AS work_items
FROM (
    SELECT project_id AS ref FROM tasks WHERE project_id IS NOT NULL
    UNION ALL
    SELECT project_id FROM bugs WHERE project_id IS NOT NULL
) refs
GROUP BY ref
ORDER BY work_items DESC;

-- ▶ Take the real project_id from the first query and use it below. If Swarg's
--   work lives only under an orphan label, use STEP 4b instead of STEP 4.


-- ============================================================================
-- STEP 3 — PREVIEW the Swarg move (read-only). Run before step 4.
-- ============================================================================
-- Replace 'swarg' in BOTH queries below with the real project_id from step 2b.
-- Shows exactly what step 4 will change. If a count here looks wrong, STOP.

WITH tree AS (
    SELECT project_id FROM projects WHERE project_id = 'swarg'
    UNION
    SELECT project_id FROM projects WHERE parent_project_id = 'swarg'
)
SELECT 'projects moving'        AS item, count(*)::text AS n FROM projects      WHERE project_id IN (SELECT project_id FROM tree)
UNION ALL
SELECT 'tasks moving',          count(*)::text FROM tasks        WHERE project_id IN (SELECT project_id FROM tree)
UNION ALL
SELECT 'bugs moving',           count(*)::text FROM bugs         WHERE project_id IN (SELECT project_id FROM tree)
UNION ALL
SELECT 'requirements moving',   count(*)::text FROM requirements WHERE project_id IN (SELECT project_id FROM tree)
UNION ALL
SELECT 'members on those projects', count(DISTINCT employee_id)::text FROM project_users WHERE project_id IN (SELECT project_id FROM tree)
UNION ALL
SELECT 'target company', COALESCE((SELECT company_id FROM companies WHERE code = 'SW'), '!! MISSING — run step 2');

-- The people affected, by name:
WITH tree AS (
    SELECT project_id FROM projects WHERE project_id = 'swarg'
    UNION
    SELECT project_id FROM projects WHERE parent_project_id = 'swarg'
)
SELECT DISTINCT u.employee_id, u.name, u.email
FROM project_users pu
JOIN users u ON u.employee_id = pu.employee_id
WHERE pu.project_id IN (SELECT project_id FROM tree)
ORDER BY u.employee_id;


-- ============================================================================
-- STEP 4 — MOVE the Swarg project tree and its work items
-- ============================================================================
-- ⚠️  WRITES. Take a Supabase snapshot first.
--     Runs in one transaction: any failure rolls the whole thing back.
--     Does NOT touch user memberships — that is step 5, kept separate on
--     purpose so you can move the data first and decide about people after.

BEGIN;

DO $$
DECLARE
    target      VARCHAR(50);
    moved_proj  INT;
    moved_tasks INT;
    moved_bugs  INT;
    moved_reqs  INT;
BEGIN
    SELECT company_id INTO target FROM companies WHERE code = 'SW';
    IF target IS NULL THEN
        RAISE EXCEPTION 'No company with code SW — run step 2 first';
    END IF;

    -- A sub-project must stay with its parent, so the whole tree moves together.
    CREATE TEMP TABLE _tree ON COMMIT DROP AS
        SELECT project_id FROM projects WHERE project_id = 'swarg'
        UNION
        SELECT project_id FROM projects WHERE parent_project_id = 'swarg';

    IF NOT EXISTS (SELECT 1 FROM _tree) THEN
        RAISE EXCEPTION
            'Project "swarg" not found. Run STEP 2b to find the real project_id. Existing projects: %',
            (SELECT string_agg(project_id, ', ' ORDER BY project_id) FROM projects WHERE deleted_at IS NULL);
    END IF;

    UPDATE projects SET company_id = target WHERE project_id IN (SELECT project_id FROM _tree);
    GET DIAGNOSTICS moved_proj = ROW_COUNT;

    UPDATE tasks SET company_id = target WHERE project_id IN (SELECT project_id FROM _tree);
    GET DIAGNOSTICS moved_tasks = ROW_COUNT;

    UPDATE bugs SET company_id = target WHERE project_id IN (SELECT project_id FROM _tree);
    GET DIAGNOSTICS moved_bugs = ROW_COUNT;

    UPDATE requirements SET company_id = target WHERE project_id IN (SELECT project_id FROM _tree);
    GET DIAGNOSTICS moved_reqs = ROW_COUNT;

    RAISE NOTICE 'moved to %: % projects, % tasks, % bugs, % requirements',
        target, moved_proj, moved_tasks, moved_bugs, moved_reqs;
END $$;

COMMIT;


-- ============================================================================
-- STEP 4b — MOVE BY LABEL, when the work has no real project row
-- ============================================================================
-- Use INSTEAD OF step 4 if step 2b showed Swarg's work sitting under an "orphan"
-- label — a value in tasks.project_id / bugs.project_id that is not a project.
-- There is no foreign key on those columns, so this is possible and the data is
-- still perfectly real; it just cannot be reached by joining projects.
--
-- Set the label once here. It matches BOTH a genuine project_id and an orphan
-- label, so it is safe to use even if some of the work is properly linked.
--
-- ⚠️  WRITES. Snapshot first. Preview with the SELECT before running the DO block.

-- Preview (read-only) — change 'swarg' to your label:
SELECT 'tasks'  AS table, count(*) FROM tasks  WHERE project_id = 'swarg'
UNION ALL SELECT 'bugs',  count(*) FROM bugs   WHERE project_id = 'swarg'
UNION ALL SELECT 'projects (if any)', count(*) FROM projects
    WHERE project_id = 'swarg' OR parent_project_id = 'swarg';

BEGIN;

DO $$
DECLARE
    label  TEXT := 'swarg';        -- <<< set this to your label from step 2b
    target VARCHAR(50);
    n_t INT; n_b INT; n_p INT;
BEGIN
    SELECT company_id INTO target FROM companies WHERE code = 'SW';
    IF target IS NULL THEN
        RAISE EXCEPTION 'No company with code SW — run step 2 first';
    END IF;

    -- Projects, if the label happens to be a real one (plus its children).
    UPDATE projects SET company_id = target
     WHERE project_id = label OR parent_project_id = label;
    GET DIAGNOSTICS n_p = ROW_COUNT;

    -- Work items referencing the label directly, plus anything under a
    -- sub-project of it.
    UPDATE tasks SET company_id = target
     WHERE project_id = label
        OR project_id IN (SELECT project_id FROM projects WHERE parent_project_id = label);
    GET DIAGNOSTICS n_t = ROW_COUNT;

    UPDATE bugs SET company_id = target
     WHERE project_id = label
        OR project_id IN (SELECT project_id FROM projects WHERE parent_project_id = label);
    GET DIAGNOSTICS n_b = ROW_COUNT;

    UPDATE requirements SET company_id = target
     WHERE project_id = label
        OR project_id IN (SELECT project_id FROM projects WHERE parent_project_id = label);

    IF n_t = 0 AND n_b = 0 AND n_p = 0 THEN
        RAISE EXCEPTION 'Nothing matched label "%". Check STEP 2b output.', label;
    END IF;

    RAISE NOTICE 'moved to % by label "%": % projects, % tasks, % bugs', target, label, n_p, n_t, n_b;
END $$;

COMMIT;


-- ============================================================================
-- STEP 4c — MOVE A SET OF PROJECTS TO A COMPANY  ◀ USE THIS ONE
-- ============================================================================
-- Supersedes steps 3, 4 and 4b for a real deployment, where each company owns
-- SEVERAL projects rather than one. Everything is named in two places at the
-- top; nothing else needs editing.
--
-- Sub-projects follow their parent automatically — list only the top-level
-- project ids. Work items follow their project. Orphan labels (values in
-- tasks.project_id that are not real projects) can be listed alongside the
-- project ids and are matched too.
--
-- Run the PREVIEW first. It writes nothing.

-- ---- PREVIEW (read-only) ---------------------------------------------------
-- Edit the two arrays, then run. Repeat per company before committing to it.
WITH RECURSIVE input AS (
    SELECT 'SW'::text                                   AS company_code,
           ARRAY['PRJ-XXX','PRJ-YYY']::text[]           AS project_ids,
           ARRAY['swarg']::text[]                       AS orphan_labels
),
-- Recursive, NOT a single parent_project_id lookup: this data nests three deep
-- in at least one place (PRJ-051 > PRJ-049 > PRJ-050), and a one-level match
-- would strand the grandchild in the old company.
tree AS (
    SELECT p.project_id FROM projects p, input i WHERE p.project_id = ANY(i.project_ids)
    UNION
    SELECT c.project_id FROM projects c JOIN tree t ON c.parent_project_id = t.project_id
),
refs AS (
    SELECT project_id FROM tree
    UNION
    SELECT unnest(orphan_labels) FROM input
)
SELECT 'target company'  AS item,
       COALESCE((SELECT c.company_id || ' — ' || c.name FROM companies c, input i WHERE c.code = i.company_code),
                '!! no company with that code') AS detail
UNION ALL
SELECT 'projects (incl. sub-projects)', string_agg(project_id, ', ' ORDER BY project_id) FROM tree
UNION ALL
SELECT 'tasks moving',        count(*)::text FROM tasks        WHERE project_id IN (SELECT project_id FROM refs)
UNION ALL
SELECT 'bugs moving',         count(*)::text FROM bugs         WHERE project_id IN (SELECT project_id FROM refs)
UNION ALL
SELECT 'requirements moving', count(*)::text FROM requirements WHERE project_id IN (SELECT project_id FROM refs)
UNION ALL
SELECT 'people on those projects', count(DISTINCT employee_id)::text FROM project_users WHERE project_id IN (SELECT project_id FROM tree);

-- ---- APPLY -----------------------------------------------------------------
-- ⚠️  WRITES. Snapshot first. Keep the two arrays identical to the preview.
BEGIN;

DO $$
DECLARE
    company_code   TEXT   := 'SW';                          -- <<< company code
    project_ids    TEXT[] := ARRAY['PRJ-XXX','PRJ-YYY'];    -- <<< top-level projects
    orphan_labels  TEXT[] := ARRAY['swarg'];                -- <<< bare labels, or ARRAY[]::text[]
    target VARCHAR(50);
    n_p INT; n_t INT; n_b INT; n_r INT;
BEGIN
    SELECT company_id INTO target FROM companies WHERE code = upper(company_code);
    IF target IS NULL THEN
        RAISE EXCEPTION 'No company with code % — run step 2 first', company_code;
    END IF;

    -- The whole descendant tree, at any depth. A single parent_project_id match
    -- is not enough: this data nests three levels in at least one place
    -- (PRJ-051 > PRJ-049 > PRJ-050), and the grandchild would be left behind in
    -- the old company — with its work items pointing at a project belonging to
    -- someone else.
    CREATE TEMP TABLE _tree ON COMMIT DROP AS
        WITH RECURSIVE t AS (
            SELECT project_id FROM projects WHERE project_id = ANY(project_ids)
            UNION
            SELECT c.project_id FROM projects c JOIN t ON c.parent_project_id = t.project_id
        )
        SELECT project_id FROM t;

    -- Everything a work item might reference: real projects and bare labels.
    CREATE TEMP TABLE _refs ON COMMIT DROP AS
        SELECT project_id FROM _tree
        UNION
        SELECT unnest(orphan_labels);

    IF NOT EXISTS (SELECT 1 FROM _refs) THEN
        RAISE EXCEPTION 'Nothing matched. Existing projects: %',
            (SELECT string_agg(project_id, ', ' ORDER BY project_id) FROM projects WHERE deleted_at IS NULL);
    END IF;

    UPDATE projects SET company_id = target WHERE project_id IN (SELECT project_id FROM _tree);
    GET DIAGNOSTICS n_p = ROW_COUNT;
    UPDATE tasks SET company_id = target WHERE project_id IN (SELECT project_id FROM _refs);
    GET DIAGNOSTICS n_t = ROW_COUNT;
    UPDATE bugs SET company_id = target WHERE project_id IN (SELECT project_id FROM _refs);
    GET DIAGNOSTICS n_b = ROW_COUNT;
    UPDATE requirements SET company_id = target WHERE project_id IN (SELECT project_id FROM _refs);
    GET DIAGNOSTICS n_r = ROW_COUNT;

    RAISE NOTICE 'moved to %: % projects, % tasks, % bugs, % requirements',
        target, n_p, n_t, n_b, n_r;
END $$;

COMMIT;

-- Repeat the whole block per company, changing the three variables each time.
-- Whatever is left untouched stays in Amtariksha (COMP-001), so the largest
-- company needs no move at all.


-- ============================================================================
-- STEP 5 — MOVE THE PEOPLE (optional, and reversible)
-- ============================================================================
-- Only run this if the people working on Swarg projects should LAND in Swarg
-- when they sign in. They keep their Amtariksha membership, so anyone working
-- across both companies still sees both and can switch between them.
--
-- Skip this entirely if the same staff run all three businesses — in that case
-- everyone stays defaulted to Amtariksha and switches company when needed.

BEGIN;

DO $$
DECLARE
    target VARCHAR(50);
BEGIN
    SELECT company_id INTO target FROM companies WHERE code = 'SW';
    IF target IS NULL THEN
        RAISE EXCEPTION 'No company with code SW — run step 2 first';
    END IF;

    CREATE TEMP TABLE _members ON COMMIT DROP AS
        SELECT DISTINCT pu.employee_id
          FROM project_users pu
         WHERE pu.project_id IN (
                   SELECT project_id FROM projects WHERE project_id = 'swarg'
                   UNION
                   SELECT project_id FROM projects WHERE parent_project_id = 'swarg'
               );

    -- Only one default company per user is allowed (partial unique index),
    -- so clear the existing default before setting the new one.
    UPDATE user_companies SET is_default = FALSE
     WHERE employee_id IN (SELECT employee_id FROM _members);

    INSERT INTO user_companies (employee_id, company_id, company_role, is_default)
    SELECT employee_id, target, 'member', TRUE FROM _members
    ON CONFLICT (employee_id, company_id)
    DO UPDATE SET is_default = TRUE, updated_at = NOW();

    RAISE NOTICE 'defaulted % user(s) into %', (SELECT count(*) FROM _members), target;
END $$;

COMMIT;


-- ============================================================================
-- STEP 6 — VERIFY (read-only)
-- ============================================================================

SELECT c.company_id, c.code, c.name,
       (SELECT count(*) FROM projects p WHERE p.company_id = c.company_id AND p.deleted_at IS NULL) AS projects,
       (SELECT count(*) FROM tasks    t WHERE t.company_id = c.company_id) AS tasks,
       (SELECT count(*) FROM bugs     b WHERE b.company_id = c.company_id) AS bugs,
       (SELECT count(*) FROM user_companies uc WHERE uc.company_id = c.company_id) AS members
FROM companies c
ORDER BY c.company_id;

-- Nothing should be unscoped. All three counts must be 0.
SELECT 'tasks'        AS t, count(*) FROM tasks        WHERE company_id IS NULL
UNION ALL SELECT 'bugs',         count(*) FROM bugs         WHERE company_id IS NULL
UNION ALL SELECT 'requirements', count(*) FROM requirements WHERE company_id IS NULL;

-- A work item must never sit in a different company from its project.
SELECT t.task_id, t.company_id AS task_company, p.company_id AS project_company
FROM tasks t JOIN projects p ON p.project_id = t.project_id
WHERE t.company_id IS DISTINCT FROM p.company_id
UNION ALL
SELECT b.bug_id, b.company_id, p.company_id
FROM bugs b JOIN projects p ON p.project_id = b.project_id
WHERE b.company_id IS DISTINCT FROM p.company_id;
-- ^ Expect zero rows.


-- ============================================================================
-- STILL TO DECIDE — not scripted, because only you know the answer
-- ============================================================================
-- 'PRJ-001' and 'amtariksha' are currently in COMP-001 (Amtariksha Tech). If
-- either belongs elsewhere, move it with the step 3/4 pattern, substituting the
-- project id and the target code:
--
--     ... WHERE project_id = 'PRJ-001' ... companies WHERE code = 'TS'
--
-- Tattva Silicon starts with no projects. New projects created while acting in
-- that company are scoped to it automatically — the BEFORE INSERT trigger from
-- migration 063 derives company_id from the project, so nothing manual is
-- needed for new work.


-- ============================================================================
-- ROLLBACK — undo steps 4 and 5 (moves everything back to COMP-001)
-- ============================================================================
-- Only if something looks wrong. Uncomment the block and run it.
--
-- Restores the default company ONLY for the users step 5 actually moved. An
-- earlier version of this block set is_default = TRUE for every COMP-001 member
-- unconditionally, which violates the one-default-per-user index for anyone
-- defaulted to a third company — it failed with "duplicate key value violates
-- unique constraint idx_user_companies_one_default" precisely when you would
-- have needed it.
--
-- BEGIN;
--
-- DO $$
-- DECLARE
--     sw     VARCHAR(50);
--     am     VARCHAR(50);
-- BEGIN
--     SELECT company_id INTO sw FROM companies WHERE code = 'SW';
--     SELECT company_id INTO am FROM companies WHERE code = 'AM';
--     IF sw IS NULL OR am IS NULL THEN
--         RAISE EXCEPTION 'Expected companies with codes SW and AM';
--     END IF;
--
--     -- Remember who is currently defaulted into Swarg; only they get restored.
--     CREATE TEMP TABLE _restore ON COMMIT DROP AS
--         SELECT employee_id FROM user_companies WHERE company_id = sw AND is_default;
--
--     UPDATE projects     SET company_id = am WHERE company_id = sw;
--     UPDATE tasks        SET company_id = am WHERE company_id = sw;
--     UPDATE bugs         SET company_id = am WHERE company_id = sw;
--     UPDATE requirements SET company_id = am WHERE company_id = sw;
--
--     -- Clear then set, so the single-default index is never transiently violated.
--     UPDATE user_companies SET is_default = FALSE
--      WHERE employee_id IN (SELECT employee_id FROM _restore);
--     UPDATE user_companies SET is_default = TRUE
--      WHERE company_id = am AND employee_id IN (SELECT employee_id FROM _restore);
--
--     RAISE NOTICE 'rolled back; restored % user default(s)', (SELECT count(*) FROM _restore);
-- END $$;
--
-- COMMIT;
