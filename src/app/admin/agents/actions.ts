"use server";

import { after } from "next/server";
import { getSession } from "@/lib/server/agent-session";
import { approveApplicant, isAdminEmail, rejectApplicant } from "@/lib/server/admin";
import { approvedNotice, rejectedNotice } from "@/lib/server/notices";
import { log } from "@/lib/server/request";

/**
 * Admin decisions on agent applications. Server actions can be called by anyone
 * who can reach the site, so each one re-checks that the caller is signed in
 * with an email in ADMIN_EMAILS.
 */
export type DecisionState = { error?: string; ok?: string };

const ID = /^[0-9a-f-]{36}$/i;

async function admin() {
  const s = await getSession();
  return s && isAdminEmail(s.email) ? s.email : null;
}

const WHY: Record<string, string> = {
  missing: "That application was already decided or no longer exists.",
  not_confirmed: "They haven't confirmed their email address yet. Approve once they have.",
  supervisor: "Their supervising PRC broker isn't an approved agent here yet. Approve the broker first.",
  duplicate: "That licence number already belongs to another agent. Check before going further.",
  invalid: "The licence details in the application are incomplete or invalid.",
};

export async function approve(_: DecisionState, form: FormData): Promise<DecisionState> {
  const by = await admin();
  if (!by) return { error: "Only admins can do this." };
  const userId = String(form.get("userId") ?? "");
  if (!ID.test(userId)) return { error: "That application can't be found." };
  const r = await approveApplicant(userId, by);
  if (!r.ok) return { error: WHY[r.reason] };
  after(() => approvedNotice(r.email, r.name, r.country).catch(() => {}));
  log("info", "admin.agent_approved", { agentId: r.agentId });
  return { ok: `${r.name} is approved. They can sign in and list now.` };
}

export async function reject(_: DecisionState, form: FormData): Promise<DecisionState> {
  const by = await admin();
  if (!by) return { error: "Only admins can do this." };
  const userId = String(form.get("userId") ?? "");
  const reason = String(form.get("reason") ?? "").trim();
  if (!ID.test(userId)) return { error: "That application can't be found." };
  if (reason.length < 5 || reason.length > 500) return { error: "Give a reason of 5 to 500 characters; the applicant will see it." };
  const r = await rejectApplicant(userId, by, reason);
  if (!r) return { error: WHY.missing };
  after(() => rejectedNotice(r.email, r.name, reason).catch(() => {}));
  log("info", "admin.agent_rejected", { userId });
  return { ok: `${r.name}'s application was declined.` };
}
