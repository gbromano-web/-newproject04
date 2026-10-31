import type { Metadata } from "next";
import { UaeMortgageCalculator } from "@/components/uae/mortgage-calculator";

export const metadata: Metadata = {
  title: "UAE mortgage calculator",
  description: "Estimate how much you can borrow under UAE Central Bank limits, your monthly payment at current advertised rates, and Dubai's transfer fee.",
  alternates: { canonical: "/uae/calculator" },
};

export default function UaeCalculatorPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-bold leading-tight text-sea-950 sm:text-[44px]">How much can you borrow?</h1>
      <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-ink-soft">
        Enter a property price to see your financing limit and monthly payment. For an exact quote, open a listing and request a sample computation from its broker.
      </p>
      <div className="mt-10">
        <UaeMortgageCalculator price={2_000_000} emirate="Dubai" editablePrice canRequest={false} />
      </div>
    </div>
  );
}
