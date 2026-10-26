import Image from "next/image";
import { Bath, BedDouble, Heart, LandPlot, Mail, MapPin, MessageCircle, Ruler, ShieldCheck } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons";
import { formatBedrooms, formatListingPrice, formatPricePerSqm, formatSqm, formatTurnover } from "@/lib/ph/format";
import { PROPERTY_TYPE_LABEL, type PhListing } from "@/lib/ph/sample-listings";

function Badge({ l }: { l: PhListing }) {
  if (l.listingType === "PRE_SELLING")
    return <span className="rounded-md bg-lagoon-600 px-2 py-0.5 text-xs font-bold text-white">Pre-selling, turnover {formatTurnover(l.turnoverQuarter, l.turnoverYear)}</span>;
  if (l.listingType === "FORECLOSED")
    return <span className="rounded-md bg-coral-600 px-2 py-0.5 text-xs font-bold text-white">Foreclosed by {l.foreclosingInstitution}</span>;
  if (l.listingType === "RENT") return <span className="rounded-md bg-white/95 px-2 py-0.5 text-xs font-bold text-sea-900">For rent</span>;
  return <span className="rounded-md bg-white/95 px-2 py-0.5 text-xs font-bold text-sea-900">For sale</span>;
}

export function PhListingCard({ l }: { l: PhListing }) {
  const area = l.propertyType === "LOT_ONLY" || l.propertyType === "AGRICULTURAL" ? l.lotAreaSqm : l.floorAreaSqm ?? l.lotAreaSqm;
  const showPerSqm = l.listingType !== "RENT" && area;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
      <div className="relative aspect-[4/3]">
        <Image src={l.image} alt={l.title} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
        <div className="absolute left-3 top-3"><Badge l={l} /></div>
        <button className="absolute right-3 top-3 rounded-full bg-white/90 p-1.5 text-ink hover:text-rose-600" aria-label={`Save ${l.title}`}>
          <Heart className="size-4" />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-display text-2xl font-bold text-sea-900">{formatListingPrice(l)}</p>
          {showPerSqm ? <p className="text-xs text-ink-soft">{formatPricePerSqm(l.price / area!)}</p> : null}
        </div>
        <h3 className="mt-1 line-clamp-1 font-sans text-base font-semibold text-ink">{l.title}</h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-ink-soft"><MapPin className="size-3.5" />{l.locationLabel}</p>

        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium text-ink">
          <li className="text-ink-soft">{PROPERTY_TYPE_LABEL[l.propertyType]}</li>
          {l.bedrooms != null && <li className="flex items-center gap-1"><BedDouble className="size-4 text-lagoon-600" />{formatBedrooms(l.bedrooms)}</li>}
          {l.bathrooms != null && <li className="flex items-center gap-1"><Bath className="size-4 text-lagoon-600" />{l.bathrooms} bath</li>}
          {l.floorAreaSqm && <li className="flex items-center gap-1"><Ruler className="size-4 text-lagoon-600" />{formatSqm(l.floorAreaSqm)}</li>}
          {l.lotAreaSqm && <li className="flex items-center gap-1"><LandPlot className="size-4 text-lagoon-600" />{formatSqm(l.lotAreaSqm)} lot</li>}
        </ul>

        <div className="mt-4 flex items-center gap-2 border-t border-line pt-3 text-xs">
          {l.agentVerified ? <ShieldCheck className="size-4 shrink-0 text-emerald-600" aria-label="Verified agent" /> : <ShieldCheck className="size-4 shrink-0 text-slate-300" aria-label="Not yet verified" />}
          <span className="truncate text-ink-soft"><span className="font-semibold text-ink">{l.agentName}</span>, {l.agentLicense}</span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <a href={`/api/ph/leads/viber?listing=${l.id}`} className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-viber text-sm font-semibold text-white hover:brightness-110">
            <MessageCircle className="size-4" /> Viber
          </a>
          <a href={`/api/ph/leads/whatsapp?listing=${l.id}`} className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-whatsapp text-sm font-semibold text-white hover:brightness-110">
            <WhatsAppIcon className="size-4" /> WhatsApp
          </a>
          <a href={`#inquire-${l.id}`} className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-line text-sm font-semibold text-ink hover:bg-lagoon-50">
            <Mail className="size-4" /> Inquire
          </a>
        </div>
      </div>
    </article>
  );
}
