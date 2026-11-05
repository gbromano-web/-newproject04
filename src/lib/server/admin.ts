import "server-only";
import type { AgentApplication } from "./agent-session";
import { db } from "./db";
import { adminEmails } from "./email";

/**
 * Agent applications for the admin screen (/admin/agents). Admins are the
 * signed-in users whose email is in ADMIN_EMAILS. Applications live in Supabase
 * Auth (auth.users.raw_user_meta_data.application, written at sign-up); the
 * site reads them through its own database connection, never a service key.
 */

export const isAdminEmail = (email: string | null | undefined) => !!email && adminEmails().includes(email.toLowerCase());

export type Applicant = {
  userId: string;
  email: string;
  confirmed: boolean;
  appliedAt: Date;
  application: AgentApplication;
  supervisorApproved: boolean | null; // salespersons: is their PRC broker already an approved agent here?
};

export async function pendingApplicants(): Promise<Applicant[]> {
  const { rows } = await db()!.query<Applicant>(
    `SELECT u.id::text AS "userId", u.email, u.email_confirmed_at IS NOT NULL AS confirmed, u.created_at AS "appliedAt",
            u.raw_user_meta_data->'application' AS application,
            CASE WHEN u.raw_user_meta_data->'application'->>'licenseType' = 'REAL_ESTATE_SALESPERSON'
                 THEN EXISTS (SELECT 1 FROM "Agent" b WHERE b."prcLicenseNumber" = u.raw_user_meta_data->'application'->>'supervisingBrokerPrc'
                                AND b.verification = 'VERIFIED') END AS "supervisorApproved"
       FROM auth.users u
      WHERE u.raw_user_meta_data ? 'application'
        AND NOT EXISTS (SELECT 1 FROM "Agent" a WHERE a."userId" = u.id::text)
        AND NOT EXISTS (SELECT 1 FROM "ApplicationDecision" d WHERE d."userId" = u.id::text)
      ORDER BY u.created_at
      LIMIT 200`,
  );
  return rows;
}

export type ApproveResult =
  | { ok: true; agentId: string; email: string; name: string; country: string }
  | { ok: false; reason: "missing" | "not_confirmed" | "supervisor" | "duplicate" | "invalid" };

/** Creates the User and Agent rows from the application, verified now (playbook 7.1). */
export async function approveApplicant(userId: string, adminEmail: string): Promise<ApproveResult> {
  const pool = db()!;
  const { rows: found } = await pool.query<{ confirmed: boolean; email: string; a: AgentApplication | null; decided: boolean; agent: boolean }>(
    `SELECT u.email_confirmed_at IS NOT NULL AS confirmed, u.email, u.raw_user_meta_data->'application' AS a,
            EXISTS (SELECT 1 FROM "ApplicationDecision" d WHERE d."userId" = u.id::text) AS decided,
            EXISTS (SELECT 1 FROM "Agent" x WHERE x."userId" = u.id::text) AS agent
       FROM auth.users u WHERE u.id::text = $1`,
    [userId],
  );
  const f = found[0];
  if (!f || !f.a || f.decided || f.agent) return { ok: false, reason: "missing" };
  if (!f.confirmed) return { ok: false, reason: "not_confirmed" };
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ id: string }>(
      `WITH app AS (
         SELECT id::text AS uid, email, raw_user_meta_data->'application' AS a FROM auth.users WHERE id::text = $1
       ), usr AS (
         INSERT INTO "User" (id, email, name, role, "updatedAt")
         SELECT uid, email, a->>'fullName', 'AGENT', now() FROM app
         ON CONFLICT (id) DO UPDATE SET role = 'AGENT', "updatedAt" = now()
         RETURNING id
       )
       INSERT INTO "Agent" (id, "userId", "licenseType", "prcLicenseNumber", "dhsudAccreditationNumber", "supervisingBrokerId",
                            "uaeRegulator", "uaeBrokerNumber", "uaeOfficeNumber", "displayName", mobile, "viberNumber",
                            "whatsappNumber", languages, verification, "verifiedAt", "updatedAt")
       SELECT gen_random_uuid()::text, app.uid, (a->>'licenseType')::"LicenseType",
              a->>'prcLicenseNumber', a->>'dhsudAccreditationNumber',
              (SELECT b.id FROM "Agent" b WHERE b."prcLicenseNumber" = a->>'supervisingBrokerPrc' AND b.verification = 'VERIFIED'),
              a->>'uaeRegulator', a->>'uaeBrokerNumber', a->>'uaeOfficeNumber',
              a->>'fullName', a->>'mobile',
              CASE WHEN a->>'country' = 'PH' THEN a->>'mobile' END,
              ltrim(a->>'mobile', '+'),
              CASE WHEN a->>'country' = 'AE' THEN ARRAY['English', 'Arabic'] ELSE ARRAY['English', 'Filipino'] END,
              'VERIFIED', now(), now()
         FROM app JOIN usr ON usr.id = app.uid
       RETURNING id`,
      [userId],
    );
    await client.query(
      `INSERT INTO "AuditLog" (id, "actorUserId", action, "entityType", "entityId", after, "createdAt")
       VALUES (gen_random_uuid()::text, NULL, 'agent.verified', 'Agent', $1, $2, now())`,
      [rows[0].id, { userId, by: adminEmail, via: "admin" }],
    );
    await client.query("COMMIT");
    return { ok: true, agentId: rows[0].id, email: f.email, name: f.a.fullName, country: f.a.country };
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    const code = (e as { code?: string }).code;
    const constraint = (e as { constraint?: string }).constraint ?? "";
    if (code === "23505") return { ok: false, reason: "duplicate" };
    if (code === "23514" && /licen/i.test(constraint)) return { ok: false, reason: f.a.licenseType === "REAL_ESTATE_SALESPERSON" ? "supervisor" : "invalid" };
    if (code === "23514" || code === "22P02") return { ok: false, reason: "invalid" };
    throw e;
  } finally {
    client.release();
  }
}

export async function rejectApplicant(userId: string, adminEmail: string, reason: string): Promise<{ email: string; name: string } | null> {
  const pool = db()!;
  const { rows } = await pool.query<{ email: string; name: string }>(
    `WITH app AS (
       SELECT u.id::text AS uid, u.email, u.raw_user_meta_data->'application'->>'fullName' AS name FROM auth.users u
        WHERE u.id::text = $1 AND u.raw_user_meta_data ? 'application'
          AND NOT EXISTS (SELECT 1 FROM "Agent" a WHERE a."userId" = u.id::text)
     ), ins AS (
       INSERT INTO "ApplicationDecision" ("userId", decision, reason, "decidedBy") SELECT uid, 'REJECTED', $3, $2 FROM app
       ON CONFLICT ("userId") DO NOTHING RETURNING "userId"
     )
     SELECT app.email, app.name FROM app JOIN ins ON ins."userId" = app.uid`,
    [userId, adminEmail, reason],
  );
  if (!rows[0]) return null;
  await pool.query(
    `INSERT INTO "AuditLog" (id, action, "entityType", "entityId", after, "createdAt")
     VALUES (gen_random_uuid()::text, 'agent.application_rejected', 'User', $1, $2, now())`,
    [userId, { by: adminEmail, reason }],
  );
  return rows[0];
}

/** For the applicant's own dashboard: was their application turned down, and why? */
export async function decisionFor(userId: string): Promise<{ reason: string } | null> {
  const { rows } = await db()!.query<{ reason: string }>(`SELECT reason FROM "ApplicationDecision" WHERE "userId" = $1`, [userId]);
  return rows[0] ?? null;
}
