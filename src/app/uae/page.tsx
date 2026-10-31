import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, ArrowUpRight, BadgeCheck, Calculator, FileCheck2, Globe2, Landmark, ScrollText, UserRoundCheck } from "lucide-react";
import { LatestListings, ListingsSkeleton } from "@/components/ph/latest-listings";
import { PhSearchBox } from "@/components/ph/ph-search-box";
import { ScenePhoto } from "@/components/ph/scene-photo";
import type { SceneKey } from "@/components/ph/scenes";
import { ScenicHero, type HeroSlide } from "@/components/ph/scenic-hero";
import { locationsFor } from "@/lib/ph/locations";

export const metadata: Metadata = {
  title: "Apartments, villas and off-plan property for sale and rent in the UAE",
  description:
    "Search apartments, villas, townhouses and off-plan homes across all seven emirates, from registered brokers, with permit numbers shown and prices in dirhams and your currency.",
  alternates: { canonical: "/uae" },
};

const SLIDES: HeroSlide[] = [
  { scene: "skyline", place: "Dubai", note: "Apartments in Dubai Marina, Downtown and Business Bay" },
  { scene: "domes", place: "Abu Dhabi", note: "Homes on Saadiyat, Yas and Al Reem Island" },
  { scene: "mountains", place: "Ras Al Khaimah", note: "Beach and mountain homes in the north" },
  { scene: "dunes", place: "Sharjah and Ajman", note: "Family homes at a gentler price" },
];

const POPULAR = ["Dubai Marina", "Downtown Dubai", "Jumeirah Village Circle", "Palm Jumeirah", "Al Reem Island", "Al Marjan Island"];

const EMIRATES: { name: string; scene: SceneKey; line: string; span?: string }[] = [
  { name: "Dubai", scene: "skyline", line: "Marina apartments, Downtown views and family villas", span: "md:col-span-2 md:row-span-2" },
  { name: "Abu Dhabi", scene: "domes", line: "Island living on Saadiyat, Yas and Al Reem", span: "md:col-span-2" },
  { name: "Sharjah", scene: "dunes", line: "New communities like Aljada" },
  { name: "Ajman", scene: "dunes", line: "Waterfront homes at Al Zorah" },
  { name: "Ras Al Khaimah", scene: "mountains", line: "Al Marjan Island and Al Hamra" },
  { name: "Umm Al Quwain", scene: "dunes", line: "Quiet coastal living" },
  { name: "Fujairah", scene: "mountains", line: "East-coast beaches and mountains", span: "md:col-span-2" },
];

const TRUST = [
  { icon: UserRoundCheck, title: "Registered brokers only", body: "Every broker shows their registration with the emirate's regulator." },
  { icon: FileCheck2, title: "Permit on every ad", body: "Dubai, Abu Dhabi and Ras Al Khaimah listings show the emirate's advertising permit number." },
  { icon: Globe2, title: "Your currency, beside the dirham", body: "Price estimates in 12 currencies, from US dollars to pesos." },
  { icon: Landmark, title: "Freehold clearly marked", body: "Listings foreigners can buy outright carry a freehold badge." },
];

// Verified against the sources linked in the section. General information, not legal advice.
const BUYING_FACTS = [
  {
    icon: Landmark,
    title: "Freehold areas",
    body: "Foreigners can buy outright in designated areas, such as Dubai Marina, Downtown and Business Bay in Dubai, and investment zones including Saadiyat, Yas and Al Reem Island in Abu Dhabi.",
  },
  {
    icon: ScrollText,
    title: "Sharjah and long-term rights",
    body: "In Sharjah, foreign buyers generally hold long-term usufruct rights of up to 100 years in approved areas rather than freehold. Check the rules for each emirate before you buy.",
  },
  {
    icon: Calculator,
    title: "Mortgages",
    body: "Under Central Bank rules, banks can lend up to 80% to residents buying a first home under AED 5 million, and less for pricier homes, second homes and non-residents.",
  },
  {
    icon: BadgeCheck,
    title: "Permits and brokers",
    body: "Dubai ads need a DLD Trakheesi permit, Abu Dhabi ads an ADREC Madhmoun permit and Ras Al Khaimah ads a RAK RERA advertising permit. Brokers register with each emirate's regulator; a Dubai broker card does not cover other emirates.",
  },
];

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

