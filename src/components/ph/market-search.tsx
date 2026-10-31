import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchClient } from "@/components/ph/search-client";
import { SearchResultsView } from "@/components/ph/search-results";
import { STATIC_PREVIEW } from "@/lib/ph/preview";
import { parseFilters, searchHeading, toQuery } from "@/lib/ph/search";
import { searchListings } from "@/lib/server/listings-repo";
import { marketOf, type CountryCode } from "@/lib/markets";

type Params = Promise<Record<string, string | string[] | undefined>>;

/** Metadata for a market's search page. */
export async function searchMetadata(searchParams: Params, country: CountryCode): Promise<Metadata> {
  if (STATIC_PREVIEW) return { title: "Search homes" };
  const f = parseFilters(await searchParams, country);
  const m = marketOf(country);
  const title = searchHeading(f);
  const how = country === "AE" ? "prices in dirhams with your currency alongside, registered brokers and permit numbers" : "prices in pesos with your currency alongside, and agents with PRC or DHSUD numbers";
  return {
    title,
    description: `Browse ${title.toLowerCase()} on Go Search Property: ${how}.`,
    alternates: { canonical: `${m.search}?${toQuery({ type: f.type, location: f.location, propertyType: f.propertyType })}` },
  };
}

/** A market's search page: filters, results and map. */
export function MarketSearch({ searchParams, country }: { searchParams: Params; country: CountryCode }) {
  if (STATIC_PREVIEW)
    return (
      <Suspense fallback={<ResultsSkeleton />}>
        <SearchClient country={country} />
      </Suspense>
    );
  return (
    <Suspense fallback={<ResultsSkeleton />}>
      <Results searchParams={searchParams} country={country} />
    </Suspense>
  );
}

async function Results({ searchParams, country }: { searchParams: Params; country: CountryCode }) {
  const f = parseFilters(await searchParams, country);
  return <SearchResultsView f={f} results={await searchListings(f)} />;
}

function ResultsSkeleton() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6">
      <div className="h-24 animate-pulse rounded-2xl bg-mist" />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:w-[55%]">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-[4/3] animate-pulse rounded-2xl bg-mist" />
            <div className="h-5 w-1/2 animate-pulse rounded bg-mist" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-mist" />
          </div>
        ))}
      </div>
    </div>
  );
}
