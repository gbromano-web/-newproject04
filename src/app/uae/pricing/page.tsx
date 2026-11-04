import type { Metadata } from "next";
import { PricingPage } from "@/components/pricing-page";

export const metadata: Metadata = {
  title: "Plans for brokers in the UAE",
  description: "List properties across all seven emirates on Go Search Property: a free Starter plan, Pro for full-time brokers and a Brokerage plan for offices. Prices in dirhams; Pro is free during the launch offer.",
  alternates: { canonical: "/uae/pricing" },
};

export default function Page() {
  return <PricingPage country="AE" />;
}
