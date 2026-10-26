"use client";

import { useState } from "react";
import { formatAED } from "@/lib/search";

/** Standard amortising repayment: P * r(1+r)^n / ((1+r)^n - 1) */
export function monthlyRepayment(principal: number, annualRatePct: number, years: number) {
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r * (1 + r) ** n) / ((1 + r) ** n - 1);
}

export function MortgageCalculator({ price }: { price: number }) {
  // UAE defaults: 20% minimum down payment for expat buyers on homes up to AED 5M (25% above), max 25 years.
  const [downPct, setDownPct] = useState(price > 5_000_000 ? 25 : 20);
  const [rate, setRate] = useState(4.25);
  const [years, setYears] = useState(25);

  const loan = price * (1 - downPct / 100);
  const monthly = monthlyRepayment(loan, rate, years);
  const upfront = price * (downPct / 100) + price * 0.04 + loan * 0.0025 + price * 0.02;

  const row = "flex items-center justify-between text-sm";
  return (
    <section className="rounded-xl border border-line p-5">
      <h2 className="text-xl font-bold">Mortgage estimate</h2>
      <p className="mt-4 font-display text-3xl font-bold text-creek-700">
        AED {formatAED(Math.round(monthly))}<span className="ml-1 font-sans text-base font-medium text-ink-soft">/month</span>
      </p>
      <div className="mt-5 grid gap-5 sm:grid-cols-3">
        <label className="block text-sm font-semibold">
          Down payment: {downPct}%
          <input type="range" min={price > 5_000_000 ? 25 : 20} max={80} step={5} value={downPct} onChange={(e) => setDownPct(+e.target.value)} className="mt-2 w-full accent-creek-700" />
        </label>
        <label className="block text-sm font-semibold">
          Interest rate: {rate.toFixed(2)}%
          <input type="range" min={2.5} max={8} step={0.25} value={rate} onChange={(e) => setRate(+e.target.value)} className="mt-2 w-full accent-creek-700" />
        </label>
        <label className="block text-sm font-semibold">
          Term: {years} years
          <input type="range" min={5} max={25} step={1} value={years} onChange={(e) => setYears(+e.target.value)} className="mt-2 w-full accent-creek-700" />
        </label>
      </div>
      <div className="mt-5 space-y-2 border-t border-line pt-4">
        <div className={row}><span className="text-ink-soft">Loan amount</span><span className="font-semibold">AED {formatAED(Math.round(loan))}</span></div>
        <div className={row}><span className="text-ink-soft">Cash needed upfront</span><span className="font-semibold">AED {formatAED(Math.round(upfront))}</span></div>
        <p className="text-xs leading-relaxed text-ink-soft">Upfront cash includes the down payment, 4% DLD transfer fee, 0.25% mortgage registration and 2% agency fee. Estimate only; your bank sets the final terms.</p>
      </div>
    </section>
  );
}
