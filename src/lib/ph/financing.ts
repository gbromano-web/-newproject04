// Indicative home-loan figures for the amortization calculator.
// In production these come from the FinancingProgram table (prisma/schema.prisma),
// edited by admins from the published sources below. Rates change; always show
// the date and source next to any estimate.

export type FinancingKind = "PAGIBIG" | "BANK";

export interface RateOption {
  fixingYears: number;
  rate: number; // % per year
  range?: [number, number]; // for banks: lowest and highest seen across major banks
}

export interface FinancingProgramInfo {
  kind: FinancingKind;
  name: string;
  maxTermYears: number;
  maxLoan?: number; // pesos
  /** Only where a source states it */
  maxLtvPercent?: number;
  defaultFixingYears: number;
  rates: RateOption[];
  asOf: string;
  source: { label: string; url: string };
  notes: string[];
}

const PAGIBIG: FinancingProgramInfo = {
  kind: "PAGIBIG",
  name: "Pag-IBIG Fund housing loan",
  maxTermYears: 30,
  maxLoan: 6_000_000,
  defaultFixingYears: 3,
  rates: [
    { fixingYears: 1, rate: 5.75 },
    { fixingYears: 3, rate: 6.25 },
    { fixingYears: 5, rate: 6.5 },
    { fixingYears: 10, rate: 7.125 },
    { fixingYears: 15, rate: 7.75 },
    { fixingYears: 20, rate: 8.5 },
    { fixingYears: 25, rate: 9.125 },
    { fixingYears: 30, rate: 9.75 },
  ],
  asOf: "2026-09-21",
  source: { label: "PhilNews, Pag-IBIG housing loan interest rate 2026", url: "https://philnews.ph/2026/09/21/pag-ibig-housing-loan-interest-rate-2026-heres-what-members-should-know" },
  notes: [
    "Pag-IBIG lends up to ₱6 million per member.",
    "Qualified first-time buyers of socialized housing may get a subsidised 3% rate under the 4PH program for loans up to ₱750,000.",
  ],
};

const BANK: FinancingProgramInfo = {
  kind: "BANK",
  name: "Bank housing loan",
  maxTermYears: 20,
  maxLtvPercent: 80,
  defaultFixingYears: 3,
  // Median of 12 major banks' indicative fixed rates, with the range across them
  rates: [
    { fixingYears: 1, rate: 6.625, range: [6.25, 7.0] },
    { fixingYears: 3, rate: 7.125, range: [6.75, 7.5] },
    { fixingYears: 5, rate: 7.375, range: [7.0, 7.75] },
    { fixingYears: 10, rate: 7.875, range: [7.5, 8.25] },
  ],
  asOf: "2026-04-16",
  source: { label: "Nook, home loan interest rates across Philippine banks", url: "https://go.nook.com.ph/refi/home-loan-interest-rate-philippines-2026-all-banks-compared" },
  notes: ["Most banks lend 70–80% of the appraised value, over up to 20 years."],
};

export const PROGRAMS = { PAGIBIG, BANK } as const;

/** Standard amortizing loan payment: P · r(1+r)^n / ((1+r)^n − 1) */
export function monthlyAmortization(principal: number, annualRatePercent: number, years: number) {
  if (principal <= 0) return 0;
  const r = annualRatePercent / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r * (1 + r) ** n) / ((1 + r) ** n - 1);
}

export interface Estimate {
  loan: number;
  cappedLoan: number;
  downpayment: number;
  monthly: number;
  rate: number;
  overCap: number; // pesos above the program's maximum loan, to add to the downpayment
  incomeNeeded: number; // rule of thumb: keep amortization within about 35% of gross monthly income
}

export function estimate(price: number, downpaymentPercent: number, kind: FinancingKind, fixingYears: number, termYears: number): Estimate {
  const program = PROGRAMS[kind];
  const rate = program.rates.find((r) => r.fixingYears === fixingYears)?.rate ?? program.rates[0].rate;
  const loan = price * (1 - downpaymentPercent / 100);
  const cappedLoan = program.maxLoan ? Math.min(loan, program.maxLoan) : loan;
  const overCap = loan - cappedLoan;
  const term = Math.min(termYears, program.maxTermYears);
  const monthly = monthlyAmortization(cappedLoan, rate, term);
  return {
    loan,
    cappedLoan,
    downpayment: price - cappedLoan,
    monthly,
    rate,
    overCap,
    incomeNeeded: monthly / 0.35,
  };
}
