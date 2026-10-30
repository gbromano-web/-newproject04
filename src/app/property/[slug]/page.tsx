import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Bath, BedDouble, Building2, Car, Check, ChevronRight, CircleDollarSign, FileText, Globe2, GraduationCap, Hospital,
  LandPlot, Landmark, MapPin, Mountain, Plane, Ruler, ShoppingBag, Sofa, TrainFront, Trees, Waves,
} from "lucide-react";
import { AmortizationCalculator } from "@/components/ph/amortization-calculator";
import { ContactCard } from "@/components/ph/contact-card";
import { ConvertedPrice } from "@/components/ph/currency";
import { PhListingCard } from "@/components/ph/ph-listing-card";
import { PhMap } from "@/components/ph/ph-map";
import { PropertyGallery } from "@/components/ph/property-gallery";
import { formatBedrooms, formatListingPrice, formatPeso, formatPricePerSqm, formatSqm, formatTurnover } from "@/lib/ph/format";
import { LISTINGS, LISTING_TYPE_LABEL, PROPERTY_TYPE_LABEL, TITLE_TYPE_LABEL, getAgent, getListing, type NearbyPlace, type PhListing } from "@/lib/ph/listings";
import { PHOTOS, photoUrl } from "@/lib/ph/photos";

export function generateStaticParams() {
  return LISTINGS.map((l) => ({ slug: l.slug }));
}

function summary(l: PhListing) {
  const size = l.floorAreaSqm ? formatSqm(l.floorAreaSqm) : l.lotAreaSqm ? `${formatSqm(l.lotAreaSqm)} lot` : "";
  const beds = l.bedrooms !== undefined ? `${formatBedrooms(l.bedrooms)} ` : "";
  return `${beds}${PROPERTY_TYPE_LABEL[l.propertyType].toLowerCase()}, ${LISTING_TYPE_LABEL[l.listingType].toLowerCase()} in ${l.locationLabel}. ${formatListingPrice(l)}${size ? `, ${size}` : ""}.`;
}

export async function generateMetadata(props: PageProps<"/property/[slug]">): Promise<Metadata> {
  const l = getListing((await props.params).slug);
  if (!l) return {};
  const title = `${l.title}, ${l.locationLabel}`;
  const description = summary(l).replace(/^./, (c) => c.toUpperCase());
  return {
    title,
    description,
    alternates: { canonical: `/property/${l.slug}` },
    openGraph: { title, description, url: `/property/${l.slug}`, images: [{ url: photoUrl(PHOTOS[l.photos[0]], 1200), width: 1200, alt: PHOTOS[l.photos[0]].alt }] },
    twitter: { card: "summary_large_image", title, description },
  };
}

const NEARBY_ICON: Record<NearbyPlace["kind"], React.ComponentType<{ className?: string }>> = {
  school: GraduationCap, hospital: Hospital, mall: ShoppingBag, transit: TrainFront, airport: Plane, beach: Waves, park: Trees, church: Landmark,
};

function jsonLd(l: PhListing) {
  const residence = l.propertyType === "CONDOMINIUM" ? "Apartment" : l.propertyType === "LOT_ONLY" ? "Place" : "SingleFamilyResidence";
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: l.title,
    description: l.description,
    url: `/property/${l.slug}`,
    datePosted: l.listedAt,
    image: l.photos.map((p) => photoUrl(PHOTOS[p], 1200)),
    offers: {
      "@type": "Offer",
      price: l.price,
      priceCurrency: "PHP",
      businessFunction: l.listingType === "RENT" ? "http://purl.org/goodrelations/v1#LeaseOut" : "http://purl.org/goodrelations/v1#Sell",
      availability: "https://schema.org/InStock",
    },
    about: {
      "@type": residence,
      ...(l.bedrooms !== undefined && { numberOfRooms: l.bedrooms }),
      ...(l.bathrooms !== undefined && { numberOfBathroomsTotal: l.bathrooms }),
      ...(l.floorAreaSqm && { floorSize: { "@type": "QuantitativeValue", value: l.floorAreaSqm, unitCode: "MTK" } }),
      amenityFeature: l.amenities.map((a) => ({ "@type": "LocationFeatureSpecification", name: a, value: true })),
      address: { "@type": "PostalAddress", addressLocality: l.city, addressRegion: l.province, addressCountry: "PH" },
      geo: { "@type": "GeoCoordinates", latitude: l.lat, longitude: l.lng },
    },
  };
}

