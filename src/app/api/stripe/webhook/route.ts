import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { billingEnabled, firstTimeEvent, forgetEvent, stripe, syncSubscription } from "@/lib/server/billing";
import { log, requestId } from "@/lib/server/request";

/**
 * Stripe webhook. Only requests signed with STRIPE_WEBHOOK_SECRET are accepted
 * (checked on the exact bytes received). Each event is handled once, and every
 * subscription change is re-read from Stripe before it is saved.
 *
 * Stripe dashboard → Developers → Webhooks: endpoint https://gosearchproperty.com/api/stripe/webhook
 * with the events below.
 */
const MAX_BYTES = 512 * 1024;

const subscriptionOf = (o: { subscription?: string | { id: string } | null }) =>
  typeof o.subscription === "string" ? o.subscription : o.subscription?.id ?? null;

export async function POST(req: Request) {
  const rid = requestId(req);
  if (!billingEnabled()) return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });
  const raw = await req.text();
  if (raw.length > MAX_BYTES) return NextResponse.json({ error: "Too large." }, { status: 413 });

  let event: Stripe.Event;
  try {
    event = stripe()!.webhooks.constructEvent(raw, req.headers.get("stripe-signature") ?? "", process.env.STRIPE_WEBHOOK_SECRET!, 300);
  } catch {
    log("warn", "billing.webhook_bad_signature", { requestId: rid });
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (!(await firstTimeEvent(event.id, event.type))) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    let subscriptionId: string | null = null;
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.mode === "subscription") subscriptionId = subscriptionOf(s as unknown as { subscription: string | { id: string } | null });
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed":
        subscriptionId = (event.data.object as Stripe.Subscription).id;
        break;
      case "invoice.paid":
      case "invoice.payment_failed": {
        const inv = event.data.object as unknown as { subscription?: string | { id: string } | null; parent?: { subscription_details?: { subscription?: string } } };
        subscriptionId = subscriptionOf(inv) ?? inv.parent?.subscription_details?.subscription ?? null;
        if (event.type === "invoice.payment_failed") log("warn", "billing.payment_failed", { requestId: rid, subscriptionId });
        break;
      }
    }
    if (subscriptionId) {
      const r = await syncSubscription(subscriptionId);
      log("info", "billing.synced", { requestId: rid, event: event.type, agentId: r?.agentId ?? null, plan: r?.plan ?? null, status: r?.status ?? null });
    }
  } catch (e) {
    // Let Stripe retry: the event isn't marked as handled
    await forgetEvent(event.id);
    log("error", "billing.webhook_failed", { requestId: rid, event: event.type, error: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "Temporary failure." }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
