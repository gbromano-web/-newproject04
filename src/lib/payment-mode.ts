/**
 * Whether the site may take payments, and which kind. Kept free of server-only
 * imports so scripts/check-payments.mts can test it.
 *
 * Real payments (a live Stripe key) stay blocked unless BOTH:
 *   - LIVE_PAYMENTS_APPROVED=true in Vercel (the owner's switch), and
 *   - SITE.legalReviewed is true in src/lib/site.ts (set in a reviewed commit once
 *     the lawyer has approved the Terms, refund terms and Privacy notice).
 * A live key without both runs as "live_blocked": no checkout, no portal, and the
 * webhook answers 503, so Stripe holds its events until payments are approved.
 * Test keys (sk_test_) always run in test mode, where no real money moves.
 */
export type PaymentMode = "off" | "test" | "live" | "live_blocked";

export function paymentModeFor(env: { secretKey?: string; webhookSecret?: string; liveApproved?: string }, legalReviewed: boolean): PaymentMode {
  const key = env.secretKey ?? "";
  if (!key || !env.webhookSecret) return "off";
  if (/^(sk|rk)_test_/.test(key)) return "test";
  if (/^(sk|rk)_live_/.test(key)) return legalReviewed && env.liveApproved === "true" ? "live" : "live_blocked";
  return "off"; // anything else is not a Stripe key
}
