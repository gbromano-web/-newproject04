import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BadgeCheck, Building, Calculator, Globe2, Landmark, MessageCircle, ScrollText, UserRoundCheck } from "lucide-react";
import { DeveloperSlider } from "@/components/ph/developer-slider";
import { PhListingCard } from "@/components/ph/ph-listing-card";
import { PhSearchBox } from "@/components/ph/ph-search-box";
import { ScenePhoto } from "@/components/ph/scene-photo";
import type { SceneKey } from "@/components/ph/scenes";
import { ScenicHero } from "@/components/ph/scenic-hero";
import { CURRENCIES } from "@/lib/ph/currency";
import { flattenLocations } from "@/lib/ph/locations";
import type { PhotoKey } from "@/lib/ph/photos";
import { Suspense } from "react";
import { latestListings } from "@/lib/server/listings-repo";
import { log } from "@/lib/server/request";
import { connection } from "next/server";
import { SAMPLE_DATA } from "@/lib/ph/preview";

export const metadata: Metadata = {
  title: "Condos, house and lot, and lots for sale and rent in the Philippines",
  description:
    "Search condominiums, house and lot, lots, pre-selling and foreclosed properties from Metro Manila to Palawan, with PRC and DHSUD-verified agents and prices shown in your currency.",
};

const POPULAR = ["Bonifacio Global City", "Makati CBD", "Cebu IT Park", "El Nido", "Baguio", "Panglao"];

const DESTINATIONS: { photo: PhotoKey; scene: SceneKey; name: string; line: string; location: string; span?: string }[] = [
  { photo: "elNidoLagoon", scene: "lagoon", name: "Palawan", line: "Beach lots, resort homes and island investments", location: "Palawan", span: "md:col-span-2 md:row-span-2" },
  { photo: "bgc", scene: "city", name: "Metro Manila", line: "Condos in BGC, Makati and Ortigas", location: "Metro Manila" },
  { photo: "batad", scene: "terraces", name: "The Cordilleras", line: "Cool-climate homes in Baguio and Benguet", location: "Baguio" },
  { photo: "chocolateHills", scene: "hills", name: "Bohol", line: "Retirement and beach homes near Panglao", location: "Bohol" },
  { photo: "mayon", scene: "volcano", name: "Albay", line: "House and lot with Mayon views", location: "Albay" },
];

const TRUST = [
  { icon: UserRoundCheck, title: "Licensed agents only", body: "Every agent shows a PRC licence or DHSUD accreditation number." },
  { icon: Globe2, title: "Your currency, beside the peso", body: `Price estimates in ${CURRENCIES.length - 1} currencies, from US dollars to yen.` },
  { icon: Landmark, title: "Clear on foreign ownership", body: "Condos open to foreign buyers are marked on every listing." },
  { icon: MessageCircle, title: "Message from anywhere", body: "Reach agents on Viber or WhatsApp, in any time zone." },
];

// Verified against the sources linked in the section. General information, not legal advice.
const OWNERSHIP_FACTS = [
  {
    icon: Building,
    title: "Condominium units",
    body: "Foreign nationals can own condo units outright, as long as foreign ownership in the project stays within 40% (Condominium Act, RA 4726).",
  },
  {
    icon: Landmark,
    title: "Land",
    body: "Land can only be titled to Filipino citizens or Filipino-owned companies. Foreigners can own a house built on land they lease.",
  },
  {
    icon: ScrollText,
    title: "Long-term leases",
    body: "Qualified foreign investors can lease private land for up to 99 years for a registered investment (RA 12252, 2025).",
  },
  {
    icon: BadgeCheck,
    title: "Former Filipinos",
    body: "Natural-born Filipinos who reacquire citizenship under RA 9225 buy property with the same rights as any Filipino.",
  },
];

