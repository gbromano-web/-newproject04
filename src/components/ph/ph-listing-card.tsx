import { BadgeCheck, Bath, BedDouble, Globe2, Heart, LandPlot, MapPin, MessageCircle, Ruler } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons";
import { formatBedrooms, formatListingPrice, formatPricePerSqm, formatSqm, formatTurnover } from "@/lib/ph/format";
import { LISTING_TYPE_LABEL, PROPERTY_TYPE_LABEL, type PhListing } from "@/lib/ph/sample-listings";
import { ConvertedPrice } from "./currency";
import { ListingPhoto } from "./listing-photo";

function StatusTag({ l }: { l: PhListing }) {
  if (l.listingType === "PRE_SELLING")
    return <span className="rounded-full bg-sea-900/85 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">Pre-selling, turnover {formatTurnover(l.turnoverQuarter, l.turnoverYear)}</span>;
  if (l.listingType === "FORECLOSED")
    return <span className="rounded-full bg-coral-600/90 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">Foreclosed by {l.foreclosingInstitution}</span>;
  return <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-sea-900 backdrop-blur">{LISTING_TYPE_LABEL[l.listingType]}</span>;
}

export function PhListingCard({ l }: { l: PhListing }) {
  const area = l.propertyType === "LOT_ONLY" || l.propertyType === "AGRICULTURAL" ? l.lotAreaSqm : l.floorAreaSqm ?? l.lotAreaSqm;
  const showPerSqm = l.listingType !== "RENT" && area;
  const openToForeigners = l.foreignBuyerEligible && l.listingType !== "RENT";

  return (
    <article className="group flex flex-col">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-mist">
        <ListingPhoto photo={l.photo} fallbackSrc={l.image} sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw" />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <StatusTag l={l} />
          <button className="grid size-9 place-items-center rounded-full bg-white/90 text-sea-900 backdrop-blur transition-colors hover:text-coral-500" aria-label={`Save ${l.title}`}>
            <Heart className="size-4" />
          </button>
        </div>
        {openToForeigners && (
          <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-lagoon-700 backdrop-blur">
            <Globe2 className="size-3.5" /> Open to foreign buyers
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-1 pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="price text-[22px] font-bold text-sea-950">{formatListingPrice(l)}</p>
          <ConvertedPrice php={l.price} className="price shrink-0 text-sm font-medium text-ink-soft" />
        </div>
        <h3 className="mt-1 line-clamp-1 text-[15px] font-semibold tracking-normal text-ink">{l.title}</h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-ink-soft"><MapPin className="size-3.5 shrink-0" />{l.locationLabel}</p>

        <ul className="mb-4 mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[13px] text-ink-soft">
          <li className="font-medium text-ink">{PROPERTY_TYPE_LABEL[l.propertyType]}</li>
          {l.bedrooms != null && <li className="flex items-center gap-1"><BedDouble className="size-3.5" />{formatBedrooms(l.bedrooms)}</li>}
          {l.bathrooms != null && <li className="flex items-center gap-1"><Bath className="size-3.5" />{l.bathrooms}</li>}
          {l.floorAreaSqm && <li className="flex items-center gap-1"><Ruler className="size-3.5" />{formatSqm(l.floorAreaSqm)}</li>}
          {l.lotAreaSqm && <li className="flex items-center gap-1"><LandPlot className="size-3.5" />{formatSqm(l.lotAreaSqm)} lot</li>}
          {showPerSqm ? <li className="price">{formatPricePerSqm(l.price / area!)}</li> : null}
        </ul>

        <div className="mt-auto flex items-center gap-2 border-t border-line pt-3">
          <div className="min-w-0 flex-1 text-xs">
            <p className="flex items-center gap-1 font-semibold text-ink">
              {l.agentName}
              {l.agentVerified && <BadgeCheck className="size-3.5 text-lagoon-600" aria-label="Verified agent" />}
            </p>
            <p className="truncate text-ink-soft">{l.agentLicense}</p>
          </div>
          <a href={`/api/ph/leads/viber?listing=${l.id}`} className="grid size-9 place-items-center rounded-full border border-line text-viber transition-colors hover:border-viber/40 hover:bg-viber/5" aria-label="Chat on Viber" title="Chat on Viber">
            <MessageCircle className="size-4" />
          </a>
          <a href={`/api/ph/leads/whatsapp?listing=${l.id}`} className="grid size-9 place-items-center rounded-full border border-line text-whatsapp transition-colors hover:border-whatsapp/40 hover:bg-whatsapp/5" aria-label="Chat on WhatsApp" title="Chat on WhatsApp">
            <WhatsAppIcon className="size-4" />
          </a>
          <a href={`#inquire-${l.id}`} className="rounded-full bg-sea-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-sea-800">
            Inquire
          </a>
        </div>
      </div>
    </article>
  );
}
