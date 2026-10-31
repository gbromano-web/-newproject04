"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createHash } from "node:crypto";
import { SAMPLE_DATA } from "@/lib/ph/preview";
import { getSession, supabaseServer } from "@/lib/server/agent-session";
import { db } from "@/lib/server/db";
import { ipHash, log, rateLimit } from "@/lib/server/request";
import { safeNext } from "@/lib/server/supabase-config";

export type FormState = { error?: string; ok?: string; email?: string };

const EMAIL = /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]{2,}$/;
const MIN_PASSWORD = 10;
const field = (f: FormData, k: string, max = 254) => String(f.get(k) ?? "").slice(0, max);
const emailKey = (e: string) => createHash("sha256").update(e).digest("hex").slice(0, 24);

async function visitor() {
  return ipHash({ headers: await headers() });
}

/** Too many attempts from one visitor, or against one email, slows guessing down. */
async function limited(scope: string, email: string | null, perWindow: number) {
  const ip = await visitor();
  const a = await rateLimit(`${scope}:ip:${ip}`, perWindow, 15 * 60_000);
  const b = email ? await rateLimit(`${scope}:email:${emailKey(email)}`, perWindow, 15 * 60_000) : { ok: true };
  return { ok: a.ok && b.ok, ip };
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  if (SAMPLE_DATA) return { error: "Agent sign-in opens when real listings go live." };
  const email = field(form, "email").trim().toLowerCase();
  const password = field(form, "password", 200);
  if (!EMAIL.test(email) || !password) return { error: "Enter your email and password.", email };

  const { ok, ip } = await limited("signin", email, 10);
  if (!ok) {
    log("warn", "agent.signin_rate_limited", { ipHash: ip });
    return { error: "Too many attempts. Please wait 15 minutes and try again.", email };
  }
  const sb = await supabaseServer();
  if (!sb) return { error: "Sign-in is not available right now.", email };
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    log("info", "agent.signin_failed", { ipHash: ip, code: error.code });
    // Same message whether the email exists or not
    return { error: "That email and password do not match.", email };
  }
  log("info", "agent.signin", { ipHash: ip });
  redirect(safeNext(form.get("next")));
}

export async function signOut() {
  const sb = await supabaseServer();
  await sb?.auth.signOut();
  redirect("/agent/sign-in");
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function sendReset(_: FormState, form: FormData): Promise<FormState> {
  if (SAMPLE_DATA) return { error: "Agent sign-in opens when real listings go live." };
  const email = field(form, "email").trim().toLowerCase();
  if (!EMAIL.test(email)) return { error: "Enter a valid email address.", email };
  const { ok } = await limited("reset", email, 3);
  const done = { ok: "If that email belongs to an agent account, a link to set a new password is on its way. It works once, for one hour." };
  if (!ok) return done; // do not reveal limits per email
  const sb = await supabaseServer();
  if (!sb) return { error: "Password reset is not available right now." };
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/confirm?next=/agent/set-password`,
  });
  if (error) log("warn", "agent.reset_failed", { code: error.code });
  return done;
}

export async function setPassword(_: FormState, form: FormData): Promise<FormState> {
  const password = field(form, "password", 200);
  const confirm = field(form, "confirm", 200);
  if (password.length < MIN_PASSWORD) return { error: `Use at least ${MIN_PASSWORD} characters.` };
  if (password !== confirm) return { error: "The two passwords do not match." };
  const sb = await supabaseServer();
  const session = await getSession();
  if (!sb || !session) return { error: "Your link has expired. Ask for a new one." };
  const { error } = await sb.auth.updateUser({ password });
  if (error) {
    return { error: error.code === "weak_password" || error.code === "same_password" ? error.message : "The password could not be changed. Please try again." };
  }
  log("info", "agent.password_set", { userId: session.userId });
  redirect("/dashboard");
}

const LEAD_STATUSES = ["NEW", "CONTACTED", "SITE_VIEWING_SCHEDULED", "RESERVED", "WON", "LOST", "SPAM"] as const;

/** An agent moves one of their own leads along. Other agents' leads are never touched. */
export async function setLeadStatus(form: FormData) {
  const session = await getSession();
  if (!session?.agent) return;
  const leadId = field(form, "leadId", 64);
  const status = field(form, "status", 32);
  if (!leadId || !(LEAD_STATUSES as readonly string[]).includes(status)) return;
  const pool = db();
  if (!pool) return;
  const { rows } = await pool.query(
    `WITH old AS (SELECT id, status FROM "Lead" WHERE id = $1 AND "agentId" = $2 FOR UPDATE)
     UPDATE "Lead" l SET status = $3::"LeadStatus", "updatedAt" = now()
       FROM old WHERE l.id = old.id AND old.status <> $3::"LeadStatus"
     RETURNING old.status::text AS before`,
    [leadId, session.agent.id, status],
  );
  if (rows[0]) {
    await pool.query(
      `INSERT INTO "AuditLog" (id, "actorUserId", action, "entityType", "entityId", before, after, "ipHash", "createdAt")
       VALUES (gen_random_uuid()::text, $1, 'lead.status_changed', 'Lead', $2, $3, $4, $5, now())`,
      [session.userId, leadId, { status: rows[0].before }, { status }, await visitor()],
    );
  }
  revalidatePath("/dashboard");
}
