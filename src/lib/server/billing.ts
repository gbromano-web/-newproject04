import "server-only";
import Stripe from "stripe";
import { LAUNCH_OFFER, PLANS, type Plan, type PlanId } from "@/lib/plans";
import type { CountryCode } from "@/lib/markets";
import { db } from "./db";
import { log } from "./request";

/**
 * Agent plans and Stripe billing.
 *
 * - The site never sees card details: agents pay on Stripe's hosted Checkout and
 *   manage their subscription on Stripe's customer portal.
 * - Stripe tells the site what happened through signed webhooks
 *   (/api/stripe/webhook); each one re-reads the subscription from Stripe, so
 *   late or repeated events cannot leave a stale plan behind.
 * - The plan an agent gets is worked out here (effectivePlan): a paid
 *   subscription first, then the launch offer (Pro for verified agents until
 *   LAUNCH_OFFER.until), otherwise Starter.
 *
 * Settings: STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET switch payments on.
 * STRIPE_AUTOMATIC_TAX=1 turns on Stripe Tax (set it up in Stripe first).
 * STRIPE_API_BASE exists only for the end-to-end tests' stand-in.
 */

export type DbPlan = "STARTER" | "PRO" | "BROKER";
export const toPlanId = (p: string | null | undefined): PlanId => (p === "BROKER" ? "broker" : p === "PRO" ? "pro" : "starter");
export const toDbPlan = (p: PlanId): DbPlan => (p === "broker" ? "BROKER" : p === "pro" ? "PRO" : "STARTER");

/** Subscription states in which the agent keeps their paid plan (past_due: Stripe is still retrying the card). */
const PAID_STATUSES = new Set(["active", "trialing", "past_due"]);

let client: Stripe | null | undefined;
export function stripe(): Stripe | null {
  if (client !== undefined) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return (client = null);
  const config: Stripe.StripeConfig = { maxNetworkRetries: 2, timeout: 15_000, appInfo: { name: "Go Search Property" } };
  const base = process.env.STRIPE_API_BASE;
  if (base) {
    const u = new URL(base);
    Object.assign(config, { host: u.hostname, port: Number(u.port || (u.protocol === "https:" ? 443 : 80)), protocol: u.protocol.replace(":", "") });
  }
  return (client = new Stripe(key, config));
}

export const billingEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);

/** The launch offer runs to the end of LAUNCH_OFFER.until, Dubai time. */
export function launchOfferActive(now = new Date()): boolean {
  return now.getTime() <= new Date(`${LAUNCH_OFFER.until}T23:59:59+04:00`).getTime();
}

export type AgentBilling = {
  agentId: string;
  country: CountryCode;
  verified: boolean;
  plan: DbPlan;
  planInterval: "month" | "year" | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  planRenewsAt: Date | null;
  planCancelsAt: Date | null;
};

export type EffectivePlan = { plan: Plan; source: "paid" | "launch" | "free"; billing: AgentBilling | null };

/** An agent's billing record. Null if the agent doesn't exist, or the billing columns are missing (migration 4 not applied). */
export async function agentBilling(agentId: string): Promise<AgentBilling | null> {
  const pool = db();
  if (!pool) return null;
  try {
    const { rows } = await pool.query(
      `SELECT id AS "agentId", CASE WHEN "licenseType" = 'UAE_BROKER' THEN 'AE' ELSE 'PH' END AS country,
              verification = 'VERIFIED' AS verified, plan, "planInterval", "stripeCustomerId", "stripeSubscriptionId",
              "subscriptionStatus", "planRenewsAt", "planCancelsAt"
         FROM "Agent" WHERE id = $1`,
      [agentId],
    );
    return rows[0] ?? null;
  } catch (e) {
    if ((e as { code?: string }).code === "42703") {
      log("error", "billing.schema_missing", { hint: "apply prisma/migrations/4_agent_billing" });
      return null;
    }
    throw e;
  }
}

export function effectivePlanOf(b: AgentBilling | null, country: CountryCode, verified: boolean, now = new Date()): EffectivePlan {
  const plans = PLANS[country];
  const find = (id: PlanId) => plans.find((p) => p.id === id)!;
  if (b && b.plan !== "STARTER" && b.subscriptionStatus && PAID_STATUSES.has(b.subscriptionStatus)) {
    return { plan: find(toPlanId(b.plan)), source: "paid", billing: b };
  }
  if (verified && launchOfferActive(now)) return { plan: find("pro"), source: "launch", billing: b };
  return { plan: find("starter"), source: "free", billing: b };
}

export async function effectivePlan(agentId: string, country: CountryCode, verified: boolean): Promise<EffectivePlan> {
  return effectivePlanOf(await agentBilling(agentId), country, verified);
}

