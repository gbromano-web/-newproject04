-- Agent plans paid through Stripe (Checkout + Billing). Additive only.
-- Rollback:
--   DROP TABLE IF EXISTS "StripeEvent";
--   ALTER TABLE "Agent" DROP CONSTRAINT IF EXISTS agent_plan_values,
--     DROP COLUMN IF EXISTS "plan", DROP COLUMN IF EXISTS "planInterval",
--     DROP COLUMN IF EXISTS "stripeCustomerId", DROP COLUMN IF EXISTS "stripeSubscriptionId",
--     DROP COLUMN IF EXISTS "subscriptionStatus", DROP COLUMN IF EXISTS "planRenewsAt", DROP COLUMN IF EXISTS "planCancelsAt";

ALTER TABLE "Agent"
  ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT 'STARTER',
  ADD COLUMN IF NOT EXISTS "planInterval" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT,
  ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "planRenewsAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "planCancelsAt" TIMESTAMP(3);

ALTER TABLE "Agent" DROP CONSTRAINT IF EXISTS agent_plan_values;
ALTER TABLE "Agent" ADD CONSTRAINT agent_plan_values
  CHECK ("plan" IN ('STARTER', 'PRO', 'BROKER') AND ("planInterval" IS NULL OR "planInterval" IN ('month', 'year')));

CREATE UNIQUE INDEX IF NOT EXISTS "Agent_stripeCustomerId_key" ON "Agent"("stripeCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "Agent_stripeSubscriptionId_key" ON "Agent"("stripeSubscriptionId");

CREATE TABLE IF NOT EXISTS "StripeEvent" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);
-- Server-only, like every other table: locked against the browser keys
ALTER TABLE "StripeEvent" ENABLE ROW LEVEL SECURITY;
