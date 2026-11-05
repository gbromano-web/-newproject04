-- Live-listing limits after a plan ends (downgrade). Additive only.
-- Every day (prisma/sql/plan-limit-job.sql) enforce_plan_limits():
--   1. marks agents who have more live listings than their plan allows (Agent."overLimitSince"),
--   2. after 14 days over the limit, pauses their newest live listings down to the limit,
--   3. clears the mark when they are back within it.
-- The limits and the launch-offer date repeat src/lib/plans.ts and src/lib/server/billing.ts:
-- change both together.
-- Rollback:
--   SELECT cron.unschedule('plan-limits');
--   DROP FUNCTION IF EXISTS public.enforce_plan_limits(interval);
--   DROP FUNCTION IF EXISTS public.plan_listing_limit(text, text, boolean, timestamptz);
--   ALTER TABLE "Agent" DROP COLUMN IF EXISTS "overLimitSince";

ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "overLimitSince" TIMESTAMP(3);

CREATE OR REPLACE FUNCTION public.plan_listing_limit(p_plan text, p_status text, p_verified boolean, p_at timestamptz DEFAULT now())
RETURNS integer LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT CASE
    WHEN p_plan = 'BROKER' AND p_status IN ('active', 'trialing', 'past_due') THEN 100
    WHEN p_plan = 'PRO' AND p_status IN ('active', 'trialing', 'past_due') THEN 25
    WHEN p_verified AND p_at <= timestamptz '2027-03-31 23:59:59+04' THEN 25 -- launch offer: Pro
    ELSE 3
  END
$$;

CREATE OR REPLACE FUNCTION public.enforce_plan_limits(p_grace interval DEFAULT interval '14 days')
RETURNS integer LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  paused integer := 0;
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS _plan_usage (agent_id text PRIMARY KEY, lim integer, live integer, over_since timestamp) ON COMMIT DROP;
  TRUNCATE _plan_usage;
  INSERT INTO _plan_usage
  SELECT a.id,
         public.plan_listing_limit(a.plan, a."subscriptionStatus", a.verification = 'VERIFIED'),
         (SELECT count(*) FROM public."Property" p
           WHERE p."agentId" = a.id AND p.status = 'ACTIVE' AND p."publishedAt" IS NOT NULL
             AND (p."expiresAt" IS NULL OR p."expiresAt" > now())),
         a."overLimitSince"
    FROM public."Agent" a;

  -- Newly over the limit: start the grace period (the dashboard shows the date)
  UPDATE public."Agent" a SET "overLimitSince" = now(), "updatedAt" = now()
    FROM _plan_usage u WHERE u.agent_id = a.id AND u.live > u.lim AND u.over_since IS NULL;
  -- Back within it (paused, closed or upgraded): clear
  UPDATE public."Agent" a SET "overLimitSince" = NULL, "updatedAt" = now()
    FROM _plan_usage u WHERE u.agent_id = a.id AND u.live <= u.lim AND u.over_since IS NOT NULL;

  -- Grace over: keep the oldest `lim` live listings, pause the rest
  WITH ranked AS (
    SELECT p.id, p."agentId", u.lim,
           row_number() OVER (PARTITION BY p."agentId" ORDER BY p."publishedAt", p.id) AS rn
      FROM public."Property" p
      JOIN _plan_usage u ON u.agent_id = p."agentId"
     WHERE u.live > u.lim AND u.over_since IS NOT NULL AND u.over_since <= now() - p_grace
       AND p.status = 'ACTIVE' AND p."publishedAt" IS NOT NULL AND (p."expiresAt" IS NULL OR p."expiresAt" > now())
  ), done AS (
    UPDATE public."Property" p SET status = 'PAUSED', "updatedAt" = now()
      FROM ranked r WHERE r.id = p.id AND r.rn > r.lim
    RETURNING p.id, p."agentId", r.lim
  ), logged AS (
    INSERT INTO public."AuditLog" (id, action, "entityType", "entityId", before, after, "createdAt")
    SELECT gen_random_uuid()::text, 'listing.paused_over_plan_limit', 'Property', d.id,
           jsonb_build_object('status', 'ACTIVE'), jsonb_build_object('status', 'PAUSED', 'agentId', d."agentId", 'limit', d.lim), now()
      FROM done d
    RETURNING 1
  )
  SELECT count(*) INTO paused FROM logged;

  UPDATE public."Agent" a SET "overLimitSince" = NULL, "updatedAt" = now()
    FROM _plan_usage u
   WHERE u.agent_id = a.id AND u.over_since IS NOT NULL AND u.over_since <= now() - p_grace;
  RETURN paused;
END
$$;

-- Server-side only: never callable through the Data API
REVOKE ALL ON FUNCTION public.plan_listing_limit(text, text, boolean, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_plan_limits(interval) FROM PUBLIC;
