import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { SAMPLE_DATA } from "@/lib/ph/preview";
import { getSession } from "@/lib/server/agent-session";
import { EMPTY_VALUES, countryOfLicence, locationOptions } from "@/lib/server/listing-editor";
import { ListingForm } from "../listing-form";

export const metadata: Metadata = { title: "Add a listing", robots: { index: false, follow: false } };

async function NewListing() {
  const session = await getSession();
  if (!session?.agent) redirect("/dashboard");
  const country = countryOfLicence(session.agent.licenseType);
  const locations = await locationOptions(country);
  return (
    <>
      <h1 className="text-2xl font-bold text-sea-950 sm:text-[32px]">Add a listing</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {country === "AE" ? "Prices in dirhams, areas in square feet." : "Prices in pesos, areas in square metres."} It is saved as a draft: add photos next, then publish.
      </p>
      <div className="mt-6 rounded-2xl bg-white p-6 ring-1 ring-line sm:p-8">
        <ListingForm country={country} locations={locations} values={EMPTY_VALUES} />
      </div>
    </>
  );
}

export default function NewListingPage() {
  if (SAMPLE_DATA) redirect("/dashboard");
  return (
    <div className="bg-mist/60">
      <div className="mx-auto max-w-[880px] px-4 py-8 sm:px-6">
        <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-sea-900 hover:text-lagoon-700">
          <ArrowLeft className="size-4" /> Dashboard
        </Link>
        <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-mist" />}>
          <NewListing />
        </Suspense>
      </div>
    </div>
  );
}
