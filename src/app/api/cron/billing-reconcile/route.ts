import { timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
import { billingEnabled, reconcile } from "@/lib/server/billing";
import { log } from "@/lib/server/request";

/**
 * Daily reconciliation with Stripe (vercel.json crons). Vercel calls it with
 * "Authorization: Bearer $CRON_SECRET"; anything else gets 401, and without
 * CRON_SECRET set it does nothing (503). Returns and logs counts only.
 */
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get("authorization") ?? "";
  if (!secret) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  await connection();
  if (!process.env.CRON_SECRET) return Response.json({ error: "Not configured." }, { status: 503 });
  if (!authorized(req)) return Response.json({ error: "Unauthorized." }, { status: 401 });
  if (!billingEnabled()) return Response.json({ skipped: "payments off" });
  try {
    const r = await reconcile();
    const problems = r.duplicates.length + r.unlinked.length;
    log(problems ? "error" : "info", "billing.reconciled", {
      checked: r.checked, changed: r.changed, relinked: r.relinked, duplicates: r.duplicates, unlinked: r.unlinked,
    });
    return Response.json(r, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    log("error", "billing.reconcile_failed", { error: e instanceof Error ? e.name : "unknown" });
    return Response.json({ error: "Reconciliation failed." }, { status: 500 });
  }
}
