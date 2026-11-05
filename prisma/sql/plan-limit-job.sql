-- Daily plan-limit check (00:05 Dubai time = 20:05 UTC). See prisma/migrations/5_plan_limits.
-- Requires pg_cron (already on for the lead-retention job). Safe to re-run.
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('plan-limits', '5 20 * * *', $$SELECT public.enforce_plan_limits()$$);