export default async function PropertyPage(props: PageProps<"/property/[slug]">) {
  const l = getListing((await props.params).slug);
  if (!l) notFound();
  const agent = getAgent(l.agentId);
  const area = l.propertyType === "LOT_ONLY" || l.propertyType === "AGRICULTURAL" ? l.lotAreaSqm : l.floorAreaSqm ?? l.lotAreaSqm;
  const forSale = l.listingType !== "RENT";
  const similar = LISTINGS.filter((x) => x.id !== l.id && (x.listingType === l.listingType || x.propertyType === l.propertyType)).slice(0, 3);
  const typePath = l.listingType === "RENT" ? "RENT" : l.listingType;

  const facts = [
    { icon: Building2, label: "Property type", value: PROPERTY_TYPE_LABEL[l.propertyType] },
    l.bedrooms !== undefined && { icon: BedDouble, label: "Bedrooms", value: formatBedrooms(l.bedrooms) },
    l.bathrooms !== undefined && { icon: Bath, label: "Bathrooms", value: String(l.bathrooms) },
    l.floorAreaSqm && { icon: Ruler, label: "Floor area", value: formatSqm(l.floorAreaSqm) },
    l.lotAreaSqm && { icon: LandPlot, label: "Lot area", value: formatSqm(l.lotAreaSqm) },
    l.parking !== undefined && { icon: Car, label: "Parking", value: l.parking === 0 ? "None" : `${l.parking} slot${l.parking > 1 ? "s" : ""}` },
    l.furnishing && { icon: Sofa, label: "Furnishing", value: l.furnishing },
    forSale && area && { icon: CircleDollarSign, label: "Price per sqm", value: formatPricePerSqm(l.price / area) },
  ].filter(Boolean) as { icon: React.ComponentType<{ className?: string }>; label: string; value: string }[];

  return (
    <div className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(l)).replace(/</g, "\\u003c") }} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 py-5 text-sm text-ink-soft">
          <Link href="/" className="hover:text-sea-900">Home</Link>
          <ChevronRight className="size-3.5" />
          <Link href={`/search?type=${typePath}`} className="hover:text-sea-900">{LISTING_TYPE_LABEL[l.listingType]}</Link>
          <ChevronRight className="size-3.5" />
          <Link href={`/search?type=${typePath}&location=${encodeURIComponent(l.province)}`} className="hover:text-sea-900">{l.province}</Link>
          <ChevronRight className="size-3.5" />
          <Link href={`/search?type=${typePath}&location=${encodeURIComponent(l.city)}`} className="hover:text-sea-900">{l.city}</Link>
        </nav>

        <PropertyGallery photos={l.photos} title={l.title} />

        <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-12">
            <header>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-sea-900">{LISTING_TYPE_LABEL[l.listingType]}</span>
                {l.listingType === "PRE_SELLING" && <span className="rounded-full bg-sea-900 px-3 py-1 text-xs font-semibold text-white">Turnover {formatTurnover(l.turnoverQuarter, l.turnoverYear)}</span>}
                {l.listingType === "FORECLOSED" && <span className="rounded-full bg-coral-600 px-3 py-1 text-xs font-semibold text-white">Foreclosed by {l.foreclosingInstitution}</span>}
                {l.foreignBuyerEligible && forSale && <span className="flex items-center gap-1 rounded-full bg-lagoon-50 px-3 py-1 text-xs font-semibold text-lagoon-700"><Globe2 className="size-3.5" /> Open to foreign buyers</span>}
              </div>
              <h1 className="mt-4 text-3xl font-bold leading-tight text-sea-950 sm:text-[40px]">{l.title}</h1>
              <p className="mt-2 flex items-center gap-1.5 text-ink-soft"><MapPin className="size-4" />{l.locationLabel}, {l.province}</p>
              <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <p className="price text-4xl font-bold text-sea-950">{formatListingPrice(l)}</p>
                <ConvertedPrice php={l.price} className="price text-lg font-medium text-ink-soft" />
              </div>
            </header>

            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {facts.map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-2xl bg-mist p-5">
                  <Icon className="size-5 text-lagoon-700" />
                  <dt className="mt-3 text-xs text-ink-soft">{label}</dt>
                  <dd className="price mt-0.5 font-semibold text-ink">{value}</dd>
                </div>
              ))}
            </dl>

            <section>
              <h2 className="text-2xl font-bold text-sea-950">About this property</h2>
              <p className="mt-4 max-w-[68ch] text-[16px] leading-[1.75] text-ink-soft">{l.description}</p>
            </section>

            {l.listingType === "PRE_SELLING" && (
              <section className="rounded-3xl bg-sand-50 p-6 ring-1 ring-sand-200 sm:p-8">
                <h2 className="text-2xl font-bold text-sea-950">Payment terms</h2>
                <dl className="mt-5 grid gap-5 sm:grid-cols-3">
                  <div><dt className="text-sm text-ink-soft">Reservation fee</dt><dd className="price mt-1 text-lg font-semibold">{formatPeso(l.reservationFee ?? 0, { compact: false })}</dd></div>
                  <div><dt className="text-sm text-ink-soft">Downpayment</dt><dd className="price mt-1 text-lg font-semibold">{l.downpaymentPercent}% over {l.downpaymentMonths} months</dd><dd className="price text-sm text-ink-soft">about {formatPeso(Math.round((l.price * (l.downpaymentPercent ?? 0)) / 100 / (l.downpaymentMonths ?? 1)), { compact: false })} a month</dd></div>
                  <div><dt className="text-sm text-ink-soft">Balance on turnover</dt><dd className="price mt-1 text-lg font-semibold">{100 - (l.downpaymentPercent ?? 0)}%, {formatTurnover(l.turnoverQuarter, l.turnoverYear)}</dd></div>
                </dl>
                <p className="mt-5 text-xs text-ink-soft">Ask the agent for the project&apos;s DHSUD License to Sell number before paying a reservation fee.</p>
              </section>
            )}

            {l.listingType === "FORECLOSED" && (
              <section className="rounded-3xl bg-coral-400/10 p-6 ring-1 ring-coral-400/30 sm:p-8">
                <h2 className="text-2xl font-bold text-sea-950">Foreclosure details</h2>
                <dl className="mt-5 grid gap-5 sm:grid-cols-3">
                  <div><dt className="text-sm text-ink-soft">Sold by</dt><dd className="mt-1 font-semibold">{l.foreclosingInstitution}</dd></div>
                  <div><dt className="text-sm text-ink-soft">Minimum bid</dt><dd className="price mt-1 font-semibold">{formatPeso(l.minimumBid ?? l.price, { compact: false })}</dd></div>
                  <div><dt className="text-sm text-ink-soft">Occupancy</dt><dd className="mt-1 font-semibold">{l.occupancy}</dd></div>
                </dl>
                <p className="mt-5 text-xs text-ink-soft">Sold as-is-where-is. Inspect the property and check the title before you bid.</p>
              </section>
            )}

            <section>
              <h2 className="text-2xl font-bold text-sea-950">Features and amenities</h2>
              <ul className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2 md:grid-cols-3">
                {l.amenities.map((a) => (
                  <li key={a} className="flex items-center gap-2.5 text-[15px] text-ink"><Check className="size-4 shrink-0 text-lagoon-600" />{a}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-sea-950">Location</h2>
              <div className="mt-5 grid gap-6 md:grid-cols-[1fr_1fr]">
                <ul className="divide-y divide-line self-start rounded-3xl ring-1 ring-line">
                  {l.nearby.map((n) => {
                    const Icon = NEARBY_ICON[n.kind] ?? Mountain;
                    return (
                      <li key={n.name} className="flex items-center gap-3 px-5 py-3.5 text-sm">
                        <Icon className="size-4 shrink-0 text-lagoon-700" />
                        <span className="font-medium text-ink">{n.name}</span>
                        <span className="price ml-auto shrink-0 text-ink-soft">{n.km} km</span>
                      </li>
                    );
                  })}
                </ul>
                <div className="h-80 md:h-auto md:min-h-80">
                  <PhMap listings={[l]} focus />
                </div>
              </div>
              <p className="mt-3 text-xs text-ink-soft">Distances are approximate, in a straight line.</p>
            </section>

            {forSale && <AmortizationCalculator price={l.price} />}

            <section className="rounded-3xl bg-mist p-6 sm:p-8">
              <h2 className="flex items-center gap-2 text-lg font-bold text-sea-950"><FileText className="size-5" /> Listing details</h2>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
                <div><dt className="text-ink-soft">Reference</dt><dd className="mt-0.5 font-semibold">GSP-{l.id.toUpperCase()}</dd></div>
                <div><dt className="text-ink-soft">Listed on</dt><dd className="mt-0.5 font-semibold">{new Date(l.listedAt).toLocaleDateString("en-PH", { day: "numeric", month: "long", year: "numeric" })}</dd></div>
                {l.titleType && <div><dt className="text-ink-soft">Title</dt><dd className="mt-0.5 font-semibold">{TITLE_TYPE_LABEL[l.titleType]}</dd></div>}
              </dl>
            </section>
          </div>

          <aside className="lg:sticky lg:top-[88px] lg:self-start">
            <ContactCard agent={agent} listingId={l.id} listingTitle={l.title} />
          </aside>
        </div>

        {similar.length > 0 && (
          <section className="mt-24">
            <h2 className="text-[28px] font-bold text-sea-950 sm:text-4xl">Similar homes</h2>
            <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((s) => <PhListingCard key={s.id} l={s} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
