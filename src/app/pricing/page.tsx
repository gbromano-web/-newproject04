import type { Metadata } from "next";
import { PricingPage } from "@/components/pricing-page";

export const metadata: Metadata = {
  title: "Plans for agents and brokers in the Philippines",
  description: "List properties on Go Search Property: a free Starter plan, Pro for full-time agents and a Brokerage plan for teams. Prices in pesos; Pro is free during the launch offer.",
  alternates: { canonical: "/pricing" },
};

export default function Page() {
  return <PricingPage country="PH" />;
}
