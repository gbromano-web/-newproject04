-- Locks the public schema against Supabase's Data API (the anon and
-- authenticated keys that ship to browsers). The website only talks to
-- Postgres from its server, as the postgres role, so no browser key needs
-- any access. Safe to re-run. Run after prisma/sql/postgis.sql.

-- Row-level security on every table: with no policies, the API sees no rows
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

-- And no privileges either (defence in depth if RLS is ever switched off)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- Functions such as erase_user() would otherwise be callable through /rest/v1/rpc
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- Tables and functions created later by migrations start locked too
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
