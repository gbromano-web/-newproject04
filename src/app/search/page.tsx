import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchClient } from "@/components/ph/search-client";
import { SearchResultsView } from "@/components/ph/search-results";
import { STATIC_PREVIEW } from "@/lib/ph/preview";
import { parseFilters, searchHeading, searchListings, toQuery } from "@/lib/ph/search";

export async function generateMetadata(props: PageProps<"/search">): Promise<Metadata> {
  if (STATIC_PREVIEW) return { title: "Search homes" };
  const f = parseFilters(await props.searchParams);
  const title = searchHeading(f);
  return {
    title,
    description: `Browse ${title.toLowerCase()} on SA Realty: prices in pesos with your currency alongside, and agents with PRC or DHSUD numbers.`,
    alternates: { canonical: `/search?${toQuery({ type: f.type, location: f.location, propertyType: f.propertyType })}` },
  };
}

export default function SearchPage(props: PageProps<"/search">) {
  if (STATIC_PREVIEW)
    return (
      <Suspense fallback={<ResultsSkeleton />}>
        <SearchClient />
      </Suspense>
    );
  return (
    <Suspense fallback={<ResultsSkeleton />}>
      <Results searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const f = parseFilters(await searchParams);
  return <SearchResultsView f={f} results={searchListings(f)} />;
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
