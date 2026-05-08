-- Migration 040: Consolidate tab_permissions records
--
-- Reconciles existing user.tab_permissions arrays with the refreshed
-- AVAILABLE_TABS list:
--   - Replace 'users' with 'user_management' (consolidation)
--   - Remove 'master_tasks' and 'master_development' (deprecated)
--
-- Safe to run multiple times (idempotent).

-- Replace 'users' with 'user_management' in user records
UPDATE users
SET tab_permissions = array_replace(tab_permissions, 'users', 'user_management')
WHERE 'users' = ANY(tab_permissions);

-- Remove deprecated keys from user records
UPDATE users
SET tab_permissions = array_remove(tab_permissions, 'master_tasks')
WHERE 'master_tasks' = ANY(tab_permissions);

UPDATE users
SET tab_permissions = array_remove(tab_permissions, 'master_development')
WHERE 'master_development' = ANY(tab_permissions);

-- Same cleanup for role_permissions table if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'role_permissions'
    ) THEN
        -- Check if role_permissions has a tab_permissions column
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'role_permissions'
              AND column_name = 'tab_permissions'
        ) THEN
            UPDATE role_permissions
            SET tab_permissions = array_replace(tab_permissions, 'users', 'user_management')
            WHERE 'users' = ANY(tab_permissions);

            UPDATE role_permissions
            SET tab_permissions = array_remove(tab_permissions, 'master_tasks')
            WHERE 'master_tasks' = ANY(tab_permissions);

            UPDATE role_permissions
            SET tab_permissions = array_remove(tab_permissions, 'master_development')
            WHERE 'master_development' = ANY(tab_permissions);

            RAISE NOTICE '✅ Cleaned up role_permissions table';
        END IF;
    END IF;
END $$;

-- Report what was changed
DO $$
DECLARE
    affected_users INT;
BEGIN
    SELECT COUNT(*) INTO affected_users
    FROM users
    WHERE 'users' = ANY(tab_permissions)
       OR 'master_tasks' = ANY(tab_permissions)
       OR 'master_development' = ANY(tab_permissions);

    IF affected_users > 0 THEN
        RAISE WARNING '% user records still contain deprecated tab_permission keys', affected_users;
    ELSE
        RAISE NOTICE '✅ All user.tab_permissions records are clean';
    END IF;
END $$;
