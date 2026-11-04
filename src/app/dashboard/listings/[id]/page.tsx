import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Message } from "@/app/agent/forms";
import { SAMPLE_DATA } from "@/lib/ph/preview";
import { getSession } from "@/lib/server/agent-session";
import { MAX_PHOTOS, countryOfLicence, locationOptions, ownListing } from "@/lib/server/listing-editor";
import { ListingForm } from "../listing-form";
import { PhotoManager } from "../photo-manager";
import { StatusPanel } from "../status-panel";

export const metadata: Metadata = { title: "Edit listing", robots: { index: false, follow: false } };

// Listing ids are only known at request time; Cache Components needs one param to
// prerender the shell (header, layout), so a placeholder stands in (it 404s).
export function generateStaticParams() {
  return [{ id: "__placeholder__" }];
}

const STATUS: Record<string, string> = {
  DRAFT: "Draft", PENDING_REVIEW: "In review", ACTIVE: "Published", PAUSED: "Paused", EXPIRED: "Expired", REJECTED: "Rejected", SOLD: "Sold", RENTED: "Rented",
};

async function EditListing({ params, searchParams }: PageProps<"/dashboard/listings/[id]">) {
  const session = await getSession();
  if (!session?.agent) redirect("/dashboard");
  const { id } = await params;
  const created = (await searchParams).created === "1";
  const country = countryOfLicence(session.agent.licenseType);
  // Scoped to the signed-in agent: someone else's listing id is simply not found
  const listing = await ownListing(session.agent.id, id, country);
  if (!listing) notFound();
  const locations = await locationOptions(country);
  const verified = session.agent.verification === "VERIFIED";
  const label = listing.live ? (verified ? "Live" : "Published, waiting for licence check") : STATUS[listing.status] ?? listing.status;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-sea-950 sm:text-[32px]">{listing.values.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${listing.live && verified ? "bg-lagoon-50 text-lagoon-700" : "bg-mist text-ink-soft"}`}>{label}</span>
            {listing.live && verified && (
              <Link href={`/property/${listing.slug}`} className="inline-flex items-center gap-1 font-semibold text-sea-900 hover:text-lagoon-700">
                View on the site <ExternalLink className="size-3.5" />
              </Link>
            )}
          </p>
        </div>
      </div>

      {created && <div className="mt-4"><Message state={{ ok: "Draft created. Add photos below, then publish when you're ready." }} /></div>}

      <section className="mt-6 rounded-2xl bg-white p-6 ring-1 ring-line sm:p-8" aria-labelledby="status-h">
        <h2 id="status-h" className="mb-3 text-lg font-bold text-sea-950">Publishing</h2>
        <StatusPanel id={listing.id} status={listing.status} rent={listing.values.listingType === "RENT"} />
      </section>

      <section className="mt-6 rounded-2xl bg-white p-6 ring-1 ring-line sm:p-8" aria-labelledby="photos-h">
        <h2 id="photos-h" className="mb-3 text-lg font-bold text-sea-950">Photos</h2>
        <PhotoManager id={listing.id} initial={listing.photos} max={MAX_PHOTOS} canUpload={verified} />
      </section>

      <section className="mt-6 rounded-2xl bg-white p-6 ring-1 ring-line sm:p-8" aria-labelledby="details-h">
        <h2 id="details-h" className="mb-5 text-lg font-bold text-sea-950">Details and price</h2>
        <ListingForm id={listing.id} country={country} locations={locations} values={listing.values} />
      </section>
    </>
  );
}

export default function EditListingPage(props: PageProps<"/dashboard/listings/[id]">) {
  if (SAMPLE_DATA) redirect("/dashboard");
  return (
    <div className="bg-mist/60">
      <div className="mx-auto max-w-[880px] px-4 py-8 sm:px-6">
        <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-sea-900 hover:text-lagoon-700">
          <ArrowLeft className="size-4" /> Dashboard
        </Link>
        <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-mist" />}>
          <EditListing {...props} />
        </Suspense>
      </div>
    </div>
  );
}
