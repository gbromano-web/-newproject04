// Display formats for prices, areas and pre-selling turnover, per market.
// Prices are stored in full (pesos or dirhams) and only shortened for display.

import { marketOf, type CountryCode } from "../markets";

export type RentPeriod = "MONTHLY" | "YEARLY" | "DAILY";

const fullFmt = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 0 });

const RENT_SUFFIX: Record<RentPeriod, string> = { MONTHLY: "/mo", YEARLY: "/yr", DAILY: "/day" };

/** Trim to at most `digits` decimals without trailing zeros: 4.80 -> "4.8", 120.00 -> "120". */
function trimDecimals(n: number, digits: number) {
  return String(Number(n.toFixed(digits)));
}

/**
 * Smart peso formatting used on cards, pins and headings.
 *   35_000            -> "₱35,000"
 *   4_800_000         -> "₱4.8M"
 *   4_850_000         -> "₱4.85M"
 *   120_000_000       -> "₱120M"
 *   1_250_000_000     -> "₱1.25B"
 * Values below one million are always shown in full, since ₱850K reads oddly
 * for rents and lot prices in PH listings.
 */
export function formatPeso(value: number | string | { toString(): string }, opts: { compact?: boolean } = {}) {
  return formatMoney(value, "PHP", opts);
}

const SYMBOL = { PHP: "₱", AED: "AED " } as const;
export type Currency = keyof typeof SYMBOL;

/** ₱4.8M, AED 2.45M, AED 135,000. Values below one million are always shown in full. */
export function formatMoney(value: number | string | { toString(): string }, currency: Currency, opts: { compact?: boolean } = {}) {
  const sym = SYMBOL[currency];
  const n = typeof value === "number" ? value : Number(value.toString());
  if (!Number.isFinite(n)) return `${sym}—`;
  const compact = opts.compact ?? true;
  const abs = Math.abs(n);
  if (compact && abs >= 1_000_000_000) return `${sym}${trimDecimals(n / 1_000_000_000, 2)}B`;
  if (compact && abs >= 1_000_000) return `${sym}${trimDecimals(n / 1_000_000, 2)}M`;
  return `${sym}${fullFmt.format(n)}`;
}

/** Rent with period suffix: ₱35,000/mo, AED 135,000/yr. */
export function formatRent(value: number, period: RentPeriod, currency: Currency = "PHP") {
  return `${formatMoney(value, currency)}${RENT_SUFFIX[period]}`;
}

export const currencyOf = (l: { country?: CountryCode }) => marketOf(l.country).currency;

/** Listing price label for any listing type, in the listing's own currency. */
export function formatListingPrice(p: { price: number; listingType: string; rentPeriod?: RentPeriod | null; country?: CountryCode }) {
  const c = currencyOf(p);
  return p.listingType === "RENT" && p.rentPeriod ? formatRent(p.price, p.rentPeriod, c) : formatMoney(p.price, c);
}

/** ₱137,778/sqm */
export function formatPricePerSqm(value: number) {
  return `₱${fullFmt.format(Math.round(value))}/sqm`;
}

const SQFT_PER_SQM = 10.7639;

/** Area in the market's unit: "116 sqm" in the Philippines, "1,249 sqft" in the UAE. */
export function formatArea(sqm: number | null | undefined, country?: CountryCode) {
  if (sqm == null) return "";
  if (marketOf(country).areaUnit === "sqft") return `${new Intl.NumberFormat("en-AE", { maximumFractionDigits: 0 }).format(sqm * SQFT_PER_SQM)} sqft`;
  return formatSqm(sqm);
}

/** Price per area in the market's unit and currency: ₱137,778/sqm, AED 1,962/sqft. */
export function formatPricePerArea(price: number, sqm: number, country?: CountryCode) {
  const m = marketOf(country);
  if (m.areaUnit === "sqft") return `${SYMBOL[m.currency]}${fullFmt.format(Math.round(price / (sqm * SQFT_PER_SQM)))}/sqft`;
  return `${SYMBOL[m.currency]}${fullFmt.format(Math.round(price / sqm))}/sqm`;
}

/** 32 sqm, 32.5 sqm, 1,250 sqm */
export function formatSqm(value: number | null | undefined) {
  if (value == null) return "";
  return `${new Intl.NumberFormat("en-PH", { maximumFractionDigits: 1 }).format(value)} sqm`;
}

/** Q4 2029 */
export function formatTurnover(quarter?: number | null, year?: number | null) {
  if (!year) return "";
  return quarter ? `Q${quarter} ${year}` : String(year);
}

/** Bedroom label: Studio, 1 BR, 3 BR */
export function formatBedrooms(beds: number | null | undefined) {
  if (beds == null) return "";
  return beds === 0 ? "Studio" : `${beds} BR`;
}
