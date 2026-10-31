// Listing search over the sample data. Production swaps the filter function
// for a Typesense query; the URL parameters stay the same, so every filter
// combination remains a shareable, crawlable link.

import { flattenLocations } from "./locations";
import { LISTINGS, PROPERTY_TYPE_LABEL, type ListingType, type PhListing, type PropertyType } from "./listings";

export type SortKey = "featured" | "newest" | "price-asc" | "price-desc";

export interface SearchFilters {
  type?: ListingType;
  location?: string;
  propertyType?: PropertyType;
  minPrice?: number;
  maxPrice?: number;
  beds?: number; // 0 = studio, 5 = 5+
  foreignEligible?: boolean;
  sort: SortKey;
}

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
// Finite, non-negative and within a sane ceiling; anything else is ignored
const num = (v?: string) => {
  if (v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 1e11 ? n : undefined;
};

const TYPES: ListingType[] = ["SALE", "RENT", "PRE_SELLING", "FORECLOSED"];
const SORTS: SortKey[] = ["featured", "newest", "price-asc", "price-desc"];

export function parseFilters(raw: Raw): SearchFilters {
  const type = one(raw.type) as ListingType | undefined;
  const propertyType = one(raw.propertyType) as PropertyType | undefined;
  const sort = one(raw.sort) as SortKey | undefined;
  return {
    type: type && TYPES.includes(type) ? type : undefined,
    location: one(raw.location)?.trim().slice(0, 100) || undefined,
    propertyType: propertyType && propertyType in PROPERTY_TYPE_LABEL ? propertyType : undefined,
    minPrice: num(one(raw.minPrice)),
    maxPrice: num(one(raw.maxPrice)),
    beds: num(one(raw.beds)),
    foreignEligible: one(raw.foreignEligible) === "1" || undefined,
    sort: sort && SORTS.includes(sort) ? sort : "featured",
  };
}

export function toQuery(f: Partial<SearchFilters>) {
  const p = new URLSearchParams();
  if (f.type) p.set("type", f.type);
  if (f.location) p.set("location", f.location);
  if (f.propertyType) p.set("propertyType", f.propertyType);
  if (f.minPrice !== undefined) p.set("minPrice", String(f.minPrice));
  if (f.maxPrice !== undefined) p.set("maxPrice", String(f.maxPrice));
  if (f.beds !== undefined) p.set("beds", String(f.beds));
  if (f.foreignEligible) p.set("foreignEligible", "1");
  if (f.sort && f.sort !== "featured") p.set("sort", f.sort);
  return p.toString();
}

const FLAT = flattenLocations();

/**
 * Resolve "BGC", "Metro Manila" or "Cebu" to the set of place names it covers:
 * the matched location plus everything beneath it in the tree.
 */
function resolveLocation(q: string): string[] {
  const needle = q.toLowerCase();
  const hit =
    FLAT.find((l) => l.name.toLowerCase() === needle || l.aliases.some((a) => a.toLowerCase() === needle)) ??
    FLAT.find((l) => l.name.toLowerCase().includes(needle));
  if (!hit) return [q];
  return FLAT.filter((l) => l.key === hit.key || l.key.startsWith(`${hit.key}/`)).map((l) => l.name);
}

function matchesLocation(l: PhListing, names: string[]) {
  const hay = `${l.locationLabel} | ${l.city} | ${l.province}`.toLowerCase();
  return names.some((n) => hay.includes(n.toLowerCase()));
}

export function searchListings(f: SearchFilters): PhListing[] {
  const names = f.location ? resolveLocation(f.location) : null;
  const out = LISTINGS.filter((l) => {
    if (f.type && l.listingType !== f.type) return false;
    if (f.propertyType && l.propertyType !== f.propertyType) return false;
    if (names && !matchesLocation(l, names)) return false;
    if (f.minPrice !== undefined && l.price < f.minPrice) return false;
    if (f.maxPrice !== undefined && l.price > f.maxPrice) return false;
    if (f.beds !== undefined) {
      if (l.bedrooms === undefined) return false;
      if (f.beds >= 5 ? l.bedrooms < 5 : l.bedrooms !== f.beds) return false;
    }
    if (f.foreignEligible && !(l.foreignBuyerEligible && l.listingType !== "RENT")) return false;
    return true;
  });
  const by: Record<SortKey, (a: PhListing, b: PhListing) => number> = {
    featured: (a, b) => Number(!!b.featured) - Number(!!a.featured) || b.listedAt.localeCompare(a.listedAt),
    newest: (a, b) => b.listedAt.localeCompare(a.listedAt),
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
  };
  return out.sort(by[f.sort]);
}

const TYPE_NOUN: Record<PropertyType, string> = {
  CONDOMINIUM: "Condominiums",
  TOWNHOUSE: "Townhouses",
  HOUSE_AND_LOT: "Houses and lots",
  LOT_ONLY: "Lots",
  COMMERCIAL: "Commercial properties",
  AGRICULTURAL: "Agricultural land",
  WAREHOUSE: "Warehouses",
};

/** "Condominiums for sale in Makati", "Pre-selling properties in Metro Manila" */
export function searchHeading(f: SearchFilters) {
  const noun = f.propertyType ? TYPE_NOUN[f.propertyType] : "Properties";
  const where = f.location ? ` in ${f.location}` : " in the Philippines";
  if (f.type === "PRE_SELLING") return `Pre-selling ${noun.toLowerCase()}${where}`;
  if (f.type === "FORECLOSED") return `Foreclosed ${noun.toLowerCase()}${where}`;
  if (f.type === "RENT") return `${noun} for rent${where}`;
  if (f.type === "SALE") return `${noun} for sale${where}`;
  return `${noun}${where}`;
}
