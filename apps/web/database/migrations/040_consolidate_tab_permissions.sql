-- Migration 040: Consolidate tab_permissions records
--
-- Reconciles existing user.tab_permissions (and role_permissions.tab_permissions)
-- arrays with the refreshed AVAILABLE_TABS list:
--   - Replace 'users' with 'user_management' (consolidation)
--   - Remove 'master_tasks' and 'master_development' (deprecated)
--
-- NOTE: tab_permissions is a JSONB array column (not text[]), so this uses
-- JSONB membership operator `?` and rebuilds arrays via jsonb_agg over
-- jsonb_array_elements. Idempotent — safe to re-run.

-- 1. Replace 'users' with 'user_management' in users.tab_permissions
UPDATE users
SET tab_permissions = (
    SELECT jsonb_agg(
        CASE WHEN value = '"users"'::jsonb THEN '"user_management"'::jsonb ELSE value END
    )
    FROM jsonb_array_elements(tab_permissions) AS value
)
WHERE tab_permissions ? 'users';

-- 2. Remove 'master_tasks' from users.tab_permissions
UPDATE users
SET tab_permissions = COALESCE(
    (SELECT jsonb_agg(value)
     FROM jsonb_array_elements(tab_permissions) AS value
     WHERE value <> '"master_tasks"'::jsonb),
    '[]'::jsonb
)
WHERE tab_permissions ? 'master_tasks';

-- 3. Remove 'master_development' from users.tab_permissions
UPDATE users
SET tab_permissions = COALESCE(
    (SELECT jsonb_agg(value)
     FROM jsonb_array_elements(tab_permissions) AS value
     WHERE value <> '"master_development"'::jsonb),
    '[]'::jsonb
)
WHERE tab_permissions ? 'master_development';

-- 4. Same cleanup for role_permissions table if present
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'role_permissions'
          AND column_name = 'tab_permissions'
    ) THEN
        UPDATE role_permissions
        SET tab_permissions = (
            SELECT jsonb_agg(
                CASE WHEN value = '"users"'::jsonb THEN '"user_management"'::jsonb ELSE value END
            )
            FROM jsonb_array_elements(tab_permissions) AS value
        )
        WHERE tab_permissions ? 'users';

        UPDATE role_permissions
        SET tab_permissions = COALESCE(
            (SELECT jsonb_agg(value)
             FROM jsonb_array_elements(tab_permissions) AS value
             WHERE value <> '"master_tasks"'::jsonb),
            '[]'::jsonb
        )
        WHERE tab_permissions ? 'master_tasks';

        UPDATE role_permissions
        SET tab_permissions = COALESCE(
            (SELECT jsonb_agg(value)
             FROM jsonb_array_elements(tab_permissions) AS value
             WHERE value <> '"master_development"'::jsonb),
            '[]'::jsonb
        )
        WHERE tab_permissions ? 'master_development';

        RAISE NOTICE 'Cleaned up role_permissions table';
    END IF;
END $$;

-- 5. Report any remaining deprecated keys (should be 0)
DO $$
DECLARE
    bad_count INT;
BEGIN
    SELECT COUNT(*) INTO bad_count
    FROM users
    WHERE tab_permissions ? 'users'
       OR tab_permissions ? 'master_tasks'
       OR tab_permissions ? 'master_development';

    IF bad_count > 0 THEN
        RAISE WARNING '% user records still contain deprecated keys', bad_count;
    ELSE
        RAISE NOTICE 'All user.tab_permissions records are clean';
    END IF;
END $$;
