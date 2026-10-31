-- Daily Data Privacy Act retention job (03:15 Philippine time = 19:15 UTC).
-- Requires the pg_cron extension (Supabase: Database > Extensions). Safe to re-run.
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('lead-retention', '15 19 * * *', $$SELECT public.purge_old_leads(24)$$);
