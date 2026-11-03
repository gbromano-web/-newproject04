import Link from "next/link";
import { PhListingCard } from "@/components/ph/ph-listing-card";
import { marketOf, type CountryCode } from "@/lib/markets";
import { latestListings } from "@/lib/server/listings-repo";
import { log } from "@/lib/server/request";

/**
 * Newest listings in one market, for a home page. A database hiccup costs this section only.
 * Pages use the cached wrapper, <LatestListings> in ./latest-listings-cache.
 */
export async function LatestListingsList({ country = "PH", count = 6 }: { country?: CountryCode; count?: number }) {
  let listings: Awaited<ReturnType<typeof latestListings>>;
  try {
    listings = await latestListings(count, country);
  } catch (e) {
    log("error", "home.latest_failed", { country, error: e instanceof Error ? e.message : String(e) });
    return (
      <p className="mt-9 rounded-2xl bg-mist px-6 py-10 text-center text-ink-soft">
        Latest listings are taking a moment to load. <Link href={marketOf(country).search} className="font-semibold text-sea-900 underline">Search all homes</Link>
      </p>
    );
  }
  if (!listings.length) {
    return <p className="mt-9 rounded-2xl bg-mist px-6 py-10 text-center text-ink-soft">New listings appear here as agents publish them.</p>;
  }
  return (
    <div className="mt-9 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((l) => <PhListingCard key={l.id} l={l} />)}
    </div>
  );
}

export function ListingsSkeleton() {
  return (
    <div className="mt-9 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="space-y-3">
          <div className="aspect-[4/3] animate-pulse rounded-2xl bg-mist" />
          <div className="h-5 w-1/2 animate-pulse rounded bg-mist" />
        </div>
      ))}
    </div>
  );
}