/** Live listings an agent has now, not counting one listing (the one being published). */
export async function liveListingCount(agentId: string, except?: string): Promise<number> {
  const { rows } = await db()!.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM "Property"
      WHERE "agentId" = $1 AND status = 'ACTIVE' AND "publishedAt" IS NOT NULL AND ("expiresAt" IS NULL OR "expiresAt" > now())
        AND ($2::text IS NULL OR id <> $2)`,
    [agentId, except ?? null],
  );
  return rows[0].n;
}

// ─── Stripe objects ──────────────────────────────────────────────────────────

const prices = new Map<string, string>();

/**
 * The Stripe Price for a plan, created on first use and found again by its lookup
 * key. The amount is part of the key, so changing a price in src/lib/plans.ts
 * makes a new Stripe Price; existing subscribers keep theirs until they change plan.
 */
export async function priceFor(country: CountryCode, plan: Plan, interval: "month" | "year"): Promise<string> {
  const s = stripe()!;
  const amount = interval === "year" ? plan.yearly : plan.monthly;
  const currency = country === "AE" ? "aed" : "php";
  const key = `gsp_${plan.id}_${country.toLowerCase()}_${interval}_${amount}`;
  const cached = prices.get(key);
  if (cached) return cached;
  const found = await s.prices.list({ lookup_keys: [key], active: true, limit: 1 });
  let id = found.data[0]?.id;
  if (!id) {
    const created = await s.prices.create({
      currency,
      unit_amount: amount * 100,
      recurring: { interval },
      lookup_key: key,
      tax_behavior: "exclusive", // prices are shown before VAT
      product_data: { name: `Go Search Property ${plan.name} (${country === "AE" ? "UAE" : "Philippines"})`, metadata: { plan: plan.id, country } },
      metadata: { plan: plan.id, country },
    });
    id = created.id;
  }
  prices.set(key, id);
  return id;
}

/** The agent's Stripe customer, created once and stored on the Agent row. */
export async function customerFor(b: AgentBilling, email: string, name: string): Promise<string> {
  if (b.stripeCustomerId) return b.stripeCustomerId;
  const created = await stripe()!.customers.create({ email, name, metadata: { agentId: b.agentId } }, { idempotencyKey: `customer-${b.agentId}` });
  // Two clicks at once must not leave two customers linked: keep whichever was saved first
  const { rows } = await db()!.query<{ id: string }>(
    `UPDATE "Agent" SET "stripeCustomerId" = COALESCE("stripeCustomerId", $2), "updatedAt" = now() WHERE id = $1 RETURNING "stripeCustomerId" AS id`,
    [b.agentId, created.id],
  );
  return rows[0].id;
}

// ─── Webhook: keep the Agent row in step with Stripe ─────────────────────────

/**
 * Re-reads one subscription from Stripe and writes its state to the agent it
 * belongs to. The agent comes from the subscription's metadata (set by this site
 * at checkout) and must match the Stripe customer stored on that agent.
 */
export async function syncSubscription(subscriptionId: string): Promise<{ agentId: string; plan: DbPlan; status: string } | null> {
  const sub = await stripe()!.subscriptions.retrieve(subscriptionId);
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const agentId = sub.metadata?.agentId;
  const wanted = sub.metadata?.plan === "broker" ? "BROKER" : sub.metadata?.plan === "pro" ? "PRO" : null;
  if (!agentId || !wanted) {
    log("warn", "billing.subscription_unmatched", { subscriptionId, reason: "metadata" });
    return null;
  }
  const item = sub.items?.data?.[0];
  const interval = item?.price?.recurring?.interval === "year" ? "year" : "month";
  // API 2025-03+: the billing period lives on the subscription item
  const periodEnd = (item as { current_period_end?: number } | undefined)?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end;
  const paid = PAID_STATUSES.has(sub.status);
  const plan: DbPlan = paid ? wanted : "STARTER";
  const pool = db()!;
  const { rows } = await pool.query<{ before: string }>(
    `WITH old AS (SELECT id, plan FROM "Agent" WHERE id = $1 AND "stripeCustomerId" = $2 FOR UPDATE)
     UPDATE "Agent" a SET plan = $3, "planInterval" = $4, "stripeSubscriptionId" = $5, "subscriptionStatus" = $6,
            "planRenewsAt" = $7, "planCancelsAt" = $8, "updatedAt" = now()
       FROM old WHERE a.id = old.id
     RETURNING old.plan AS before`,
    [
      agentId, customer, plan, paid ? interval : null, sub.id, sub.status,
      periodEnd ? new Date(periodEnd * 1000) : null,
      sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
    ],
  );
  if (!rows[0]) {
    log("warn", "billing.subscription_unmatched", { subscriptionId, reason: "customer" });
    return null;
  }
  if (rows[0].before !== plan) {
    await pool
      .query(
        `INSERT INTO "AuditLog" (id, action, "entityType", "entityId", before, after, "createdAt")
         VALUES (gen_random_uuid()::text, 'agent.plan_changed', 'Agent', $1, $2, $3, now())`,
        [agentId, { plan: rows[0].before }, { plan, status: sub.status, subscriptionId: sub.id }],
      )
      .catch(() => {});
  }
  return { agentId, plan, status: sub.status };
}

/** Records a webhook event; false if it was already handled (Stripe re-delivers). */
export async function firstTimeEvent(id: string, type: string): Promise<boolean> {
  const { rows } = await db()!.query(`INSERT INTO "StripeEvent" (id, type) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING RETURNING id`, [id, type]);
  return rows.length > 0;
}

export async function forgetEvent(id: string): Promise<void> {
  await db()!.query(`DELETE FROM "StripeEvent" WHERE id = $1`, [id]).catch(() => {});
}
