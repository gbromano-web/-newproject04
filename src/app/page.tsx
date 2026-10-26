import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Calculator, ShieldCheck } from "lucide-react";
import { DeveloperSlider } from "@/components/ph/developer-slider";
import { PhListingCard } from "@/components/ph/ph-listing-card";
import { PhSearchBox } from "@/components/ph/ph-search-box";
import { ScenePhoto } from "@/components/ph/scene-photo";
import type { SceneKey } from "@/components/ph/scenes";
import type { PhotoKey } from "@/lib/ph/photos";
import { ScenicHero } from "@/components/ph/scenic-hero";
import { flattenLocations } from "@/lib/ph/locations";
import { PH_SAMPLE_LISTINGS } from "@/lib/ph/sample-listings";

export const metadata: Metadata = {
  title: "Condos, house and lot, beach lots and more for sale and rent in the Philippines",
  description:
    "Search condominiums, house and lot, beach lots, pre-selling and foreclosed properties from Metro Manila to Palawan, with PRC and DHSUD-verified agents.",
};

const POPULAR = ["Bonifacio Global City", "Makati CBD", "Cebu IT Park", "El Nido", "Baguio", "Panglao"];

const DESTINATIONS: { photo: PhotoKey; scene: SceneKey; name: string; line: string; location: string; span?: string }[] = [
  { photo: "elNidoLagoon", scene: "lagoon", name: "Palawan", line: "Beach lots, resort homes and island investments", location: "Palawan", span: "md:col-span-2 md:row-span-2" },
  { photo: "bgc", scene: "city", name: "Metro Manila", line: "Condos near work in BGC, Makati and Ortigas", location: "Metro Manila" },
  { photo: "batad", scene: "terraces", name: "Baguio and the Cordilleras", line: "Cool-climate houses and vacation homes", location: "Baguio" },
  { photo: "chocolateHills", scene: "hills", name: "Bohol", line: "Retirement and beach homes around Panglao", location: "Bohol" },
  { photo: "mayon", scene: "volcano", name: "Albay", line: "House and lot with Mayon views in Legazpi", location: "Albay" },
];

export default function HomePage() {
  const flat = flattenLocations();
  const popular = POPULAR.map((name) => flat.find((l) => l.name === name)!).map((l) => ({
    key: l.key,
    label: l.aliases.includes("BGC") ? "BGC" : l.name,
  }));

  return (
    <>
      <ScenicHero>
        <h1 className="mx-auto max-w-4xl text-center text-4xl font-extrabold leading-[1.02] text-white drop-shadow-[0_2px_18px_rgba(6,40,58,.55)] sm:text-6xl lg:text-7xl">
          From city condos to island lots
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-center text-lg font-medium text-white/90 drop-shadow">
          Homes across all 7,641 islands, listed by PRC and DHSUD-verified agents.
        </p>
        <div className="mt-9">
          <PhSearchBox popular={popular} />
        </div>
      </ScenicHero>

      {/* Destinations */}
      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-3xl font-extrabold text-sea-900 sm:text-4xl">Live where you&apos;d vacation</h2>
            <p className="mt-2 max-w-xl text-ink-soft">Explore homes by destination, from beachfront lots in Palawan to pine-country houses in Baguio.</p>
          </div>
          <Link href="/search" className="rounded-full bg-lagoon-50 px-4 py-2 text-sm font-bold text-lagoon-700 hover:bg-lagoon-100">See every province</Link>
        </div>
        <div className="mt-8 grid auto-rows-[220px] gap-4 md:grid-cols-4">
          {DESTINATIONS.map((d) => {
            return (
              <Link
                key={d.name}
                href={`/search?location=${encodeURIComponent(d.location)}`}
                className={`group relative isolate overflow-hidden rounded-3xl ${d.span ?? ""}`}
              >
                <div className="absolute inset-0 -z-10 transition-transform duration-700 group-hover:scale-105">
                  <ScenePhoto photo={d.photo} scene={d.scene} uid={`dest-${d.scene}`} sizes={d.span ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 25vw, 100vw"} />
                </div>
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-sea-950/80 via-sea-950/10 to-transparent" />
                <div className="flex h-full flex-col justify-end p-5 text-white">
                  <p className={`font-display font-extrabold leading-tight ${d.span ? "text-4xl" : "text-2xl"}`}>{d.name}</p>
                  <p className="mt-1 max-w-sm text-sm text-white/90">{d.line}</p>
                </div>
                <span className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-white/90 text-sea-900 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                  <ArrowUpRight className="size-4" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="mt-20">
        <DeveloperSlider slides={[]} />
      </div>

      {/* Listings */}
      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <div className="flex items-end justify-between">
          <h2 className="text-3xl font-extrabold text-sea-900 sm:text-4xl">Latest listings</h2>
          <Link href="/search" className="text-sm font-bold text-lagoon-700 hover:underline">View all listings</Link>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PH_SAMPLE_LISTINGS.map((l) => <PhListingCard key={l.id} l={l} />)}
        </div>
      </section>

      {/* Financing */}
      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-coral-500 via-mango-500 to-mango-400 p-8 text-sea-950 sm:p-12">
          <svg viewBox="0 0 400 200" className="absolute -right-10 -top-6 h-64 w-auto opacity-25" aria-hidden>
            <circle cx="260" cy="120" r="90" fill="#fff" />
            <path d="M0 150 C60 130 120 130 180 150 S300 170 400 150" stroke="#fff" strokeWidth="10" fill="none" />
            <path d="M0 175 C60 155 120 155 180 175 S300 195 400 175" stroke="#fff" strokeWidth="10" fill="none" />
          </svg>
          <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-3xl font-extrabold sm:text-4xl">Pag-IBIG or bank financing?</h2>
              <p className="mt-2 max-w-xl font-medium text-sea-950/85">
                Compare monthly amortization for both, then request a sample computation from the listing agent with your numbers already filled in.
              </p>
              <p className="mt-4 flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4" /> Rates come from published Pag-IBIG and bank figures.</p>
            </div>
            <Link href="/search" className="flex items-center justify-center gap-2 rounded-full bg-sea-950 px-6 py-3.5 font-bold text-white hover:bg-sea-900">
              <Calculator className="size-5" /> Open the calculator
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
