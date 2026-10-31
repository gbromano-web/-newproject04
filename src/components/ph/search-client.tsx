"use client";

import { useSearchParams } from "next/navigation";
import { parseFilters, searchListings } from "@/lib/ph/search";
import { SearchResultsView } from "./search-results";
import type { CountryCode } from "@/lib/markets";

/** Static preview only: filters from the URL in the browser, since there is no server. */
export function SearchClient({ country = "PH" }: { country?: CountryCode }) {
  const params = useSearchParams();
  const raw: Record<string, string> = {};
  params.forEach((v, k) => (raw[k] = v));
  const f = parseFilters(raw, country);
  return <SearchResultsView f={f} results={searchListings(f)} />;
}