export default function UaeHomePage() {
  const flat = locationsFor("AE");
  const popular = POPULAR.map((name) => flat.find((l) => l.name === name)!).map((l) => ({ key: l.key, label: l.aliases.find((a) => a.length <= 4) ?? l.name }));

  return (
    <>
      <ScenicHero slides={SLIDES} label="UAE destinations">
        <h1 className="mx-auto max-w-4xl text-center text-[42px] font-bold leading-[1.04] text-white [text-shadow:0_2px_24px_rgba(7,29,43,.45)] sm:text-6xl lg:text-[76px]">
          Find your place in the UAE
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-center text-[17px] leading-relaxed text-white/90 [text-shadow:0_1px_12px_rgba(7,29,43,.5)] sm:text-lg">
          Apartments, villas and off-plan homes across all seven emirates, from registered brokers. Prices in dirhams, with your own currency alongside.
        </p>
        <div className="mt-10">
          <PhSearchBox popular={popular} country="AE" />
        </div>
      </ScenicHero>

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

      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <SectionHeading
          title="All seven emirates"
          body="From Dubai's towers to the mountains of Ras Al Khaimah and the beaches of Fujairah."
          action={<Link href="/uae/search" className={textLink}>All listings <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></Link>}
        />
        <div className="mt-9 grid auto-rows-[220px] gap-4 md:grid-cols-4">
          {EMIRATES.map((e) => (
            <Link key={e.name} href={`/uae/search?location=${encodeURIComponent(e.name)}`} className={`group relative isolate overflow-hidden rounded-2xl ${e.span ?? ""}`}>
              <div className="absolute inset-0 -z-10 transition-transform duration-700 ease-out group-hover:scale-[1.04]">
                <ScenePhoto scene={e.scene} uid={`emirate-${e.name.replace(/\s+/g, "-").toLowerCase()}`} />
              </div>
              <div className="grain absolute inset-0 -z-10 bg-gradient-to-t from-sea-950/85 via-sea-950/15 to-transparent" />
              <div className="flex h-full flex-col justify-end p-5 text-white sm:p-6">
                <p className={`font-bold leading-tight tracking-[-0.03em] ${e.span?.includes("row-span") ? "text-4xl" : "text-2xl"}`}>{e.name}</p>
                <p className="mt-1 max-w-sm text-sm text-white/85">{e.line}</p>
              </div>
              <span className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-md transition-colors group-hover:bg-white group-hover:text-sea-950">
                <ArrowUpRight className="size-4" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
        <SectionHeading
          title="New in the UAE"
          body="Recently listed homes, with prices in dirhams and your chosen currency."
          action={<Link href="/uae/search" className={textLink}>View all listings <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></Link>}
        />
        <Suspense fallback={<ListingsSkeleton />}>
          <LatestListings country="AE" />
        </Suspense>
      </section>

      <section id="buying-in-the-uae" className="mt-24 scroll-mt-20 bg-sea-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <h2 className="text-[28px] font-bold leading-tight sm:text-4xl">Buying in the UAE</h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/75">
              Whether you live in the Emirates or are buying from abroad, here is how ownership, financing and listings work.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/uae/search?foreignEligible=1" className="rounded-full bg-mango-500 px-5 py-3 text-sm font-bold text-sea-950 transition-colors hover:bg-mango-400">
                Browse freehold homes
              </Link>
              <Link href="/uae/calculator" className="rounded-full px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/30 transition-colors hover:bg-white/10">
                Estimate a mortgage
              </Link>
            </div>
            <p className="mt-10 max-w-md text-xs leading-relaxed text-white/50">
              General information, not legal or financial advice. Rules differ by emirate and change; confirm them with the land department, your bank or a UAE lawyer. Sources:{" "}
              <a className="underline underline-offset-2 hover:text-white/80" href="https://www.bayut.com/mybayut/property-ownership-rules-foreigners/" target="_blank" rel="noopener noreferrer">Bayut</a>,{" "}
              <a className="underline underline-offset-2 hover:text-white/80" href="https://www.propspace.com/blog/uae-real-estate-advertising-permits" target="_blank" rel="noopener noreferrer">Propspace</a>,{" "}
              <a className="underline underline-offset-2 hover:text-white/80" href="https://realestateclubdubai.com/blog/buying-guide/how-much-can-you-borrow-ltv-rules-dubai" target="_blank" rel="noopener noreferrer">Real Estate Club Dubai</a>.
            </p>
          </div>
          <ul className="grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-2">
            {BUYING_FACTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="bg-sea-950 p-6 sm:p-7">
                <Icon className="size-6 text-mango-400" />
                <h3 className="mt-4 text-lg font-semibold tracking-[-0.02em]">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
        <div className="grid gap-8 rounded-3xl bg-sand-50 p-8 ring-1 ring-sand-200 sm:p-12 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-[28px] font-bold leading-tight text-sea-950 sm:text-4xl">How much can you borrow?</h2>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
              See your financing limit under Central Bank rules, a monthly payment at current advertised rates, and Dubai&apos;s transfer fee, then ask the broker for a sample computation.
            </p>
          </div>
          <Link href="/uae/calculator" className="flex items-center justify-center gap-2 rounded-full bg-sea-900 px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-sea-800">
            <Calculator className="size-5" /> Open the calculator
          </Link>
        </div>
      </section>
    </>
  );
}
