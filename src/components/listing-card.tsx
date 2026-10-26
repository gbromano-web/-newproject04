import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Bath, BedDouble, Heart, Mail, MapPin, Maximize2, Phone } from "lucide-react";
import { getAgency, getAgent } from "@/lib/mock-data";
import { bedsLabel, formatAED, priceSuffix, typeLabel } from "@/lib/search";
import type { Property } from "@/lib/types";
import { WhatsAppIcon } from "./icons";

export function ListingCard({ p, layout = "grid", priority = false }: { p: Property; layout?: "grid" | "row"; priority?: boolean }) {
  const agent = getAgent(p.agentId);
  const agency = getAgency(agent.agencyId);
  const row = layout === "row";

  return (
    <article className={`group relative overflow-hidden rounded-xl border bg-white ${p.featured ? "border-date-400" : "border-line"} ${row ? "sm:grid sm:grid-cols-[300px_1fr]" : ""}`}>
      <div className={`relative ${row ? "aspect-[4/3] sm:aspect-auto sm:h-full" : "aspect-[4/3]"}`}>
        <Image
          src={p.images[0]}
          alt={p.title}
          fill
          priority={priority}
          sizes={row ? "300px" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
          className="object-cover"
        />
        <div className="absolute left-3 top-3 flex gap-1.5">
          {p.featured && <span className="rounded-md bg-date-500 px-2 py-0.5 text-xs font-bold text-creek-900">Featured</span>}
          {p.completion === "off-plan" && <span className="rounded-md bg-white/95 px-2 py-0.5 text-xs font-bold text-creek-900">Off-plan</span>}
        </div>
        <button className="absolute right-3 top-3 rounded-full bg-white/90 p-1.5 text-ink hover:text-red-600" aria-label={`Save ${p.title}`}>
          <Heart className="size-4" />
        </button>
        <span className="absolute bottom-3 left-3 rounded-md bg-ink/75 px-2 py-0.5 text-xs font-semibold text-white">{p.images.length} photos</span>
      </div>

      <div className="flex flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="font-display text-xl font-bold text-ink">
            AED {formatAED(p.price)}
            <span className="ml-1 font-sans text-sm font-medium text-ink-soft">{priceSuffix(p)}</span>
          </p>
          <span
            className="grid size-8 shrink-0 place-items-center rounded-md text-xs font-bold text-white"
            style={{ background: agency.color }}
            title={agency.name}
          >
            {agency.shortName}
          </span>
        </div>
        <Link href={`/property/${p.slug}`} className="mt-1 line-clamp-1 font-semibold text-ink after:absolute after:inset-0 hover:text-creek-700">
          {p.title}
        </Link>
        <p className="mt-1 flex items-center gap-1 text-sm text-ink-soft">
          <MapPin className="size-3.5 shrink-0" />
          <span className="line-clamp-1">{[p.location.subCommunity, p.location.community, p.location.city].filter(Boolean).join(", ")}</span>
        </p>
        <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-ink">
          <li className="text-ink-soft">{typeLabel[p.type]}</li>
          <li className="flex items-center gap-1"><BedDouble className="size-4 text-creek-500" />{bedsLabel(p.bedrooms)}</li>
          <li className="flex items-center gap-1"><Bath className="size-4 text-creek-500" />{p.bathrooms}</li>
          <li className="flex items-center gap-1"><Maximize2 className="size-4 text-creek-500" />{formatAED(p.areaSqft)} sqft</li>
        </ul>
        {row && <p className="mt-3 line-clamp-2 text-sm text-ink-soft">{p.description}</p>}

        <div className="relative z-10 mt-4 flex items-center gap-2 border-t border-line pt-3">
          {p.verified && (
            <span className="mr-auto flex items-center gap-1 text-xs font-semibold text-creek-500">
              <BadgeCheck className="size-4" /> Verified
            </span>
          )}
          {!p.verified && <span className="mr-auto text-xs text-ink-soft">Listed {p.listedAt.slice(5).replace("-", "/")}</span>}
          <a href={`tel:${agent.phone.replace(/\s/g, "")}`} className="rounded-lg border border-line p-2 text-creek-700 hover:bg-mist" aria-label="Call agent"><Phone className="size-4" /></a>
          <a href={`/api/leads/whatsapp?listing=${p.id}`} className="rounded-lg border border-line p-2 text-whatsapp hover:bg-mist" aria-label="WhatsApp agent"><WhatsAppIcon className="size-4" /></a>
          <a href={`/property/${p.slug}#enquire`} className="rounded-lg border border-line p-2 text-creek-700 hover:bg-mist" aria-label="Email agent"><Mail className="size-4" /></a>
        </div>
      </div>
    </article>
  );
}
