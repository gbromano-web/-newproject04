-- Admin decisions on agent applications (/admin/agents). Approval creates the
-- User and Agent rows, so only rejections need a record here. Additive only.
-- Rollback: DROP TABLE IF EXISTS "ApplicationDecision";
CREATE TABLE IF NOT EXISTS "ApplicationDecision" (
  "userId" TEXT NOT NULL,
  "decision" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "decidedBy" TEXT NOT NULL,
  "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApplicationDecision_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT application_decision_value CHECK ("decision" IN ('REJECTED')),
  CONSTRAINT application_decision_reason CHECK (length(btrim("reason")) BETWEEN 5 AND 500)
);
ALTER TABLE "ApplicationDecision" ENABLE ROW LEVEL SECURITY;
