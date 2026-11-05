"use server";

import { redirect } from "next/navigation";
import { PLANS } from "@/lib/plans";
import { getSession } from "@/lib/server/agent-session";
import { agentBilling, billingEnabled, customerFor, effectivePlanOf, launchOfferActive, priceFor, stripe } from "@/lib/server/billing";
import { countryOfLicence } from "@/lib/server/listing-editor";
import { log, rateLimit } from "@/lib/server/request";

/**
 * Billing actions. The agent comes from the verified session, never from the
 * form; the form only says which plan and how often. Card details are entered
 * on Stripe's own pages.
 */

export type BillingState = { error?: string };

/** Stripe's error type and code only: its messages can repeat the customer's email. */
const stripeError = (e: unknown) => {
  const x = e as { type?: string; code?: string; statusCode?: number };
  return [x.type ?? (e instanceof Error ? e.name : "unknown"), x.code, x.statusCode].filter(Boolean).join(":");
};

const site = () => (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const OFF = "Online payments are not switched on yet. Email us and we will set up your plan.";
const BUSY = "Payments are not responding right now. Please try again in a few minutes.";

async function current() {
  const session = await getSession();
  if (!session?.agent) return null;
  const billing = await agentBilling(session.agent.id);
  if (!billing) return null;
  return { session, agent: session.agent, billing, country: countryOfLicence(session.agent.licenseType) };
}

export async function startCheckout(_: BillingState, form: FormData): Promise<BillingState> {
  if (!billingEnabled()) return { error: OFF };
  const me = await current();
  if (!me) return { error: "Your session has ended. Sign in again." };
  const planId = String(form.get("plan") ?? "");
  const interval = String(form.get("interval") ?? "");
  const plan = PLANS[me.country].find((p) => p.id === planId);
  if (!plan || plan.monthly === 0 || (interval !== "month" && interval !== "year")) return { error: "That plan isn't available." };
  if (plan.id === "pro" && launchOfferActive()) return { error: "Pro is free during the launch offer: there is nothing to pay yet." };
  const eff = effectivePlanOf(me.billing, me.country, me.billing.verified);
  if (eff.source === "paid") return { error: "You already have a paid plan. Use Manage billing to change it." };
  const limit = await rateLimit(`billing:checkout:${me.agent.id}`, 10, 60 * 60_000);
  if (!limit.ok) return { error: "Too many attempts. Please wait a few minutes." };

  let url: string | null = null;
  try {
    const customer = await customerFor(me.billing, me.session.email, me.agent.displayName);
    const price = await priceFor(me.country, plan, interval);
    const metadata = { agentId: me.agent.id, plan: plan.id, country: me.country };
    const checkout = await stripe()!.checkout.sessions.create({
      mode: "subscription",
      customer,
      client_reference_id: me.agent.id,
      line_items: [{ price, quantity: 1 }],
      metadata,
      subscription_data: { metadata },
      allow_promotion_codes: true,
      billing_address_collection: "required",
      customer_update: { address: "auto", name: "auto" },
      tax_id_collection: { enabled: true },
      ...(process.env.STRIPE_AUTOMATIC_TAX === "1" ? { automatic_tax: { enabled: true } } : {}),
      success_url: `${site()}/dashboard/billing?checkout=success`,
      cancel_url: `${site()}/dashboard/billing?checkout=cancelled`,
    });
    url = checkout.url;
    log("info", "billing.checkout_started", { agentId: me.agent.id, plan: plan.id, interval });
  } catch (e) {
    log("error", "billing.checkout_failed", { agentId: me.agent.id, error: stripeError(e) });
    return { error: BUSY };
  }
  if (!url) return { error: BUSY };
  redirect(url);
}

export async function openPortal(_: BillingState): Promise<BillingState> {
  if (!billingEnabled()) return { error: OFF };
  const me = await current();
  if (!me) return { error: "Your session has ended. Sign in again." };
  if (!me.billing.stripeCustomerId) return { error: "There is no billing account yet: choose a plan first." };
  let url: string;
  try {
    const portal = await stripe()!.billingPortal.sessions.create({ customer: me.billing.stripeCustomerId, return_url: `${site()}/dashboard/billing` });
    url = portal.url;
  } catch (e) {
    log("error", "billing.portal_failed", { agentId: me.agent.id, error: stripeError(e) });
    return { error: BUSY };
  }
  redirect(url);
}
