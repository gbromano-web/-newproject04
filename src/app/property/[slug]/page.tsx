import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck, Bath, BedDouble, Building2, Bus, Car, Check, ChevronRight, GraduationCap, Hospital,
  Maximize2, Phone, ShoppingBag, Sofa, Train, Waves,
} from "lucide-react";
import { Gallery } from "@/components/gallery";
import { LeadWidget } from "@/components/lead-widget";
import { ListingCard } from "@/components/listing-card";
import { MortgageCalculator } from "@/components/mortgage-calculator";
import { WhatsAppIcon } from "@/components/icons";
import { getAgency, getAgent, getProperty, properties } from "@/lib/mock-data";
import { bedsLabel, formatAED, priceSuffix, typeLabel } from "@/lib/search";
import type { Property } from "@/lib/types";

export function generateStaticParams() {
  return properties.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(props: PageProps<"/property/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const p = getProperty(slug);
  if (!p) return {};
  const title = `${p.title}, ${p.location.community}`;
  const description = `${bedsLabel(p.bedrooms)} ${typeLabel[p.type].toLowerCase()} for ${p.purpose === "rent" ? "rent" : "sale"} in ${p.location.community}, ${p.location.city}. AED ${formatAED(p.price)}${priceSuffix(p)}. ${formatAED(p.areaSqft)} sqft.`;
  return {
    title,
    description,
    alternates: { canonical: `/property/${p.slug}` },
    openGraph: { title, description, type: "website", url: `/property/${p.slug}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

const nearbyIcon = { school: GraduationCap, hospital: Hospital, metro: Train, mall: ShoppingBag, beach: Waves };

function jsonLd(p: Property) {
  const residenceType = p.type === "villa" || p.type === "townhouse" ? "SingleFamilyResidence" : "Apartment";
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: p.title,
    description: p.description,
    url: `/property/${p.slug}`,
    datePosted: p.listedAt,
    image: p.images,
    offers: {
      "@type": "Offer",
      price: p.price,
      priceCurrency: "AED",
      businessFunction: p.purpose === "rent" ? "http://purl.org/goodrelations/v1#LeaseOut" : "http://purl.org/goodrelations/v1#Sell",
      availability: "https://schema.org/InStock",
    },
    about: {
      "@type": residenceType,
      numberOfRooms: p.bedrooms,
      numberOfBathroomsTotal: p.bathrooms,
      floorSize: { "@type": "QuantitativeValue", value: p.areaSqft, unitCode: "FTK" },
      amenityFeature: p.amenities.map((a) => ({ "@type": "LocationFeatureSpecification", name: a, value: true })),
      address: {
        "@type": "PostalAddress",
        addressLocality: p.location.community,
        addressRegion: p.location.city,
        addressCountry: "AE",
      },
      geo: { "@type": "GeoCoordinates", latitude: p.location.lat, longitude: p.location.lng },
    },
  };
}

export default async function PropertyPage(props: PageProps<"/property/[slug]">) {
  const { slug } = await props.params;
  const p = getProperty(slug);
  if (!p) notFound();

  const agent = getAgent(p.agentId);
  const agency = getAgency(agent.agencyId);
  const similar = properties.filter((x) => x.id !== p.id && x.purpose === p.purpose).slice(0, 3);

  const facts = [
    { icon: Building2, label: "Type", value: typeLabel[p.type] },
    { icon: BedDouble, label: "Bedrooms", value: bedsLabel(p.bedrooms) },
    { icon: Bath, label: "Bathrooms", value: String(p.bathrooms) },
    { icon: Maximize2, label: "Size", value: `${formatAED(p.areaSqft)} sqft` },
    { icon: Sofa, label: "Furnishing", value: p.furnished ? "Furnished" : "Unfurnished" },
    { icon: Car, label: "Completion", value: p.completion === "ready" ? "Ready to move" : "Off-plan" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(p)).replace(/</g, "\\u003c") }} />

      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 py-4 text-sm text-ink-soft">
        <Link href="/" className="hover:text-creek-700">Home</Link>
        <ChevronRight className="size-3.5" />
        <Link href={`/search?purpose=${p.purpose}&location=${p.location.city}`} className="hover:text-creek-700">{p.purpose === "rent" ? "Rent" : "Buy"} in {p.location.city}</Link>
        <ChevronRight className="size-3.5" />
        <Link href={`/search?purpose=${p.purpose}&location=${encodeURIComponent(p.location.community)}`} className="hover:text-creek-700">{p.location.community}</Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-8">
          <Gallery images={p.images} floorPlan={p.floorPlan} title={p.title} />

          <header>
            <div className="flex flex-wrap items-center gap-2">
              {p.verified && <span className="flex items-center gap-1 rounded-md bg-creek-50 px-2 py-0.5 text-xs font-bold text-creek-700"><BadgeCheck className="size-3.5" /> Verified listing</span>}
              {p.featured && <span className="rounded-md bg-date-500 px-2 py-0.5 text-xs font-bold text-creek-900">Featured</span>}
            </div>
            <p className="mt-3 font-display text-4xl font-bold">
              AED {formatAED(p.price)}<span className="ml-1 font-sans text-lg font-medium text-ink-soft">{priceSuffix(p)}</span>
            </p>
            <h1 className="mt-2 text-2xl font-bold">{p.title}</h1>
            <p className="mt-1 text-ink-soft">{[p.location.subCommunity, p.location.community, p.location.city].filter(Boolean).join(", ")}</p>
          </header>

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
            {facts.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 bg-white p-4">
                <Icon className="size-5 text-creek-500" />
                <div>
                  <dt className="text-xs text-ink-soft">{label}</dt>
                  <dd className="font-semibold">{value}</dd>
                </div>
              </div>
            ))}
          </dl>

          <section>
            <h2 className="text-xl font-bold">About this home</h2>
            <p className="mt-3 max-w-[70ch] leading-relaxed text-ink-soft">{p.description}</p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Amenities</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {p.amenities.map((a) => (
                <li key={a} className="flex items-center gap-2 text-sm"><Check className="size-4 text-creek-500" />{a}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold">What&apos;s nearby</h2>
            <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
              {p.nearby.map((n) => {
                const Icon = nearbyIcon[n.kind] ?? Bus;
                return (
                  <li key={n.name} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <Icon className="size-4 text-creek-500" />
                    <span className="font-medium">{n.name}</span>
                    <span className="ml-auto text-ink-soft">{n.km} km</span>
                  </li>
                );
              })}
            </ul>
          </section>

          {p.purpose === "buy" && <MortgageCalculator price={p.price} />}

          <section className="rounded-xl bg-mist p-5 text-sm">
            <h2 className="font-sans text-base font-bold">Regulatory information</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-3">
              <div><dt className="text-ink-soft">DLD permit number</dt><dd className="font-semibold">{p.permitNumber}</dd></div>
              <div><dt className="text-ink-soft">Agency licence</dt><dd className="font-semibold">{agency.reraOrn}</dd></div>
              <div><dt className="text-ink-soft">Listed on</dt><dd className="font-semibold">{new Date(p.listedAt).toLocaleDateString("en-AE", { day: "numeric", month: "long", year: "numeric" })}</dd></div>
            </dl>
          </section>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <LeadWidget listingId={p.id} listingTitle={p.title} agent={agent} agency={agency} />
        </aside>
      </div>

      {/* Sticky contact bar on phones, where most portal leads come from */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-line bg-white p-3 lg:hidden">
        <a href={`tel:${agent.phone.replace(/\s/g, "")}`} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-creek-700 text-sm font-semibold text-white"><Phone className="size-4" /> Call</a>
        <a href={`/api/leads/whatsapp?listing=${p.id}`} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-whatsapp text-sm font-semibold text-white"><WhatsAppIcon className="size-5" /> WhatsApp</a>
        <a href="#enquire" className="flex h-11 flex-1 items-center justify-center rounded-lg border-2 border-creek-700 text-sm font-semibold text-creek-700">Enquire</a>
      </div>

      <section className="mt-16">
        <h2 className="text-2xl font-bold">Similar homes</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {similar.map((s) => <ListingCard key={s.id} p={s} />)}
        </div>
      </section>
    </div>
  );
}
