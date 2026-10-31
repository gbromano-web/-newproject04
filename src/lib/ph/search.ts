// Listing search over the sample data. Production swaps the filter function
// for a Typesense query; the URL parameters stay the same, so every filter
// combination remains a shareable, crawlable link.

import { marketOf, type CountryCode } from "../markets";
import { locationsFor } from "./locations";
import { LISTINGS, PROPERTY_TYPE_LABEL, type ListingType, type PhListing, type PropertyType } from "./listings";

export type SortKey = "featured" | "newest" | "price-asc" | "price-desc";

export interface SearchFilters {
  /** Market, from the page (/search or /uae/search), never from the query string */
  country: CountryCode;
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

export function parseFilters(raw: Raw, country: CountryCode = "PH"): SearchFilters {
  const type = one(raw.type) as ListingType | undefined;
  const propertyType = one(raw.propertyType) as PropertyType | undefined;
  const sort = one(raw.sort) as SortKey | undefined;
  const m = marketOf(country);
  return {
    country,
    type: type && TYPES.includes(type) && m.listingTypes.includes(type) ? type : undefined,
    location: one(raw.location)?.trim().slice(0, 100) || undefined,
    propertyType: propertyType && propertyType in PROPERTY_TYPE_LABEL ? propertyType : undefined,
    minPrice: num(one(raw.minPrice)),
    maxPrice: num(one(raw.maxPrice)),
    beds: num(one(raw.beds)),
    foreignEligible: one(raw.foreignEligible) === "1" || undefined,
    sort: sort && SORTS.includes(sort) ? sort : "featured",
  };
}

/** Query string for a search; the market is in the path, not here. */
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

/**
 * Resolve "BGC", "Metro Manila" or "Dubai Marina" to the set of place names it
 * covers in that market: the matched location plus everything beneath it.
 */
function resolveLocation(q: string, country: CountryCode): string[] {
  const flat = locationsFor(country);
  const needle = q.toLowerCase();
  const hit =
    flat.find((l) => l.name.toLowerCase() === needle || l.aliases.some((a) => a.toLowerCase() === needle)) ??
    flat.find((l) => l.name.toLowerCase().includes(needle));
  if (!hit) return [q];
  return flat.filter((l) => l.key === hit.key || l.key.startsWith(`${hit.key}/`)).map((l) => l.name);
}

function matchesLocation(l: PhListing, names: string[]) {
  const hay = `${l.locationLabel} | ${l.city} | ${l.province}`.toLowerCase();
  return names.some((n) => hay.includes(n.toLowerCase()));
}

export function searchListings(f: SearchFilters): PhListing[] {
  const names = f.location ? resolveLocation(f.location, f.country) : null;
  const out = LISTINGS.filter((l) => {
    if ((l.country ?? "PH") !== f.country) return false;
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

/** "Condominiums for sale in Makati", "Off-plan apartments in Dubai Marina" */
export function searchHeading(f: SearchFilters) {
  const m = marketOf(f.country);
  const noun = f.propertyType ? m.propertyTypeNoun[f.propertyType] : "Properties";
  const where = f.location ? ` in ${f.location}` : ` ${m.inName}`;
  if (f.type === "PRE_SELLING") return `${m.listingTypeLabel.PRE_SELLING} ${noun.toLowerCase()}${where}`;
  if (f.type === "FORECLOSED") return `Foreclosed ${noun.toLowerCase()}${where}`;
  if (f.type === "RENT") return `${noun} for rent${where}`;
  if (f.type === "SALE") return `${noun} for sale${where}`;
  return `${noun}${where}`;
}
