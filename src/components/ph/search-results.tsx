import Link from "next/link";
import { SearchX } from "lucide-react";
import { FilterBar } from "@/components/ph/filter-bar";
import { MobileMapToggle } from "@/components/ph/mobile-map-toggle";
import { PhListingCard } from "@/components/ph/ph-listing-card";
import { PhMap } from "@/components/ph/ph-map";
import { searchHeading, toQuery, type SearchFilters, type SortKey } from "@/lib/ph/search";
import type { PhListing } from "@/lib/ph/listings";
import { marketOf } from "@/lib/markets";

const SORTS: [SortKey, string][] = [
  ["featured", "Recommended"],
  ["newest", "Newest"],
  ["price-asc", "Lowest price"],
  ["price-desc", "Highest price"],
];

/** Results list, sort links and map. Rendered on the server on the real site and in the browser in the static preview. */
export function SearchResultsView({ f, results }: { f: SearchFilters; results: PhListing[] }) {
  const m = marketOf(f.country);
  return (
    <div className="bg-white">
      <FilterBar key={toQuery(f)} initial={f} resultCount={results.length} />

      <div className="mx-auto grid max-w-[1440px] gap-8 px-4 pb-24 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.82fr)]">
        <section aria-labelledby="results-heading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 id="results-heading" className="text-2xl font-bold text-sea-950 sm:text-[32px]">{searchHeading(f)}</h1>
              <p className="mt-1 text-sm text-ink-soft">{results.length} {results.length === 1 ? "home" : "homes"} found</p>
            </div>
            <nav aria-label="Sort results" className="no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-full bg-mist p-1 text-sm">
              {SORTS.map(([key, label]) => (
                <Link
                  key={key}
                  href={`${m.search}?${toQuery({ ...f, sort: key })}`}
                  aria-current={f.sort === key ? "true" : undefined}
                  className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 font-semibold transition-colors ${f.sort === key ? "bg-white text-sea-950 shadow-sm" : "text-ink-soft hover:text-sea-900"}`}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {results.length > 0 ? (
            <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2">
              {results.map((l, i) => <PhListingCard key={l.id} l={l} priority={i < 2} />)}
            </div>
          ) : (
            <div className="mt-10 flex flex-col items-center rounded-3xl bg-mist px-6 py-16 text-center">
              <SearchX className="size-8 text-sea-700" />
              <p className="mt-4 text-lg font-semibold text-sea-950">No homes match all of these filters</p>
              <p className="mt-1 max-w-sm text-sm text-ink-soft">Try a wider price range, another property type, or {m.code === "AE" ? "the whole emirate instead of the community" : "the province instead of the city"}.</p>
              <Link href={m.search} className="mt-6 rounded-full bg-sea-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sea-800">Clear filters</Link>
            </div>
          )}
        </section>

        <aside className="hidden lg:block" aria-label="Map">
          <div className="sticky top-[84px] h-[calc(100vh-108px)]">
            <PhMap listings={results} country={m.code} />
          </div>
        </aside>
      </div>
      <MobileMapToggle listings={results} country={m.code} />
    </div>
  );
}
