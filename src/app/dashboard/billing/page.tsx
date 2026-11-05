import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import { SAMPLE_DATA } from "@/lib/ph/preview";
import { LAUNCH_OFFER, PLANS, VAT, planPrice } from "@/lib/plans";
import { getSession } from "@/lib/server/agent-session";
import { OVER_LIMIT_GRACE_DAYS, agentBilling, billingEnabled, checkoutOpen, effectivePlanOf, launchOfferActive, liveListingCount } from "@/lib/server/billing";
import { countryOfLicence } from "@/lib/server/listing-editor";
import { CheckoutButtons, ManageBilling } from "./billing-forms";

export const metadata: Metadata = { title: "Plan and billing", robots: { index: false, follow: false } };

const date = (d: Date) => new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "Asia/Dubai" }).format(d);

async function Billing({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const session = await getSession();
  if (!session?.agent) redirect("/dashboard");
  const { checkout } = await searchParams;
  const country = countryOfLicence(session.agent.licenseType);
  const verified = session.agent.verification === "VERIFIED";
  const billing = await agentBilling(session.agent.id);
  const { plan, source } = effectivePlanOf(billing, country, verified);
  const live = await liveListingCount(session.agent.id);
  const enabled = billingEnabled() && billing !== null;
  const open = enabled && (await checkoutOpen(country));
  const ae = country === "AE";
  const broker = PLANS[country].find((p) => p.id === "broker")!;
  const pro = PLANS[country].find((p) => p.id === "pro")!;
  const launch = launchOfferActive();

  return (
    <>
      <h1 className="text-2xl font-bold text-sea-950 sm:text-[32px]">Plan and billing</h1>

      {checkout === "success" && (
        <p role="status" className="mt-4 flex items-start gap-2 rounded-2xl bg-lagoon-50 px-4 py-3 text-sm text-lagoon-800 ring-1 ring-lagoon-600/20">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> Thank you. Your payment went through; your plan updates here within a minute.
        </p>
      )}
      {checkout === "cancelled" && <p role="status" className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-ink-soft ring-1 ring-line">Checkout was cancelled. Nothing was charged.</p>}
      {billing?.subscriptionStatus === "past_due" && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-2xl bg-mango-300/20 px-4 py-3 text-sm text-mango-700 ring-1 ring-mango-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> Your last payment didn&apos;t go through. Update your card in Manage billing to keep your plan.
        </p>
      )}

      {live > plan.listings && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-2xl bg-mango-300/20 px-4 py-3 text-sm text-mango-700 ring-1 ring-mango-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            You have {live} live listings and your {plan.name} plan includes {plan.listings}.{" "}
            {billing?.overLimitSince
              ? `On ${date(new Date(billing.overLimitSince.getTime() + OVER_LIMIT_GRACE_DAYS * 86_400_000))} your newest ${live - plan.listings} will be paused.`
              : `If that's still the case in ${OVER_LIMIT_GRACE_DAYS} days, your newest ${live - plan.listings} will be paused.`}{" "}
            Pause or close some, or choose a plan below. Paused listings are kept.
          </span>
        </p>
      )}

      <section className="mt-6 rounded-2xl bg-white p-6 ring-1 ring-line sm:p-8" aria-labelledby="plan-h">
        <p className="text-sm font-semibold text-ink-soft">Your plan</p>
        <h2 id="plan-h" className="mt-1 text-2xl font-bold text-sea-950">{plan.name}</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {source === "paid" && billing && (
            <>
              {planPrice(billing.planInterval === "year" ? plan.yearly : plan.monthly, country)} a {billing.planInterval ?? "month"} before VAT.{" "}
              {billing.planCancelsAt ? `Ends on ${date(billing.planCancelsAt)}.` : billing.planRenewsAt ? `Renews on ${date(billing.planRenewsAt)}.` : null}
            </>
          )}
          {source === "launch" && <>Free with the launch offer until {LAUNCH_OFFER.label}.</>}
          {source === "free" && (verified ? "The free plan." : "The free plan. Once your licence is verified you get Pro free during the launch offer.")}
        </p>
        <p className="mt-4 text-sm text-ink">
          <span className="font-semibold">{live} of {plan.listings}</span> live listings used
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-mist" aria-hidden>
          <div className="h-full rounded-full bg-lagoon-600" style={{ width: `${Math.min(100, Math.round((live / plan.listings) * 100))}%` }} />
        </div>
        {enabled && billing?.stripeCustomerId && (
          <div className="mt-6">
            <ManageBilling />
            <p className="mt-2 text-xs text-ink-soft">Change plan, update your card, download invoices or cancel, on Stripe&apos;s secure page.</p>
          </div>
        )}
      </section>

      {source !== "paid" && (
        <section className="mt-6 rounded-2xl bg-white p-6 ring-1 ring-line sm:p-8" aria-labelledby="up-h">
          <h2 id="up-h" className="text-lg font-bold text-sea-950">{launch ? "Brokerage plan" : "Choose a plan"}</h2>
          {launch && (
            <p className="mt-2 flex items-start gap-2 text-sm text-lagoon-800">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-lagoon-600" /> Pro is free until {LAUNCH_OFFER.label}; there is nothing to pay for it yet.
            </p>
          )}
          <ul className="mt-4 space-y-4">
            {[...(launch ? [] : [pro]), broker].map((p) => (
              <li key={p.id} className="rounded-2xl p-5 ring-1 ring-line">
                <p className="font-semibold text-sea-950">{p.name}</p>
                <p className="mt-1 text-sm text-ink-soft">
                  {p.listings} live listings, {p.featuredPerMonth} featured a month{p.seats > 1 ? `, up to ${p.seats} ${ae ? "brokers" : "agents"}` : ""}.
                </p>
                <div className="mt-4">
                  {enabled && !open ? (
                    <p className="text-sm text-ink-soft">Card payments are paused for your country at the moment. Your current plan is not affected. Please try again later or email us.</p>
                  ) : enabled ? (
                    <CheckoutButtons plan={p.id} monthly={planPrice(p.monthly, country)} yearly={planPrice(p.yearly, country)} />
                  ) : (
                    <p className="text-sm text-ink-soft">Online payments are not switched on yet. Email us and we will set up your plan.</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-ink-soft">
            Prices before VAT ({VAT[country]}% where it applies). Card payments are handled by Stripe; this site never sees your card.{" "}
            <Link href={ae ? "/uae/pricing" : "/pricing"} className="font-semibold text-sea-900 underline">Compare plans</Link>
          </p>
        </section>
      )}
    </>
  );
}

export default function BillingPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  if (SAMPLE_DATA) redirect("/dashboard");
  return (
    <div className="bg-mist/60">
      <div className="mx-auto max-w-[880px] px-4 py-8 sm:px-6">
        <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-sea-900 hover:text-lagoon-700">
          <ArrowLeft className="size-4" /> Dashboard
        </Link>
        <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-mist" />}>
          <Billing searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
