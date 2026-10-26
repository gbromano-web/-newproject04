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

const SALE_PRICES = ["₱2M", "₱5M", "₱10M", "₱20M", "₱50M", "₱100M+"];
const RENT_PRICES = ["₱15,000/mo", "₱25,000/mo", "₱40,000/mo", "₱60,000/mo", "₱100,000/mo+"];

export function PhSearchBox({ popular }: { popular: { label: string; key: string }[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("SALE");
  const prices = tab === "RENT" ? RENT_PRICES : SALE_PRICES;
  const field = "h-12 w-full appearance-none rounded-xl border border-white/40 bg-white/90 px-3 text-sm font-medium text-slate-900 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/60";

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div role="tablist" aria-label="Transaction type" className="mb-3 flex justify-center gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              tab === t.key ? "bg-white text-[#14214f]" : "text-white/85 hover:bg-white/15",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Glass panel */}
      <form
        action="/search"
        className="rounded-2xl border border-white/30 bg-white/15 p-3 shadow-[0_30px_80px_-30px_rgba(10,12,40,.8)] backdrop-blur-xl sm:p-4"
      >
        <input type="hidden" name="type" value={tab} />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]">
          <label className="relative col-span-2 md:col-span-1">
            <span className="sr-only">Location</span>
            <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#4a2f78]" />
            <input name="location" placeholder="City, barangay or project, e.g. BGC" className={clsx(field, "pl-9")} />
          </label>
          <select name="propertyType" aria-label="Property type" className={field} defaultValue="">
            <option value="">All types</option>
            <option value="CONDOMINIUM">Condominium</option>
            <option value="TOWNHOUSE">Townhouse</option>
            <option value="HOUSE_AND_LOT">House and Lot</option>
            <option value="LOT_ONLY">Lot Only</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="AGRICULTURAL">Agricultural</option>
            <option value="WAREHOUSE">Warehouse</option>
          </select>
          <select name="maxPrice" aria-label="Maximum price" className={field} defaultValue="">
            <option value="">Any price</option>
            {prices.map((p) => <option key={p}>{p}</option>)}
          </select>
          <select name="beds" aria-label="Bedrooms" className={clsx(field, "col-span-2 sm:col-span-1")} defaultValue="">
            <option value="">Any BR</option>
            <option value="0">Studio</option>
            {[1, 2, 3, 4].map((b) => <option key={b} value={b}>{b} BR</option>)}
            <option value="5">5+ BR</option>
          </select>
          <button className="col-span-2 flex h-12 items-center justify-center gap-2 rounded-xl bg-[#f6b83c] px-6 text-sm font-bold text-[#14214f] hover:brightness-105 md:col-span-1">
            <Search className="size-4" /> Search
          </button>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
        <span className="text-white/75">Popular:</span>
        {popular.map((p) => (
          <a key={p.key} href={`/search?location=${encodeURIComponent(p.label)}`} className="rounded-full border border-white/35 bg-white/10 px-3 py-1 font-medium text-white backdrop-blur hover:bg-white/20">
            {p.label}
          </a>
        ))}
      </div>
    </div>
  );
}
