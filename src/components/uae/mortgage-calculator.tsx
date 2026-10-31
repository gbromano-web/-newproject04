"use client";

import { useState } from "react";
import { Calculator, Info, Send } from "lucide-react";
import clsx from "clsx";
import { formatMoney } from "@/lib/ph/format";
import { BUYER_LABEL, UAE_RATES, maxLtv, uaeEstimate, type Buyer } from "@/lib/uae/financing";
import { COMPUTATION_EVENT, type ComputationRequest } from "../ph/amortization-calculator";
import { ConvertedPrice } from "../ph/currency";

const aed = (n: number) => formatMoney(Math.round(n), "AED", { compact: false });

/**
 * UAE mortgage estimate with the Central Bank's loan-to-value caps, advertised
 * fixed rates and, in Dubai, the DLD transfer fee. "Request sample
 * computation" hands the figures to the agent contact form on the page.
 */
export function UaeMortgageCalculator({
  price: initialPrice,
  emirate,
  offPlan = false,
  editablePrice = false,
  canRequest = true,
}: {
  price: number;
  emirate?: string;
  offPlan?: boolean;
  editablePrice?: boolean;
  canRequest?: boolean;
}) {
  const [price, setPrice] = useState(initialPrice);
  const [buyer, setBuyer] = useState<Buyer>("EXPAT");
  const [firstHome, setFirstHome] = useState(true);
  const [down, setDown] = useState(20);
  const [fixing, setFixing] = useState(UAE_RATES.defaultFixingYears);
  const [term, setTerm] = useState(25);

  const ltv = maxLtv(price, buyer, firstHome, offPlan);
  const minDown = 100 - ltv;
  const downPct = Math.max(down, minDown);
  const e = uaeEstimate({ price, downpaymentPercent: downPct, buyer, firstHome, offPlan, fixingYears: fixing, termYears: term, emirate });
  const rateInfo = UAE_RATES.rates.find((r) => r.fixingYears === fixing);

  const request = () => {
    const detail: ComputationRequest = { financingType: "BANK", price, downpaymentPercent: Math.round(downPct), fixingYears: fixing, termYears: term, monthly: Math.round(e.monthly), rate: e.rate };
    window.dispatchEvent(new CustomEvent(COMPUTATION_EVENT, { detail }));
    document.getElementById("inquire")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const label = "text-sm font-semibold text-ink";
  const control = "mt-2 h-11 w-full appearance-none rounded-xl bg-mist px-3.5 text-sm font-semibold text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-lagoon-500";

  return (
    <section aria-labelledby="uae-calc-heading" className="overflow-hidden rounded-3xl ring-1 ring-line">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-sand-50 px-6 py-5">
        <h2 id="uae-calc-heading" className="flex items-center gap-2 text-xl font-bold text-sea-950"><Calculator className="size-5 text-mango-700" /> Mortgage estimate</h2>
        <p className="text-sm font-semibold text-sea-900">Up to {ltv}% financing</p>
      </div>

      <div className="grid gap-8 p-6 md:grid-cols-[1fr_0.9fr]">
        <div className="space-y-5">
          {editablePrice && (
            <label className="block">
              <span className={label}>Property price (AED)</span>
              <input type="number" min={0} step={50_000} value={price} onChange={(ev) => setPrice(Math.max(0, Number(ev.target.value)))} className={control} />
            </label>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={label}>You are</span>
              <select value={buyer} onChange={(ev) => setBuyer(ev.target.value as Buyer)} className={control}>
                {(Object.keys(BUYER_LABEL) as Buyer[]).map((b) => <option key={b} value={b}>{BUYER_LABEL[b]}</option>)}
              </select>
            </label>
            <label className="block">
              <span className={label}>This home is</span>
              <select value={firstHome ? "1" : "0"} onChange={(ev) => setFirstHome(ev.target.value === "1")} disabled={buyer === "NON_RESIDENT"} className={clsx(control, "disabled:opacity-60")}>
                <option value="1">My first home</option>
                <option value="0">A second home or investment</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="flex items-baseline justify-between">
              <span className={label}>Downpayment</span>
              <span className="price text-sm font-semibold text-sea-900">{downPct}%, {aed(price * (downPct / 100))}</span>
            </span>
            <input type="range" min={minDown} max={70} step={5} value={downPct} onChange={(ev) => setDown(Number(ev.target.value))} className="mt-3 w-full accent-[var(--color-sea-900)]" aria-label="Downpayment percent" />
            <span className="mt-1 block text-xs text-ink-soft">At least {minDown}% for this purchase.</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={label}>Rate fixed for</span>
              <select value={fixing} onChange={(ev) => setFixing(Number(ev.target.value))} className={control}>
                {UAE_RATES.rates.map((r) => (
                  <option key={r.fixingYears} value={r.fixingYears}>{r.fixingYears} {r.fixingYears === 1 ? "year" : "years"}, {r.rate}%</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={label}>Loan term</span>
              <select value={term} onChange={(ev) => setTerm(Number(ev.target.value))} className={control}>
                {[10, 15, 20, 25].map((y) => <option key={y} value={y}>{y} years</option>)}
              </select>
            </label>
          </div>
          {rateInfo && <p className="text-xs text-ink-soft">Lowest advertised rates range from {rateInfo.range[0]}% to {rateInfo.range[1]}% for this fixed period.</p>}
        </div>

        <div className="flex flex-col rounded-2xl bg-sea-950 p-6 text-white">
          <p className="text-sm text-white/70">Estimated monthly payment</p>
          <p className="price mt-1 text-4xl font-bold">{aed(e.monthly)}</p>
          <ConvertedPrice amount={e.monthly} from="AED" className="price mt-1 text-sm text-white/60" />
          <dl className="mt-5 space-y-2 border-t border-white/15 pt-4 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-white/70">Loan amount</dt><dd className="price font-semibold">{aed(e.loan)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-white/70">Interest rate</dt><dd className="font-semibold">{e.rate}% a year</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-white/70">Income to aim for</dt><dd className="price font-semibold">{aed(e.incomeNeeded)}/mo</dd></div>
            {e.transferFee !== null && <div className="flex justify-between gap-3"><dt className="text-white/70">DLD transfer fee (4%)</dt><dd className="price font-semibold">{aed(e.transferFee)}</dd></div>}
            {e.mortgageRegistration !== null && <div className="flex justify-between gap-3"><dt className="text-white/70">Mortgage registration (0.25%)</dt><dd className="price font-semibold">{aed(e.mortgageRegistration)}</dd></div>}
          </dl>
          {offPlan && (
            <p className="mt-4 flex gap-2 rounded-xl bg-white/10 p-3 text-xs leading-relaxed text-white/85">
              <Info className="mt-0.5 size-4 shrink-0" />
              Off-plan: most banks lend at most 50%, and some only at handover. Check the developer&apos;s payment plan with the agent.
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
        Estimate only, not a loan offer. Financing limits follow the UAE Central Bank&apos;s loan-to-value caps; banks may lend less. {UAE_RATES.notes.join(" ")} &ldquo;Income to aim for&rdquo; keeps all repayments within 50% of gross monthly income, the Central Bank&apos;s debt-burden limit.
        {emirate === "Dubai" ? " Dubai fees exclude admin, trustee and bank charges." : " Transfer fees differ by emirate; confirm them with the land department or the agent."} Rates as of {UAE_RATES.asOf}, from{" "}
        <a href={UAE_RATES.source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-sea-900">{UAE_RATES.source.label}</a>.
      </p>
    </section>
  );
}
