"use client";

import { useState } from "react";
import { Calculator, Info, Send } from "lucide-react";
import clsx from "clsx";
import { formatPeso } from "@/lib/ph/format";
import { PROGRAMS, estimate, type FinancingKind } from "@/lib/ph/financing";
import { ConvertedPrice } from "./currency";

export const COMPUTATION_EVENT = "gsp:sample-computation";

export interface ComputationRequest {
  financingType: FinancingKind;
  price: number;
  downpaymentPercent: number;
  fixingYears: number;
  termYears: number;
  monthly: number;
  rate: number;
}

const full = (n: number) => `₱${Math.round(n).toLocaleString("en-PH")}`;

/**
 * Monthly amortization for Pag-IBIG or bank financing, using the published
 * rates in src/lib/ph/financing.ts. "Request sample computation" hands the
 * inputs to the agent contact form on the page.
 */
export function AmortizationCalculator({ price: initialPrice, editablePrice = false, canRequest = true }: { price: number; editablePrice?: boolean; canRequest?: boolean }) {
  const [price, setPrice] = useState(initialPrice);
  const [kind, setKind] = useState<FinancingKind>(initialPrice * 0.8 <= 6_000_000 ? "PAGIBIG" : "BANK");
  const program = PROGRAMS[kind];
  const [down, setDown] = useState(20);
  const [fixing, setFixing] = useState(program.defaultFixingYears);
  const [term, setTerm] = useState(20);

  const switchKind = (k: FinancingKind) => {
    setKind(k);
    setFixing(PROGRAMS[k].defaultFixingYears);
    setTerm((t) => Math.min(t, PROGRAMS[k].maxTermYears));
  };

  const e = estimate(price, down, kind, fixing, term);
  const rateInfo = program.rates.find((r) => r.fixingYears === fixing);
  const effectiveDownPct = price > 0 ? (e.downpayment / price) * 100 : 0;

  const request = () => {
    const detail: ComputationRequest = { financingType: kind, price, downpaymentPercent: Math.round(effectiveDownPct), fixingYears: fixing, termYears: Math.min(term, program.maxTermYears), monthly: Math.round(e.monthly), rate: e.rate };
    window.dispatchEvent(new CustomEvent(COMPUTATION_EVENT, { detail }));
    document.getElementById("inquire")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const label = "text-sm font-semibold text-ink";
  const control = "mt-2 h-11 w-full appearance-none rounded-xl bg-mist px-3.5 text-sm font-semibold text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-lagoon-500";

  return (
    <section aria-labelledby="calc-heading" className="overflow-hidden rounded-3xl ring-1 ring-line">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-sand-50 px-6 py-5">
        <h2 id="calc-heading" className="flex items-center gap-2 text-xl font-bold text-sea-950"><Calculator className="size-5 text-mango-700" /> Monthly amortization</h2>
        <div role="tablist" aria-label="Financing" className="flex rounded-full bg-white p-1 ring-1 ring-line">
          {(["PAGIBIG", "BANK"] as const).map((k) => (
            <button key={k} role="tab" aria-selected={kind === k} onClick={() => switchKind(k)} className={clsx("rounded-full px-4 py-1.5 text-sm font-semibold transition-colors", kind === k ? "bg-sea-900 text-white" : "text-ink-soft hover:text-sea-900")}>
              {k === "PAGIBIG" ? "Pag-IBIG" : "Bank"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-8 p-6 md:grid-cols-[1fr_0.9fr]">
        <div className="space-y-5">
          {editablePrice && (
            <label className="block">
              <span className={label}>Property price</span>
              <input type="number" min={0} step={50_000} value={price} onChange={(ev) => setPrice(Math.max(0, Number(ev.target.value)))} className={control} />
            </label>
          )}
          <label className="block">
            <span className="flex items-baseline justify-between">
              <span className={label}>Downpayment</span>
              <span className="price text-sm font-semibold text-sea-900">{down}%, {full(price * (down / 100))}</span>
            </span>
            <input type="range" min={10} max={70} step={5} value={down} onChange={(ev) => setDown(Number(ev.target.value))} className="mt-3 w-full accent-[var(--color-sea-900)]" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={label}>Rate fixed for</span>
              <select value={fixing} onChange={(ev) => setFixing(Number(ev.target.value))} className={control}>
                {program.rates.map((r) => (
                  <option key={r.fixingYears} value={r.fixingYears}>
                    {r.fixingYears} {r.fixingYears === 1 ? "year" : "years"}, {r.rate}%
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={label}>Loan term</span>
              <select value={Math.min(term, program.maxTermYears)} onChange={(ev) => setTerm(Number(ev.target.value))} className={control}>
                {[5, 10, 15, 20, 25, 30].filter((y) => y <= program.maxTermYears).map((y) => (
                  <option key={y} value={y}>{y} years</option>
                ))}
              </select>
            </label>
          </div>
          {rateInfo?.range && (
            <p className="text-xs text-ink-soft">Typical across major banks; offers range from {rateInfo.range[0]}% to {rateInfo.range[1]}% for this fixing period.</p>
          )}
        </div>

        <div className="flex flex-col rounded-2xl bg-sea-950 p-6 text-white">
          <p className="text-sm text-white/70">Estimated monthly amortization</p>
          <p className="price mt-1 text-4xl font-bold">{full(e.monthly)}</p>
          <ConvertedPrice php={e.monthly} className="price mt-1 text-sm text-white/60" />
          <dl className="mt-5 space-y-2 border-t border-white/15 pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-white/70">Loan amount</dt><dd className="price font-semibold">{formatPeso(e.cappedLoan, { compact: false })}</dd></div>
            <div className="flex justify-between"><dt className="text-white/70">Interest rate</dt><dd className="font-semibold">{e.rate}% a year</dd></div>
            <div className="flex justify-between"><dt className="text-white/70">Income to aim for</dt><dd className="price font-semibold">{full(e.incomeNeeded)}/mo</dd></div>
          </dl>
          {e.overCap > 0 && (
            <p className="mt-4 flex gap-2 rounded-xl bg-white/10 p-3 text-xs leading-relaxed text-white/85">
              <Info className="mt-0.5 size-4 shrink-0" />
              Pag-IBIG lends up to ₱6M, so about {formatPeso(e.overCap)} more is needed upfront ({Math.round(effectiveDownPct)}% downpayment in total), or choose bank financing.
            </p>
          )}
          {canRequest && (
            <button onClick={request} className="mt-5 flex items-center justify-center gap-2 rounded-full bg-mango-500 px-5 py-3 text-sm font-bold text-sea-950 transition-colors hover:bg-mango-400">
              <Send className="size-4" /> Request sample computation
            </button>
          )}
        </div>
      </div>

      <p className="border-t border-line px-6 py-4 text-xs leading-relaxed text-ink-soft">
        Estimate only. Uses the rate for the chosen fixing period across the whole term; payments change when the rate reprices. {program.notes.join(" ")} Rates as of {program.asOf}, from{" "}
        <a href={program.source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-sea-900">{program.source.label}</a>. &ldquo;Income to aim for&rdquo; is a rule of thumb that keeps amortization near 35% of gross monthly income.
      </p>
    </section>
  );
}
