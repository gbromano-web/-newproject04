/**
 * Country calling codes for phone fields, and E.164 normalisation.
 * The two markets come first; the rest are where most overseas buyers and
 * agents call from (OFWs in the Gulf and Asia, expats in the UAE).
 */
export interface CallingCode {
  iso: string; // ISO 3166-1 alpha-2
  name: string;
  dial: string; // digits only, e.g. "63"
  /** National numbers drop this trunk prefix after the country code (0917… → +63 917…) */
  trunk?: string;
}

export const CALLING_CODES: CallingCode[] = [
  { iso: "PH", name: "Philippines", dial: "63", trunk: "0" },
  { iso: "AE", name: "United Arab Emirates", dial: "971", trunk: "0" },
  { iso: "SA", name: "Saudi Arabia", dial: "966", trunk: "0" },
  { iso: "QA", name: "Qatar", dial: "974" },
  { iso: "KW", name: "Kuwait", dial: "965" },
  { iso: "OM", name: "Oman", dial: "968" },
  { iso: "BH", name: "Bahrain", dial: "973" },
  { iso: "SG", name: "Singapore", dial: "65" },
  { iso: "HK", name: "Hong Kong", dial: "852" },
  { iso: "JP", name: "Japan", dial: "81", trunk: "0" },
  { iso: "KR", name: "South Korea", dial: "82", trunk: "0" },
  { iso: "IN", name: "India", dial: "91", trunk: "0" },
  { iso: "AU", name: "Australia", dial: "61", trunk: "0" },
  { iso: "GB", name: "United Kingdom", dial: "44", trunk: "0" },
  { iso: "US", name: "United States / Canada", dial: "1", trunk: "1" },
  { iso: "IT", name: "Italy", dial: "39" },
];

export const callingCode = (iso: string) => CALLING_CODES.find((c) => c.iso === iso) ?? CALLING_CODES[0];

/**
 * "+63" + "0917 123 4567" → "+639171234567". Returns "" for an empty number and
 * null when the result is not a plausible E.164 number (8 to 15 digits).
 */
export function toE164(iso: string, local: string): string | null | "" {
  const c = callingCode(iso);
  let digits = local.replace(/\D/g, "");
  if (!digits) return "";
  // Someone typed the full international number into the local box
  if (local.trim().startsWith("+") || digits.startsWith("00")) {
    digits = digits.replace(/^00/, "");
    return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null;
  }
  if (digits.startsWith(c.dial) && digits.length > c.dial.length + 6) digits = digits.slice(c.dial.length);
  if (c.trunk && digits.startsWith(c.trunk)) digits = digits.slice(c.trunk.length);
  const full = c.dial + digits;
  return /^[1-9]\d{7,14}$/.test(full) ? `+${full}` : null;
}
