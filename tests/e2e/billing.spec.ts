import Stripe from "stripe";
import { BASE_URL } from "./support/ports";
import { ACCOUNTS, authServer, expect, resetState, signIn, sql, test } from "./support/helpers";

/**
 * Agent plans and Stripe billing, against the Stripe stand-in in mock-auth.mjs:
 * checkout, signed webhooks (and what happens to unsigned or repeated ones),
 * the live-listing limit of each plan, and the customer portal.
 */

const SECRET = "whsec_e2e_test_secret";
const signer = new Stripe("sk_test_e2e");

const cleanUp = async () => {
  await sql(`DELETE FROM "PropertyMedia" WHERE "propertyId" LIKE 'l\\_%'`);
  await sql(`DELETE FROM "PriceChange" WHERE "propertyId" LIKE 'l\\_%'`);
  await sql(`DELETE FROM "Property" WHERE id LIKE 'l\\_%'`);
  await sql(`DELETE FROM "StripeEvent"`);
  await sql(`UPDATE "Agent" SET plan = 'STARTER', "planInterval" = NULL, "stripeCustomerId" = NULL, "stripeSubscriptionId" = NULL,
               "subscriptionStatus" = NULL, "planRenewsAt" = NULL, "planCancelsAt" = NULL, verification = 'VERIFIED'
             WHERE id IN ('a_agent', 'a_uae')`);
};
test.beforeEach(async () => {
  await resetState();
  await cleanUp();
});
test.afterAll(cleanUp);

