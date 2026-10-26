import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Building, FileCheck2, MessageCircle } from "lucide-react";
import { HeroSkyline } from "@/components/hero-skyline";
import { ListingCard } from "@/components/listing-card";
import { SearchBar } from "@/components/search-bar";
import { communities, countInCommunity, properties } from "@/lib/mock-data";

export default function HomePage() {
  const featured = properties.filter((p) => p.featured).slice(0, 6);

  return (
    <>
      <section className="relative overflow-hidden">
        <HeroSkyline />
        <div className="absolute inset-0 bg-gradient-to-r from-creek-900/95 via-creek-900/70 to-creek-900/10" />
        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24 lg:pb-24">
          <h1 className="max-w-2xl text-4xl font-bold leading-[1.05] text-white sm:text-6xl">
            Find a home in the UAE, from people you can verify.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-creek-100">
            Apartments, villas and townhouses across the Emirates, each with a checked permit number and a licensed agent.
          </p>
          <div className="mt-10 max-w-5xl">
            <SearchBar />
          </div>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold sm:text-3xl">Popular communities in Dubai</h2>
          <Link href="/search?purpose=rent&location=Dubai" className="text-sm font-semibold text-creek-700 hover:underline">See all of Dubai</Link>
        </div>
        <div className="no-scrollbar mt-6 flex snap-x gap-4 overflow-x-auto pb-2">
          {communities.map((c) => (
            <Link
              key={c.name}
              href={`/search?purpose=rent&location=${encodeURIComponent(c.name)}`}
              className="group relative h-44 w-60 shrink-0 snap-start overflow-hidden rounded-xl"
            >
              <Image src={c.image} alt="" fill sizes="240px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-creek-900/85 via-creek-900/10" />
              <div className="absolute bottom-3 left-3 text-white">
                <p className="font-display text-lg font-bold">{c.name}</p>
                <p className="text-sm text-creek-100">{countInCommunity(c.name)} {countInCommunity(c.name) === 1 ? "listing" : "listings"}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold sm:text-3xl">Featured homes this week</h2>
          <Link href="/search?purpose=buy" className="text-sm font-semibold text-creek-700 hover:underline">Browse all homes</Link>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p, i) => <ListingCard key={p.id} p={p} priority={i < 3} />)}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <h2 className="text-2xl font-bold sm:text-3xl">How we keep listings honest</h2>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {[
            { icon: FileCheck2, title: "Permit on every listing", body: "Each property shows its DLD permit number. Listings without a valid permit are not published." },
            { icon: BadgeCheck, title: "Verified means visited", body: "The verified badge is only given after an agent uploads a dated video walkthrough of the unit." },
            { icon: MessageCircle, title: "Talk to the agent directly", body: "Call, WhatsApp or email the listing agent. Your details go to that agent only." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-4">
              <Icon className="mt-1 size-6 shrink-0 text-creek-500" />
              <div>
                <h3 className="font-sans text-base font-bold">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-creek-50 p-8 sm:flex-row sm:items-center sm:p-10">
          <div className="flex gap-4">
            <Building className="mt-1 size-8 shrink-0 text-creek-700" />
            <div>
              <h2 className="text-2xl font-bold">Are you an agent or agency?</h2>
              <p className="mt-1 max-w-xl text-ink-soft">Publish listings, promote the ones that matter and track every WhatsApp and call lead in one dashboard.</p>
            </div>
          </div>
          <Link href="/dashboard" className="rounded-full bg-creek-700 px-6 py-3 font-semibold text-white hover:bg-creek-900">Open the agent dashboard</Link>
        </div>
      </section>
    </>
  );
}