async function LatestListings() {
  // Outside the try: during the build Next.js stops here on purpose, and that must not count as a failure
  if (!SAMPLE_DATA) await connection();
  let listings: Awaited<ReturnType<typeof latestListings>>;
  try {
    listings = await latestListings(6);
  } catch (e) {
    // A database hiccup should cost this one section, not the whole homepage
    log("error", "home.latest_failed", { error: e instanceof Error ? e.message : String(e) });
    return <p className="mt-9 rounded-2xl bg-mist px-6 py-10 text-center text-ink-soft">Latest listings are taking a moment to load. <Link href="/search" className="font-semibold text-sea-900 underline">Search all homes</Link></p>;
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

function ListingsSkeleton() {
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

function SectionHeading({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-[28px] font-bold leading-tight text-sea-950 sm:text-4xl">{title}</h2>
        {body && <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-soft">{body}</p>}
      </div>
      {action}
    </div>
  );
}

const textLink = "group inline-flex items-center gap-1.5 text-sm font-semibold text-sea-900 hover:text-lagoon-700";

export default function HomePage() {
  const flat = flattenLocations();
  const popular = POPULAR.map((name) => flat.find((l) => l.name === name)!).map((l) => ({
    key: l.key,
    label: l.aliases.includes("BGC") ? "BGC" : l.name,
  }));

  return (
    <>
      <ScenicHero>
        <h1 className="mx-auto max-w-4xl text-center text-[42px] font-bold leading-[1.04] text-white [text-shadow:0_2px_24px_rgba(7,29,43,.45)] sm:text-6xl lg:text-[76px]">
          Find your place in the Philippines
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-center text-[17px] leading-relaxed text-white/90 [text-shadow:0_1px_12px_rgba(7,29,43,.5)] sm:text-lg">
          Condos, houses and lots from Metro Manila to the islands, listed by licensed agents. Prices in pesos, with your own currency alongside.
        </p>
        <div className="mt-10">
          <PhSearchBox popular={popular} />
        </div>
      </ScenicHero>

      {/* Trust strip */}
      <section className="border-b border-line bg-white">
        <ul className="mx-auto grid max-w-7xl gap-x-8 gap-y-6 px-4 py-9 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {TRUST.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lagoon-50 text-lagoon-700"><Icon className="size-5" /></span>
              <div>
                <p className="text-[15px] font-semibold text-sea-950">{title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Destinations */}
      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <SectionHeading
          title="Live where others vacation"
          body="Explore by destination, from beachfront lots in Palawan to cool-climate homes in the Cordilleras."
          action={<Link href="/search" className={textLink}>All provinces <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></Link>}
        />
        <div className="mt-9 grid auto-rows-[230px] gap-4 md:grid-cols-4">
          {DESTINATIONS.map((d) => (
            <Link key={d.name} href={`/search?location=${encodeURIComponent(d.location)}`} className={`group relative isolate overflow-hidden rounded-2xl ${d.span ?? ""}`}>
              <div className="absolute inset-0 -z-10 transition-transform duration-700 ease-out group-hover:scale-[1.04]">
                <ScenePhoto photo={d.photo} scene={d.scene} uid={`dest-${d.scene}`} sizes={d.span ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 25vw, 100vw"} />
              </div>
              <div className="grain absolute inset-0 -z-10 bg-gradient-to-t from-sea-950/85 via-sea-950/15 to-transparent" />
              <div className="flex h-full flex-col justify-end p-5 text-white sm:p-6">
                <p className={`font-bold leading-tight tracking-[-0.03em] ${d.span ? "text-4xl" : "text-2xl"}`}>{d.name}</p>
                <p className="mt-1 max-w-sm text-sm text-white/85">{d.line}</p>
              </div>
              <span className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-md transition-colors group-hover:bg-white group-hover:text-sea-950">
                <ArrowUpRight className="size-4" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Listings */}
      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
        <SectionHeading
          title="New on Go Search Property"
          body="Recently listed homes, with prices in pesos and your chosen currency."
          action={<Link href="/search" className={textLink}>View all listings <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></Link>}
        />
        <Suspense fallback={<ListingsSkeleton />}>
          <LatestListings />
        </Suspense>
      </section>

      <div className="mt-24">
        <DeveloperSlider slides={[]} />
      </div>

      {/* Buying from abroad */}
      <section id="buying-from-abroad" className="mt-24 scroll-mt-20 bg-sea-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <h2 className="text-[28px] font-bold leading-tight sm:text-4xl">Buying from abroad</h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/75">
              Whether you are an overseas Filipino planning a home back home, or an international buyer looking at Manila, Cebu or the islands, here is what the law allows.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/search?foreignEligible=1" className="rounded-full bg-mango-500 px-5 py-3 text-sm font-bold text-sea-950 transition-colors hover:bg-mango-400">
                Browse condos open to foreign buyers
              </Link>
              <Link href="/dashboard" prefetch={false} className="rounded-full px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/30 transition-colors hover:bg-white/10">
                Talk to a licensed agent
              </Link>
            </div>
            <p className="mt-10 max-w-md text-xs leading-relaxed text-white/50">
              General information, not legal advice. Confirm your situation with a Philippine lawyer before you buy. Sources:{" "}
              <a className="underline underline-offset-2 hover:text-white/80" href="https://listd.ph/spotlight/foreigners-own-property-philippines" target="_blank" rel="noopener noreferrer">Listd</a>,{" "}
              <a className="underline underline-offset-2 hover:text-white/80" href="https://ndvlaw.com/the-99-year-land-lease-law-for-foreign-corporations-in-the-philippines/" target="_blank" rel="noopener noreferrer">NDV Law</a>.
            </p>
          </div>
          <ul className="grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-2">
            {OWNERSHIP_FACTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="bg-sea-950 p-6 sm:p-7">
                <Icon className="size-6 text-mango-400" />
                <h3 className="mt-4 text-lg font-semibold tracking-[-0.02em]">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Financing */}
      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
        <div className="grid gap-8 rounded-3xl bg-sand-50 p-8 ring-1 ring-sand-200 sm:p-12 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-[28px] font-bold leading-tight text-sea-950 sm:text-4xl">Pag-IBIG or bank financing?</h2>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
              Compare monthly amortization for both, then request a sample computation from the agent with your figures already filled in. Rates come from published Pag-IBIG and bank sources.
            </p>
          </div>
          <Link href="/calculator" className="flex items-center justify-center gap-2 rounded-full bg-sea-900 px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-sea-800">
            <Calculator className="size-5" /> Open the calculator
          </Link>
        </div>
      </section>
    </>
  );
}
