"use client";

import { useState } from "react";
import { MapPin, Search } from "lucide-react";
import clsx from "clsx";

const TABS = [
  { key: "SALE", label: "Buy" },
  { key: "RENT", label: "Rent" },
  { key: "PRE_SELLING", label: "Pre-selling" },
  { key: "FORECLOSED", label: "Foreclosed" },
] as const;

const SALE_PRICES = [["2000000", "₱2M"], ["5000000", "₱5M"], ["10000000", "₱10M"], ["20000000", "₱20M"], ["50000000", "₱50M"]];
const RENT_PRICES = [["15000", "₱15,000/mo"], ["25000", "₱25,000/mo"], ["40000", "₱40,000/mo"], ["60000", "₱60,000/mo"], ["100000", "₱100,000/mo"]];

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={clsx("flex min-w-0 flex-col justify-center rounded-xl px-4 py-2 transition-colors focus-within:bg-mist hover:bg-mist", className)}>
      <span className="text-[11px] font-semibold text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

export function PhSearchBox({ popular }: { popular: { label: string; key: string }[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("SALE");
  const prices = tab === "RENT" ? RENT_PRICES : SALE_PRICES;
  const control = "w-full appearance-none bg-transparent text-[15px] font-semibold text-ink placeholder:font-medium placeholder:text-ink-soft/70 focus:outline-none";

  return (
    <div className="mx-auto w-full max-w-4xl">
      <form action="/search" className="rounded-[22px] bg-white/95 p-2 shadow-[0_40px_90px_-30px_rgba(7,29,43,.75)] ring-1 ring-white/60 backdrop-blur-xl">
        <div role="tablist" aria-label="Transaction type" className="no-scrollbar flex gap-0.5 overflow-x-auto border-b border-line px-1 pb-0 sm:gap-1 sm:px-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                "relative shrink-0 whitespace-nowrap rounded-lg px-2.5 pb-3 pt-2 text-sm font-semibold transition-colors sm:px-3.5",
                tab === t.key ? "text-sea-950" : "text-ink-soft hover:text-sea-900",
              )}
            >
              {t.label}
              {tab === t.key && <span className="absolute inset-x-2.5 bottom-0 h-[3px] rounded-full bg-mango-500 sm:inset-x-3.5" />}
            </button>
          ))}
        </div>
        <input type="hidden" name="type" value={tab} />

        <div className="grid grid-cols-2 gap-1 pt-2 md:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] md:divide-x md:divide-line">
          <Field label="Location" className="col-span-2 md:col-span-1">
            <span className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-lagoon-600" />
              <input name="location" placeholder="City, barangay or project" className={control} aria-label="Location" />
            </span>
          </Field>
          <Field label="Property type">
            <select name="propertyType" className={control} defaultValue="">
              <option value="">All types</option>
              <option value="CONDOMINIUM">Condominium</option>
              <option value="TOWNHOUSE">Townhouse</option>
              <option value="HOUSE_AND_LOT">House and Lot</option>
              <option value="LOT_ONLY">Lot Only</option>
              <option value="COMMERCIAL">Commercial</option>
              <option value="AGRICULTURAL">Agricultural</option>
              <option value="WAREHOUSE">Warehouse</option>
            </select>
          </Field>
          <Field label="Max price">
            <select name="maxPrice" className={control} defaultValue="">
              <option value="">Any price</option>
              {prices.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Bedrooms" className="col-span-2 md:col-span-1">
            <select name="beds" className={control} defaultValue="">
              <option value="">Any</option>
              <option value="0">Studio</option>
              {[1, 2, 3, 4].map((b) => <option key={b} value={b}>{b} BR</option>)}
              <option value="5">5+ BR</option>
            </select>
          </Field>
          <div className="col-span-2 flex items-center md:col-span-1 md:border-l-0 md:pl-2">
            <button className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-mango-500 px-7 text-[15px] font-bold text-sea-950 transition-colors hover:bg-mango-400">
              <Search className="size-[18px]" /> Search
            </button>
          </div>
        </div>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm">
        <span className="font-medium text-white/80">Popular:</span>
        {popular.map((p) => (
          <a key={p.key} href={`/search?location=${encodeURIComponent(p.label)}`} className="rounded-full bg-white/15 px-3.5 py-1.5 font-medium text-white ring-1 ring-white/25 backdrop-blur-md transition-colors hover:bg-white/25">
            {p.label}
          </a>
        ))}
      </div>
    </div>
  );
}