let n = 0;
/** Sends a webhook event to the site, signed like Stripe signs it (or not). */
async function webhook(type: string, object: Record<string, unknown>, opts: { id?: string; secret?: string } = {}) {
  const payload = JSON.stringify({ id: opts.id ?? `evt_e2e_${Date.now()}_${++n}`, object: "event", type, data: { object }, api_version: "2026-08-26.dahlia", created: Math.floor(Date.now() / 1000) });
  const header = signer.webhooks.generateTestHeaderString({ payload, secret: opts.secret ?? SECRET });
  return fetch(`${BASE_URL}/api/stripe/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": header },
    body: payload,
  });
}

const agentRow = async (id = "a_agent") =>
  (await sql<{ plan: string; subscriptionStatus: string | null; planInterval: string | null; stripeCustomerId: string | null }>(
    `SELECT plan, "subscriptionStatus", "planInterval", "stripeCustomerId" FROM "Agent" WHERE id = $1`, [id]))[0];

/** Signs in, buys Brokerage on the (stand-in) Stripe Checkout, and has Stripe report it. */
async function buyBrokerage(page: import("@playwright/test").Page, interval: "month" | "year" = "month") {
  await page.goto("/dashboard/billing");
  const label = interval === "month" ? "Pay ₱2,499 a month" : "Pay ₱24,990 a year";
  await page.getByRole("button", { name: label }).click();
  await page.waitForURL(/\/__stripe\/pages\/checkout\/cs_test_\d+$/);
  const csId = page.url().split("/").pop()!;
  const sub = await authServer.completeCheckout(csId);
  const r = await webhook("checkout.session.completed", { id: csId, object: "checkout.session", mode: "subscription", subscription: sub.id, customer: sub.customer });
  expect(r.status).toBe(200);
  return { csId, sub };
}

test.describe("agent billing", () => {
  test("a broker buys Brokerage on Stripe Checkout and the plan follows Stripe's webhooks", async ({ page }) => {
    await signIn(page, ACCOUNTS.agent.email, ACCOUNTS.agent.password);
    await page.getByRole("link", { name: "Plan and billing" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Plan and billing");
    // Launch offer: Pro for free, nothing to pay for it; Brokerage can be bought
    await expect(page.locator("#plan-h")).toHaveText("Pro");
    await expect(page.getByText("Free with the launch offer until 31 March 2027.")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Pay .* a month$/ })).toHaveCount(1);

    const { csId, sub } = await buyBrokerage(page);
    const state = await authServer.stripe();
    const cs = state.sessions.find((s) => s.id === csId)!;
    // What the site asked Stripe for: a peso subscription for this agent, with the right price
    expect(cs.mode).toBe("subscription");
    expect(cs.metadata).toEqual({ agentId: "a_agent", plan: "broker", country: "PH" });
    expect(cs.subscription_data.metadata).toEqual({ agentId: "a_agent", plan: "broker", country: "PH" });
    expect(cs.success_url).toMatch(/\/dashboard\/billing\?checkout=success$/);
    const price = state.calls.find((c) => c.path === "/v1/prices" && c.method === "POST")!;
    expect(price.body).toMatchObject({ currency: "php", unit_amount: "249900", lookup_key: "gsp_broker_ph_month_2499", recurring: { interval: "month" } });
    const customer = state.calls.find((c) => c.path === "/v1/customers")!;
    expect(customer.body).toMatchObject({ email: ACCOUNTS.agent.email, metadata: { agentId: "a_agent" } });
    expect(customer.idempotencyKey).toBe("customer-a_agent");

    expect(await agentRow()).toEqual({ plan: "BROKER", subscriptionStatus: "active", planInterval: "month", stripeCustomerId: sub.customer });
    await page.goto("/dashboard/billing?checkout=success");
    await expect(page.locator("#plan-h")).toHaveText("Brokerage");
    await expect(page.getByText(/Thank you\. Your payment went through/)).toBeVisible();
    await expect(page.getByText(/₱2,499 a month before VAT\. Renews on /)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Pay / })).toHaveCount(0);
    const audit = await sql<{ after: { plan: string } }>(`SELECT after FROM "AuditLog" WHERE action = 'agent.plan_changed' AND "entityId" = 'a_agent' ORDER BY "createdAt" DESC LIMIT 1`);
    expect(audit[0].after.plan).toBe("BROKER");

    // The card fails: the plan stays while Stripe retries, with a warning
    await authServer.changeSubscription(sub.id, { status: "past_due" });
    expect((await webhook("invoice.payment_failed", { id: "in_1", object: "invoice", subscription: sub.id })).status).toBe(200);
    await page.reload();
    await expect(page.locator("main [role=alert]")).toContainText("Your last payment didn't go through.");
    await expect(page.locator("#plan-h")).toHaveText("Brokerage");

    // Manage billing opens Stripe's portal for this agent's own customer
    await page.getByRole("button", { name: "Manage billing" }).click();
    await page.waitForURL(new RegExp(`/__stripe/pages/portal/${sub.customer}$`));

    // Cancelled on Stripe: back to the launch offer's Pro
    await authServer.changeSubscription(sub.id, { status: "canceled" });
    expect((await webhook("customer.subscription.deleted", { id: sub.id, object: "subscription" })).status).toBe(200);
    expect(await agentRow()).toMatchObject({ plan: "STARTER", subscriptionStatus: "canceled", planInterval: null });
    await page.goto("/dashboard/billing");
    await expect(page.locator("#plan-h")).toHaveText("Pro");
  });

  test("webhooks must be signed with the site's secret, and a repeated event is handled once", async ({ page }) => {
    await signIn(page, ACCOUNTS.agent.email, ACCOUNTS.agent.password);
    const { sub } = await buyBrokerage(page);

    // Forged: signed with another secret, or not signed at all. Nothing changes.
    await authServer.changeSubscription(sub.id, { status: "canceled" });
    expect((await webhook("customer.subscription.deleted", { id: sub.id }, { secret: "whsec_attacker" })).status).toBe(400);
    const unsigned = await fetch(`${BASE_URL}/api/stripe/webhook`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: "evt_x", type: "customer.subscription.deleted", data: { object: { id: sub.id } } }),
    });
    expect(unsigned.status).toBe(400);
    expect((await agentRow()).plan).toBe("BROKER");

    // A subscription made for another agent can't be attached to this one
    await sql(`UPDATE "Agent" SET "stripeCustomerId" = 'cus_someone_else' WHERE id = 'a_uae'`);
    await authServer.changeSubscription(sub.id, { status: "active", metadata: { agentId: "a_uae", plan: "broker" } });
    expect((await webhook("customer.subscription.updated", { id: sub.id })).status).toBe(200);
    expect((await agentRow("a_uae")).plan).toBe("STARTER");

    // The same event delivered twice: the second is acknowledged and skipped
    await authServer.changeSubscription(sub.id, { status: "canceled", metadata: { agentId: "a_agent", plan: "broker" } });
    const first = await webhook("customer.subscription.deleted", { id: sub.id }, { id: "evt_replay_1" });
    expect(first.status).toBe(200);
    expect((await agentRow()).plan).toBe("STARTER");
    await authServer.changeSubscription(sub.id, { status: "active" });
    const again = await webhook("customer.subscription.deleted", { id: sub.id }, { id: "evt_replay_1" });
    expect(await again.json()).toEqual({ received: true, duplicate: true });
    expect((await agentRow()).plan).toBe("STARTER");
  });

  test("each plan has a live-listing limit, checked when publishing", async ({ page }) => {
    await signIn(page, ACCOUNTS.agent.email, ACCOUNTS.agent.password);
    // A draft with a photo, ready to publish
    const [src] = await sql<{ id: string }>(`SELECT id FROM "Property" WHERE "agentId" = 'a_agent' LIMIT 1`);
    await sql(
      `INSERT INTO "Property" SELECT (jsonb_populate_record(NULL::"Property", to_jsonb(p) || jsonb_build_object(
          'id', 'l_draft', 'slug', p.slug || '-draft', 'reference', 'GSP-LDRAFT', 'status', 'DRAFT', 'publishedAt', NULL, 'expiresAt', NULL))).*
         FROM "Property" p WHERE p.id = $1`, [src.id]);
    await sql(`INSERT INTO "PropertyMedia" (id, "propertyId", kind, "storageKey", width, height, "sortOrder") VALUES ('m_l_draft', 'l_draft', 'PHOTO', 'u_agent/l_draft/a.webp', 1200, 800, 0)`);
    // Fill the Pro plan's 25 live listings
    const [{ live }] = await sql<{ live: number }>(
      `SELECT count(*)::int AS live FROM "Property" WHERE "agentId" = 'a_agent' AND status = 'ACTIVE' AND "publishedAt" IS NOT NULL AND ("expiresAt" IS NULL OR "expiresAt" > now())`);
    await sql(
      `INSERT INTO "Property" SELECT (jsonb_populate_record(NULL::"Property", to_jsonb(p) || jsonb_build_object(
          'id', 'l_lim' || g, 'slug', p.slug || '-lim' || g, 'reference', 'GSP-LIM' || g, 'status', 'ACTIVE', 'publishedAt', now(), 'expiresAt', NULL))).*
         FROM "Property" p, generate_series(1, $2::int) g WHERE p.id = $1`, [src.id, 25 - live]);

    await page.goto("/dashboard/listings/l_draft");
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Your Pro plan includes 25 live listings. Pause or close one, or change your plan in Billing, to publish this one.")).toBeVisible();
    expect((await sql<{ status: string }>(`SELECT status::text FROM "Property" WHERE id = 'l_draft'`))[0].status).toBe("DRAFT");
    await page.goto("/dashboard/billing");
    await expect(page.getByText("25 of 25")).toBeVisible();

    // Brokerage has room for 100
    await buyBrokerage(page);
    await page.goto("/dashboard/listings/l_draft");
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Your Pro plan includes")).toHaveCount(0);
    await expect.poll(async () => (await sql<{ status: string }>(`SELECT status::text FROM "Property" WHERE id = 'l_draft'`))[0].status).toBe("ACTIVE");
  });

  test("a UAE broker pays in dirhams, and Pro cannot be bought during the launch offer", async ({ page }) => {
    await signIn(page, ACCOUNTS.uae.email, ACCOUNTS.uae.password);
    await page.goto("/dashboard/billing");
    await expect(page.getByRole("button", { name: "Pay AED 999 a month" })).toBeVisible();
    await expect(page.getByRole("button", { name: /AED 299/ })).toHaveCount(0);
    await expect(page.getByText("Pro is free until 31 March 2027; there is nothing to pay for it yet.")).toBeVisible();
    await page.getByRole("button", { name: "Pay AED 9,990 a year" }).click();
    await page.waitForURL(/\/__stripe\/pages\/checkout\/cs_test_\d+$/);
    const price = (await authServer.stripe()).calls.find((c) => c.path === "/v1/prices" && c.method === "POST")!;
    expect(price.body).toMatchObject({ currency: "aed", unit_amount: "999000", lookup_key: "gsp_broker_ae_year_9990", recurring: { interval: "year" } });
  });
});
