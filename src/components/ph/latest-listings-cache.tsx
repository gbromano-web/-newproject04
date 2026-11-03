import { cacheLife, cacheTag } from "next/cache";
import type { CountryCode } from "@/lib/markets";
import { LatestListingsList } from "./latest-listings";

/**
 * Seconds: browsers may reuse a copy for `stale`; the server refreshes it in the background
 * after `revalidate`; after `expire` with no visits it is rebuilt before serving.
 * LISTINGS_REVALIDATE_SECONDS only exists so the e2e tests see changes within a second or two.
 */
const LIFETIME = { stale: 60, revalidate: Number(process.env.LISTINGS_REVALIDATE_SECONDS) || 60, expire: 3600 };

/**
 * The home pages' newest listings, cached. Rendered into the page when it is
 * built, then refreshed in the background at most once a minute (LIFETIME), so home pages are served from the CDN instead of
 * querying the database on every visit. A listing change, or a suspended
 * agent, shows here within about a minute (listing and search pages stay
 * per request). A failed query is cached for the same short time, so the
 * section recovers by itself.
 *
 * Kept in its own file: the static GitHub Pages preview has no cache and swaps
 * this file for a plain re-export (scripts/build-preview.sh).
 */
export async function LatestListings(props: { country?: CountryCode; count?: number }) {
  "use cache";
  cacheLife(LIFETIME);
  cacheTag("listings", `listings:${props.country ?? "PH"}`);
  return <LatestListingsList {...props} />;
}
