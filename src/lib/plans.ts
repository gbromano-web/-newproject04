import type { CountryCode } from "@/lib/markets";

/**
 * Agent plans shown on /pricing (Philippines) and /uae/pricing.
 * Change prices, limits or the launch offer here; both pages read this file.
 *
 * Benchmarks when set (November 2026):
 * - Philippines: Lamudi Pro about PHP 999/month for 10 listings, with a free basic tier.
 * - UAE: no public rate cards; brokerages report AED 2,500-15,000+ per office per month on
 *   Property Finder or Bayut (subscription plus listing credits).
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
  /** Per month, before VAT. 0 = free. */
  monthly: number;
  /** Per year, before VAT (two months free). */
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
      monthly: 799,
      yearly: 7990,
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
      monthly: 2499,
      yearly: 24990,
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
      monthly: 299,
      yearly: 2990,
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
      monthly: 999,
      yearly: 9990,
      listings: 100,
      featuredPerMonth: 10,
      seats: 5,
      cta: { label: "Get Brokerage", href: "/dashboard/billing" },
      includes: ["Everything in Pro", "Up to 5 brokers under one office (ORN)", "10 featured listings a month", "Priority support"],
    },
  ],
};

/** "₱2,499" or "AED 999"; 0 is "Free". */
export function planPrice(amount: number, country: CountryCode): string {
  if (amount === 0) return "Free";
  const n = amount.toLocaleString("en-US");
  return country === "AE" ? `AED ${n}` : `₱${n}`;
}
