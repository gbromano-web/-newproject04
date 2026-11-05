import type { CountryCode } from "@/lib/markets";

/**
 * Agent plans shown on /pricing (Philippines) and /uae/pricing.
 * Change prices, limits or the launch offer here; both pages read this file.
 *
 * Plans are priced and charged in US dollars, with a separate price list per
 * country (Philippine agents can't pay UAE prices, and UAE prices at Philippine
 * levels would undersell the market). Amounts are whole dollars before VAT.
 *
 * Benchmarks when set (November 2026):
 * - Philippines: Lamudi Pro about PHP 999 (about US$17) a month for 10 listings, with a free basic tier.
 * - UAE: no public rate cards; brokerages report AED 2,500-15,000+ (about US$680-4,100) per office
 *   per month on Property Finder or Bayut (subscription plus listing credits).
 * Prices here sit below both, to win agents while the portal is new.
 *
 * Agents pay through Stripe (src/lib/server/billing.ts, /dashboard/billing). The live
 * listing limit is enforced when publishing; featured placement and extra agent seats
 * are still arranged by the team (Agency / Property."isFeatured"). During the launch
 * offer every verified agent gets Pro free. See docs/PLAYBOOK.md 3.18 and 3.19.
 */

export type PlanId = "starter" | "pro" | "broker";

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  /** US dollars per month, before VAT. 0 = free. */
  monthly: number;
  /** US dollars per year, before VAT (two months free). */
  yearly: number;
  listings: number;
  featuredPerMonth: number;
  seats: number;
  highlight?: boolean;
  cta: { label: string; href: string };
  includes: string[];
}

export const LAUNCH_OFFER = {
  /** Last day of the launch offer (inclusive). */
  until: "2027-03-31",
  label: "31 March 2027",
};

export const VAT = { PH: 12, AE: 5 } as const satisfies Record<CountryCode, number>;

/** Currency every plan is charged in (Stripe). */
export const PLAN_CURRENCY = { code: "usd", label: "US dollars (USD)" } as const;

export const PLANS: Record<CountryCode, Plan[]> = {
  PH: [
    {
      id: "starter",
      name: "Starter",
      tagline: "For a licensed agent trying the portal",
      monthly: 0,
      yearly: 0,
      listings: 3,
      featuredPerMonth: 0,
      seats: 1,
      cta: { label: "Create a free account", href: "/agent/sign-up" },
      includes: ["Verified PRC or DHSUD badge", "Viber, WhatsApp and inquiry leads", "Listing editor with up to 30 photos", "Lead dashboard"],
    },
    {
      id: "pro",
      name: "Pro",
      tagline: "For full-time brokers and salespersons",
      monthly: 14,
      yearly: 140,
      listings: 25,
      featuredPerMonth: 2,
      seats: 1,
      highlight: true,
      cta: { label: "Start Pro free", href: "/agent/sign-up" },
      includes: ["Everything in Starter", "2 featured listings a month, shown first in search", "Email support"],
    },
    {
      id: "broker",
      name: "Brokerage",
      tagline: "For a broker with a team of salespersons",
      monthly: 44,
      yearly: 440,
      listings: 100,
      featuredPerMonth: 10,
      seats: 5,
      cta: { label: "Get Brokerage", href: "/dashboard/billing" },
      includes: ["Everything in Pro", "Up to 5 agents under one PRC broker", "10 featured listings a month", "Priority support"],
    },
  ],
  AE: [
    {
      id: "starter",
      name: "Starter",
      tagline: "For a registered broker trying the portal",
      monthly: 0,
      yearly: 0,
      listings: 3,
      featuredPerMonth: 0,
      seats: 1,
      cta: { label: "Create a free account", href: "/agent/sign-up" },
      includes: ["Verified broker registration (BRN) badge", "WhatsApp and inquiry leads", "Listing editor with up to 30 photos", "Lead dashboard"],
    },
    {
      id: "pro",
      name: "Pro",
      tagline: "For full-time brokers",
      monthly: 79,
      yearly: 790,
      listings: 25,
      featuredPerMonth: 2,
      seats: 1,
      highlight: true,
      cta: { label: "Start Pro free", href: "/agent/sign-up" },
      includes: ["Everything in Starter", "2 featured listings a month, shown first in search", "Email support"],
    },
    {
      id: "broker",
      name: "Brokerage",
      tagline: "For an office with several brokers",
      monthly: 269,
      yearly: 2690,
      listings: 100,
      featuredPerMonth: 10,
      seats: 5,
      cta: { label: "Get Brokerage", href: "/dashboard/billing" },
      includes: ["Everything in Pro", "Up to 5 brokers under one office (ORN)", "10 featured listings a month", "Priority support"],
    },
  ],
};

/** "$44" or "$2,690" (US dollars); 0 is "Free". The country is kept for callers; every plan is in USD. */
export function planPrice(amount: number, _country?: CountryCode): string {
  if (amount === 0) return "Free";
  return `$${amount.toLocaleString("en-US")}`;
}
