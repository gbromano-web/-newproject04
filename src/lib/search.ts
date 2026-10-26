import { properties } from "./mock-data";
import type { Property, Purpose } from "./types";

export interface SearchFilters {
  purpose: Purpose;
  location?: string;
  type?: string;
  beds?: string; // "0" (studio) ... "5" (5+)
  minPrice?: number;
  maxPrice?: number;
  q?: string;
  sort?: "featured" | "newest" | "price-asc" | "price-desc";
}

type RawParams = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const num = (v: string | undefined) => (v && !Number.isNaN(Number(v)) ? Number(v) : undefined);

export function parseFilters(raw: RawParams): SearchFilters {
  const purpose = one(raw.purpose) === "buy" ? "buy" : "rent";
  return {
    purpose,
    location: one(raw.location) || undefined,
    type: one(raw.type) || undefined,
    beds: one(raw.beds) || undefined,
    minPrice: num(one(raw.minPrice)),
    maxPrice: num(one(raw.maxPrice)),
    q: one(raw.q) || undefined,
    sort: (one(raw.sort) as SearchFilters["sort"]) || "featured",
  };
}

/** Yearly-equivalent price so monthly and yearly rents filter on the same scale. */
export const annualPrice = (p: Property) => (p.rentFrequency === "monthly" ? p.price * 12 : p.price);

/**
 * Demo implementation over in-memory data. In production this becomes a
 * Typesense query: filter_by purpose/type/beds/price, geo filter for the map
 * viewport, and the location text matched against the city > community >
 * sub-community fields.
 */
export function searchProperties(f: SearchFilters): Property[] {
  const loc = f.location?.toLowerCase();
  const q = f.q?.toLowerCase();
  const results = properties.filter((p) => {
    if (p.purpose !== f.purpose) return false;
    if (f.type && p.type !== f.type) return false;
    if (f.beds) {
      const b = Number(f.beds);
      if (b >= 5 ? p.bedrooms < 5 : p.bedrooms !== b) return false;
    }
    if (f.minPrice && annualPrice(p) < f.minPrice) return false;
    if (f.maxPrice && annualPrice(p) > f.maxPrice) return false;
    if (loc) {
      const hay = [p.location.city, p.location.community, p.location.subCommunity ?? ""].join(" ").toLowerCase();
      if (!hay.includes(loc)) return false;
    }
    if (q) {
      const hay = [p.title, p.description, ...p.amenities].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const sorters: Record<string, (a: Property, b: Property) => number> = {
    featured: (a, b) => Number(b.featured) - Number(a.featured) || b.listedAt.localeCompare(a.listedAt),
    newest: (a, b) => b.listedAt.localeCompare(a.listedAt),
    "price-asc": (a, b) => annualPrice(a) - annualPrice(b),
    "price-desc": (a, b) => annualPrice(b) - annualPrice(a),
  };
  return results.sort(sorters[f.sort ?? "featured"]);
}

export function formatAED(n: number) {
  return new Intl.NumberFormat("en-AE", { maximumFractionDigits: 0 }).format(n);
}

/** Compact price for map pins: 185K, 6.85M */
export function compactPrice(n: number) {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

export function priceSuffix(p: Property) {
  if (p.purpose === "buy") return "";
  return p.rentFrequency === "monthly" ? "/month" : "/year";
}

export const bedsLabel = (b: number) => (b === 0 ? "Studio" : `${b} bed${b > 1 ? "s" : ""}`);

export const typeLabel: Record<string, string> = {
  apartment: "Apartment",
  villa: "Villa",
  townhouse: "Townhouse",
  penthouse: "Penthouse",
};
