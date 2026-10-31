// UAE mortgage estimate: loan-to-value caps (UAE Central Bank), advertised
// fixed rates and Dubai's buying fees. Rates change; the date and source are
// shown next to every estimate. General information, not financial advice.

import { monthlyAmortization } from "../ph/financing";

export type Buyer = "EXPAT" | "NATIONAL" | "NON_RESIDENT";

export const BUYER_LABEL: Record<Buyer, string> = {
  EXPAT: "UAE resident (expat)",
  NATIONAL: "UAE national",
  NON_RESIDENT: "Non-resident",
};

/**
 * Highest loan-to-value a bank may offer, in %.
 * Central Bank caps: first home under AED 5M 80% (expats and nationals);
 * AED 5M and above 65% expats, 70% nationals; second home 60% expats,
 * 65% nationals. Non-residents typically 50–60% (bank policy); most banks
 * cap off-plan at 50% of the value.
 */
export function maxLtv(price: number, buyer: Buyer, firstHome: boolean, offPlan: boolean): number {
  let ltv: number;
  if (buyer === "NON_RESIDENT") ltv = 50;
  else if (!firstHome) ltv = buyer === "NATIONAL" ? 65 : 60;
  else if (price < 5_000_000) ltv = 80;
  else ltv = buyer === "NATIONAL" ? 70 : 65;
  return offPlan ? Math.min(ltv, 50) : ltv;
}

export const UAE_RATES = {
  // Median and range of banks' lowest advertised fixed rates with salary transfer
  rates: [
    { fixingYears: 1, rate: 3.94, range: [3.75, 4.05] as [number, number] },
    { fixingYears: 2, rate: 3.99, range: [3.78, 3.99] as [number, number] },
    { fixingYears: 3, rate: 3.99, range: [3.95, 3.99] as [number, number] },
  ],
  defaultFixingYears: 2,
  maxTermYears: 25,
  asOf: "2026-09-21",
  source: { label: "Mortgease UAE Mortgage Rate Index", url: "https://mortgease.ae/mortgage-rate-index/" },
  notes: [
    "Advertised rates assume your salary is paid into the bank; without a salary transfer, expect about 0.4 percentage points more.",
    "After the fixed period most loans move to a variable rate linked to EIBOR.",
  ],
};

/** Dubai Land Department transfer fee, % of the price, usually paid by the buyer */
export const DUBAI_TRANSFER_FEE_PERCENT = 4;
/** Dubai mortgage registration, % of the loan */
export const DUBAI_MORTGAGE_REGISTRATION_PERCENT = 0.25;
/** Debt-burden cap: all monthly repayments within 50% of gross monthly income */
export const DEBT_BURDEN_LIMIT = 0.5;

export interface UaeEstimate {
  ltv: number;
  loan: number;
  downpayment: number;
  monthly: number;
  rate: number;
  incomeNeeded: number;
  transferFee: number | null;
  mortgageRegistration: number | null;
}

export function uaeEstimate(opts: {
  price: number;
  downpaymentPercent: number;
  buyer: Buyer;
  firstHome: boolean;
  offPlan: boolean;
  fixingYears: number;
  termYears: number;
  emirate?: string;
}): UaeEstimate {
  const ltv = maxLtv(opts.price, opts.buyer, opts.firstHome, opts.offPlan);
  // The buyer's chosen downpayment, but never below what the LTV cap requires
  const downPct = Math.max(opts.downpaymentPercent, 100 - ltv);
  const loan = opts.price * (1 - downPct / 100);
  const rate = UAE_RATES.rates.find((r) => r.fixingYears === opts.fixingYears)?.rate ?? UAE_RATES.rates[0].rate;
  const term = Math.min(opts.termYears, UAE_RATES.maxTermYears);
  const monthly = monthlyAmortization(loan, rate, term);
  const dubai = opts.emirate === "Dubai";
  return {
    ltv,
    loan,
    downpayment: opts.price - loan,
    monthly,
    rate,
    incomeNeeded: monthly / DEBT_BURDEN_LIMIT,
    transferFee: dubai ? (opts.price * DUBAI_TRANSFER_FEE_PERCENT) / 100 : null,
    mortgageRegistration: dubai && loan > 0 ? (loan * DUBAI_MORTGAGE_REGISTRATION_PERCENT) / 100 : null,
  };
}
