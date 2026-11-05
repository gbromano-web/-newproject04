-- Payment kill switch per country, and one open Stripe Checkout per agent. Additive only.
-- Rollback:
--   DROP TABLE IF EXISTS "PaymentControl";
--   ALTER TABLE "Agent" DROP COLUMN IF EXISTS "pendingCheckoutId";

-- New checkouts per country. Turn one off in seconds from the SQL editor:
--   UPDATE "PaymentControl" SET "checkoutEnabled" = false, note = '<why>', "updatedAt" = now() WHERE country = 'AE';
-- Existing subscriptions, the customer portal and webhooks keep working.
CREATE TABLE IF NOT EXISTS "PaymentControl" (
  "country" TEXT NOT NULL,
  "checkoutEnabled" BOOLEAN NOT NULL DEFAULT true,
  "note" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentControl_pkey" PRIMARY KEY ("country"),
  CONSTRAINT payment_control_country CHECK ("country" IN ('PH', 'AE'))
);
INSERT INTO "PaymentControl" ("country") VALUES ('PH'), ('AE') ON CONFLICT DO NOTHING;
ALTER TABLE "PaymentControl" ENABLE ROW LEVEL SECURITY;

-- The agent's open Checkout, expired when they start another, so two tabs can't both be paid
ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "pendingCheckoutId" TEXT;
