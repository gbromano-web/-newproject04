// Indicative exchange rates for showing peso prices to international buyers.
//
// Source: Bangko Sentral ng Pilipinas reference rates bulletin, 23 October 2026
// (as published at https://taxcalculator.com.ph/exchange-rates). Values are
// pesos per 1 unit of foreign currency.
//
// Production: refresh daily from the BSP bulletin or a rates API in a cron job
// and store them in the database; these constants are the seed/fallback.

export const RATES_AS_OF = "2026-10-23";
export const RATES_SOURCE = "Bangko Sentral ng Pilipinas reference rates";

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  /** pesos per 1 unit */
  phpPerUnit: number;
  locale: string;
  /** no decimals and compact steps suited to large values */
  minorUnits?: number;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: "PHP", symbol: "₱", name: "Philippine peso", phpPerUnit: 1, locale: "en-PH" },
  { code: "USD", symbol: "US$", name: "US dollar", phpPerUnit: 63.419, locale: "en-US" },
  { code: "SGD", symbol: "S$", name: "Singapore dollar", phpPerUnit: 49.6469, locale: "en-SG" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong dollar", phpPerUnit: 8.0935, locale: "en-HK" },
  { code: "JPY", symbol: "¥", name: "Japanese yen", phpPerUnit: 0.4045, locale: "ja-JP" },
  { code: "KRW", symbol: "₩", name: "South Korean won", phpPerUnit: 0.04788, locale: "ko-KR" },
  { code: "CNY", symbol: "CN¥", name: "Chinese yuan", phpPerUnit: 9.5012, locale: "zh-CN" },
  { code: "AUD", symbol: "A$", name: "Australian dollar", phpPerUnit: 44.5075, locale: "en-AU" },
  { code: "CAD", symbol: "C$", name: "Canadian dollar", phpPerUnit: 45.2896, locale: "en-CA" },
  { code: "EUR", symbol: "€", name: "Euro", phpPerUnit: 71.1498, locale: "de-DE" },
  { code: "GBP", symbol: "£", name: "British pound", phpPerUnit: 84.9815, locale: "en-GB" },
  { code: "AED", symbol: "AED ", name: "UAE dirham", phpPerUnit: 17.2667, locale: "en-AE" },
  { code: "SAR", symbol: "SAR ", name: "Saudi riyal", phpPerUnit: 16.9036, locale: "en-SA" },
];

const getCurrency = (code: string) => CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];

/** Round to 3 significant figures so conversions read as estimates, not quotes. */
function roughly(n: number) {
  if (n === 0) return 0;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(n))) - 2);
  return Math.round(n / mag) * mag;
}

/**
 * Converted, rounded price for display next to the listing's own price.
 *   convertPrice(18_600_000, "PHP", "USD") -> "≈ US$293K"
 *   convertPrice(2_450_000, "AED", "USD")  -> "≈ US$667K"
 *   convertPrice(45_000, "PHP", "PHP")     -> null (same currency)
 * AED goes through the peso table; the dirham is pegged to the US dollar,
 * so AED→USD stays consistent with the BSP cross rate.
 */
export function convertPrice(amount: number, from: string, code: string) {
  const c = getCurrency(code);
  if (c.code === from) return null;
  const php = amount * getCurrency(from).phpPerUnit;
  const v = roughly(php / c.phpPerUnit);
  const abs = Math.abs(v);
  let s: string;
  if (abs >= 1e9) s = `${+(v / 1e9).toPrecision(3)}B`;
  else if (abs >= 1e6) s = `${+(v / 1e6).toPrecision(3)}M`;
  else if (abs >= 1e4) s = `${+(v / 1e3).toPrecision(3)}K`;
  else s = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(v);
  return `≈ ${c.symbol}${s}`;
}

/** Peso price in another currency (kept for existing callers). */
export const convertPeso = (php: number, code: string) => convertPrice(php, "PHP", code);
