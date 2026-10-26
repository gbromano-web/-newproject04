import type { Metadata } from "next";
import { DeveloperSlider } from "@/components/ph/developer-slider";
import { ManilaSkyline } from "@/components/ph/manila-skyline";
import { PhListingCard } from "@/components/ph/ph-listing-card";
import { PhSearchBox } from "@/components/ph/ph-search-box";
import { flattenLocations } from "@/lib/ph/locations";
import { PH_SAMPLE_LISTINGS } from "@/lib/ph/sample-listings";

export const metadata: Metadata = {
  title: "Condos, house and lot, and lots for sale and rent in the Philippines",
  description: "Search condominiums, townhouses, house and lot, pre-selling and foreclosed properties across Metro Manila, Cebu, Davao and nearby provinces, with PRC and DHSUD-verified agents.",
};

const POPULAR = ["Bonifacio Global City", "Makati CBD", "Ortigas Center", "Alabang", "Cebu IT Park", "Clark Freeport Zone"];

export default function PhHomePage() {
  const flat = flattenLocations();
  const popular = POPULAR.map((name) => flat.find((l) => l.name === name)!).map((l) => ({
    key: l.key,
    label: l.aliases.find((a) => a === "BGC") ?? l.name,
  }));

  return (
    <div className="bg-white">
      <section className="relative isolate overflow-hidden">
        <ManilaSkyline />
        <div className="absolute inset-0 -z-0 bg-gradient-to-b from-[#14214f]/40 via-transparent to-[#14214f]/50" />
        <div className="relative mx-auto flex min-h-[600px] max-w-7xl flex-col justify-center px-4 py-16 sm:px-6">
          <h1 className="mx-auto max-w-3xl text-center text-4xl font-bold leading-[1.05] text-white sm:text-6xl">
            Your next address in the Philippines
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-center text-lg text-white/85">
            Condos, house and lot, pre-selling and foreclosed homes, listed by PRC and DHSUD-verified agents.
          </p>
          <div className="mt-10">
            <PhSearchBox popular={popular} />
          </div>
          {/* Hero background rotation indicator (HOME_HERO banners) */}
          <div className="mt-10 flex justify-center gap-2" aria-hidden>
            <span className="h-1.5 w-8 rounded-full bg-white" />
            <span className="h-1.5 w-4 rounded-full bg-white/40" />
            <span className="h-1.5 w-4 rounded-full bg-white/40" />
            <span className="h-1.5 w-4 rounded-full bg-white/40" />
          </div>
        </div>
      </section>

      <div className="mt-16">
        <DeveloperSlider slides={[]} />
      </div>

      <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold text-[#14214f] sm:text-3xl">Latest listings</h2>
          <a href="/search" className="text-sm font-semibold text-[#4a2f78] hover:underline">View all listings</a>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PH_SAMPLE_LISTINGS.map((l) => <PhListingCard key={l.id} l={l} />)}
        </div>
      </section>
    </div>
  );
}
