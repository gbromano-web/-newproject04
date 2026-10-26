import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { ListingCard } from "@/components/listing-card";
import { MapView } from "@/components/map-view";
import { SearchBar } from "@/components/search-bar";
import { parseFilters, searchProperties, typeLabel, type SearchFilters } from "@/lib/search";

function heading(f: SearchFilters) {
  const type = f.type ? `${typeLabel[f.type]}s` : "Properties";
  const beds = f.beds ? (f.beds === "0" ? "Studio " : `${f.beds}${f.beds === "5" ? "+" : ""}-bed `) : "";
  return `${beds}${type} for ${f.purpose === "rent" ? "rent" : "sale"} in ${f.location ?? "the UAE"}`;
}

export async function generateMetadata(props: PageProps<"/search">): Promise<Metadata> {
  const f = parseFilters(await props.searchParams);
  const title = heading(f);
  return {
    title,
    description: `Browse ${title.toLowerCase()} with verified permits, prices in AED and direct WhatsApp contact with licensed agents.`,
    alternates: { canonical: `/search?purpose=${f.purpose}${f.location ? `&location=${encodeURIComponent(f.location)}` : ""}` },
  };
}

export default function SearchPage(props: PageProps<"/search">) {
  return (
    <Suspense fallback={<ResultsSkeleton />}>
      <Results searchParams={props.searchParams} />
    </Suspense>
  );
}

const sorts = [
  ["featured", "Featured"],
  ["newest", "Newest"],
  ["price-asc", "Lowest price"],
  ["price-desc", "Highest price"],
] as const;

async function Results({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const raw = await searchParams;
  const f = parseFilters(raw);
  const results = searchProperties(f);

  const withSort = (s: string) => {
    const params = new URLSearchParams(Object.entries(raw).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
    params.set("sort", s);
    return `/search?${params}`;
  };

  return (
    <div>
      <div className="border-b border-line bg-mist">
        <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6">
          <SearchBar key={JSON.stringify(f)} initial={f} variant="compact" />
        </div>
      </div>

      <div className="mx-auto grid max-w-[1440px] gap-6 px-4 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <section>
          <h1 className="text-2xl font-bold sm:text-3xl">{heading(f)}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <p className="mr-2 text-sm text-ink-soft">{results.length} {results.length === 1 ? "result" : "results"}</p>
            {sorts.map(([key, label]) => (
              <Link
                key={key}
                href={withSort(key)}
                className={`rounded-full border px-3 py-1 text-sm font-medium ${f.sort === key ? "border-creek-700 bg-creek-700 text-white" : "border-line text-ink-soft hover:border-creek-500"}`}
              >
                {label}
              </Link>
            ))}
            <button className="ml-auto flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-sm font-medium text-ink-soft">
              <SlidersHorizontal className="size-4" /> More filters
            </button>
          </div>

          <div className="mt-5 space-y-4">
            {results.map((p, i) => <ListingCard key={p.id} p={p} layout="row" priority={i < 2} />)}
            {results.length === 0 && (
              <div className="rounded-xl border border-dashed border-line p-10 text-center">
                <p className="font-semibold">No homes match all of these filters.</p>
                <p className="mt-1 text-sm text-ink-soft">Widen the price range or remove the bedroom filter to see more results.</p>
                <Link href={`/search?purpose=${f.purpose}`} className="mt-4 inline-block text-sm font-semibold text-creek-700 hover:underline">Clear filters</Link>
              </div>
            )}
          </div>
        </section>

        <aside className="hidden lg:block">
          <div className="sticky top-20 h-[calc(100vh-6rem)]">
            <MapView items={results} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="mx-auto max-w-[1440px] space-y-4 px-4 py-6 sm:px-6">
      <div className="h-24 animate-pulse rounded-xl bg-mist" />
      {Array.from({ length: 3 }, (_, i) => <div key={i} className="h-56 animate-pulse rounded-xl bg-mist" />)}
    </div>
  );
}
