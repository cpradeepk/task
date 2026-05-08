-- Migration 039: Enable RLS on all public schema tables (security hardening)
--
-- Why: Supabase auto-exposes a public REST/GraphQL/Realtime API at the project URL.
-- Without RLS, anyone with the anon key can query these tables directly,
-- bypassing the app's auth layer.
--
-- The app connects via the postgres role which BYPASSES RLS by default,
-- so app behavior is unchanged. With RLS enabled and no policies defined,
-- the anon and authenticated Supabase roles are denied access by default.

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
        RAISE NOTICE 'RLS enabled on %', r.tablename;
    END LOOP;
END $$;

-- Verify all public tables have RLS enabled
DO $$
DECLARE
    bad_count INT;
BEGIN
    SELECT COUNT(*) INTO bad_count
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.schemaname = 'public'
      AND n.nspname = 'public'
      AND NOT c.relrowsecurity;

    IF bad_count > 0 THEN
        RAISE EXCEPTION '% public tables still missing RLS', bad_count;
    ELSE
        RAISE NOTICE '✅ RLS enabled on all public schema tables';
    END IF;
END $$;
