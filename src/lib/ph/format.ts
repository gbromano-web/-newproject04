// Philippine display formats for prices, areas and pre-selling turnover.
// Prices are stored as full pesos (Decimal) and only shortened for display.

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
  const n = typeof value === "number" ? value : Number(value.toString());
  if (!Number.isFinite(n)) return "₱—";
  const compact = opts.compact ?? true;
  const abs = Math.abs(n);
  if (compact && abs >= 1_000_000_000) return `₱${trimDecimals(n / 1_000_000_000, 2)}B`;
  if (compact && abs >= 1_000_000) return `₱${trimDecimals(n / 1_000_000, 2)}M`;
  return `₱${fullFmt.format(n)}`;
}

/** Rent with period suffix: ₱35,000/mo. Rents are never abbreviated below ₱1M. */
export function formatRent(value: number, period: RentPeriod) {
  return `${formatPeso(value)}${RENT_SUFFIX[period]}`;
}

/** Listing price label for any listing type. */
export function formatListingPrice(p: { price: number; listingType: string; rentPeriod?: RentPeriod | null }) {
  return p.listingType === "RENT" && p.rentPeriod ? formatRent(p.price, p.rentPeriod) : formatPeso(p.price);
}

/** ₱137,778/sqm */
export function formatPricePerSqm(value: number) {
  return `₱${fullFmt.format(Math.round(value))}/sqm`;
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
