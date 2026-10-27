import type { Metadata } from "next";
import { AmortizationCalculator } from "@/components/ph/amortization-calculator";

export const metadata: Metadata = {
  title: "Pag-IBIG and bank housing loan calculator",
  description: "Estimate your monthly amortization for a Pag-IBIG or bank housing loan in the Philippines, using published rates by fixing period.",
};

export default function CalculatorPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-bold leading-tight text-sea-950 sm:text-[44px]">Pag-IBIG or bank financing?</h1>
      <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-ink-soft">
        Enter a property price to compare monthly amortization. To get an exact quote, open a listing and request a sample computation from its agent.
      </p>
      <div className="mt-10">
        <AmortizationCalculator price={5_000_000} editablePrice canRequest={false} />
      </div>
    </div>
  );
}
