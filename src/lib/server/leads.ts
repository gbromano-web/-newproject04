import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "./db";

export interface NewLead {
  channel: "VIBER" | "WHATSAPP" | "INQUIRY" | "SAMPLE_COMPUTATION";
  propertyId: string;
  agentId: string;
  ipHash: string;
  userAgent?: string | null;
  name?: string;
  email?: string;
  mobile?: string | null;
  message?: string | null;
  consentAt?: Date;
  computation?: {
    financingType: "PAGIBIG" | "BANK";
    downpaymentPercent: number;
    termYears: number;
    [k: string]: unknown;
  } | null;
}

/** True when leads may be logged without a database (demo servers only, set LEADS_LOG_ONLY=1). */
export const logOnlyAllowed = () => process.env.LEADS_LOG_ONLY === "1" || process.env.NODE_ENV !== "production";

/**
 * Inserts one row into "Lead". Parameterised SQL only. Returns stored=false
 * when no database is configured and log-only mode is allowed; throws when a
 * production server has no database, so an inquiry is never acknowledged and lost.
 */
export async function saveLead(l: NewLead): Promise<{ stored: boolean; id?: string }> {
  const pool = db();
  if (!pool) {
    if (logOnlyAllowed()) return { stored: false };
    throw new Error("Lead storage is not configured (DATABASE_URL missing)");
  }
  const id = randomUUID();
  const c = l.computation ?? null;
  await pool.query(
    `INSERT INTO "Lead" (id, "propertyId", "agentId", channel, name, email, mobile, message,
       "financingType", "downpaymentPercent", "loanTermYears", computation,
       "userAgent", "ipHash", "consentAt", "updatedAt")
     VALUES ($1, $2, $3, $4::"LeadChannel", $5, $6, $7, $8, $9::"FinancingType", $10, $11, $12, $13, $14, $15, now())`,
    [
      id, l.propertyId, l.agentId, l.channel,
      l.name ?? null, l.email ?? null, l.mobile ?? null, l.message ?? null,
      c?.financingType ?? null, c?.downpaymentPercent ?? null, c?.termYears ?? null, c ? JSON.stringify(c) : null,
      l.userAgent?.slice(0, 300) ?? null, l.ipHash, l.consentAt ?? null,
    ],
  );
  return { stored: true, id };
}
