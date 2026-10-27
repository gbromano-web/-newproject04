"use client";

import { withBase } from "@/lib/ph/preview";
import { useState } from "react";
import { Globe2, Search, SlidersHorizontal, X } from "lucide-react";
import clsx from "clsx";
import type { SearchFilters } from "@/lib/ph/search";
import { LocationInput } from "./location-input";

const TYPES = [
  { key: "", label: "All" },
  { key: "SALE", label: "Buy" },
  { key: "RENT", label: "Rent" },
  { key: "PRE_SELLING", label: "Pre-selling" },
  { key: "FORECLOSED", label: "Foreclosed" },
] as const;

const SALE_STEPS = [1_000_000, 2_000_000, 3_000_000, 5_000_000, 10_000_000, 20_000_000, 50_000_000, 100_000_000];
const RENT_STEPS = [10_000, 15_000, 25_000, 40_000, 60_000, 100_000, 200_000];

const fmt = (n: number, rent: boolean) => (n >= 1_000_000 ? `₱${n / 1_000_000}M` : `₱${n.toLocaleString("en-PH")}${rent ? "/mo" : ""}`);

/**
 * One GET form drives every filter, so search works without JavaScript and
 * each result set has its own shareable URL.
 */
export function FilterBar({ initial, resultCount }: { initial: SearchFilters; resultCount: number }) {
  const [type, setType] = useState<string>(initial.type ?? "");
  const [drawer, setDrawer] = useState(false);
  const rent = type === "RENT";
  const steps = rent ? RENT_STEPS : SALE_STEPS;
  const select = "h-11 w-full appearance-none rounded-xl bg-mist px-3.5 text-sm font-semibold text-ink ring-1 ring-transparent transition focus:bg-white focus:outline-none focus:ring-lagoon-500";
  const advancedCount = [initial.minPrice !== undefined, initial.foreignEligible].filter(Boolean).length;

  return (
    <form action={withBase("/search")} className="border-b border-line bg-white">
      <input type="hidden" name="type" value={type} />
      {initial.sort !== "featured" && <input type="hidden" name="sort" value={initial.sort} />}
      <div className="mx-auto max-w-[1440px] space-y-3 px-4 py-4 sm:px-6">
        <div role="tablist" aria-label="Transaction type" className="no-scrollbar flex gap-1 overflow-x-auto">
          {TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={type === t.key}
              onClick={() => setType(t.key)}
              className={clsx(
                "shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                type === t.key ? "bg-sea-900 text-white" : "text-ink-soft hover:bg-mist hover:text-sea-900",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto_auto]">
          <LocationInput
            defaultValue={initial.location ?? ""}
            className="col-span-2 md:col-span-1"
            inputClassName={clsx(select, "font-medium placeholder:text-ink-soft/70")}
            placeholder="City, barangay, district or project"
          />
          <select name="propertyType" defaultValue={initial.propertyType ?? ""} aria-label="Property type" className={select}>
            <option value="">All types</option>
            <option value="CONDOMINIUM">Condominium</option>
            <option value="TOWNHOUSE">Townhouse</option>
            <option value="HOUSE_AND_LOT">House and Lot</option>
            <option value="LOT_ONLY">Lot Only</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="AGRICULTURAL">Agricultural</option>
            <option value="WAREHOUSE">Warehouse</option>
          </select>
          <select name="maxPrice" defaultValue={initial.maxPrice ?? ""} aria-label="Maximum price" className={select}>
            <option value="">Any price</option>
            {steps.map((v) => <option key={v} value={v}>Up to {fmt(v, rent)}</option>)}
          </select>
          <select name="beds" defaultValue={initial.beds ?? ""} aria-label="Bedrooms" className={clsx(select, "col-span-2 md:col-span-1")}>
            <option value="">Any bedrooms</option>
            <option value="0">Studio</option>
            {[1, 2, 3, 4].map((b) => <option key={b} value={b}>{b} BR</option>)}
            <option value="5">5+ BR</option>
          </select>
          <button type="button" onClick={() => setDrawer(true)} className="flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-sea-900 ring-1 ring-line hover:bg-mist">
            <SlidersHorizontal className="size-4" /> Filters
            {advancedCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-sea-900 text-[11px] text-white">{advancedCount}</span>}
          </button>
          <button className="flex h-11 items-center justify-center gap-2 rounded-xl bg-mango-500 px-6 text-sm font-bold text-sea-950 hover:bg-mango-400">
            <Search className="size-4" /> Search
          </button>
        </div>
      </div>

      {/* More filters drawer */}
      <div className={clsx("fixed inset-0 z-50 transition", drawer ? "visible" : "invisible")} aria-hidden={!drawer}>
        <div onClick={() => setDrawer(false)} className={clsx("absolute inset-0 bg-sea-950/40 transition-opacity", drawer ? "opacity-100" : "opacity-0")} />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="More filters"
          className={clsx("absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300", drawer ? "translate-x-0" : "translate-x-full")}
        >
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <p className="text-lg font-bold text-sea-950">More filters</p>
            <button type="button" onClick={() => setDrawer(false)} className="rounded-full p-2 hover:bg-mist" aria-label="Close filters"><X className="size-5" /></button>
          </div>
          <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
            <fieldset>
              <legend className="text-sm font-semibold text-ink">Minimum price</legend>
              <select name="minPrice" defaultValue={initial.minPrice ?? ""} className={clsx(select, "mt-3")}>
                <option value="">No minimum</option>
                {steps.map((v) => <option key={v} value={v}>From {fmt(v, rent)}</option>)}
              </select>
            </fieldset>
            <fieldset>
              <legend className="text-sm font-semibold text-ink">International buyers</legend>
              <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl p-4 ring-1 ring-line has-[:checked]:bg-lagoon-50 has-[:checked]:ring-lagoon-500">
                <input type="checkbox" name="foreignEligible" value="1" defaultChecked={initial.foreignEligible} className="mt-0.5 size-4 accent-[var(--color-lagoon-600)]" />
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-ink"><Globe2 className="size-4 text-lagoon-700" /> Only condos open to foreign buyers</span>
                  <span className="mt-1 block text-sm text-ink-soft">Units the agent confirms are within the building&apos;s 40% foreign-ownership quota.</span>
                </span>
              </label>
            </fieldset>
          </div>
          <div className="flex items-center gap-3 border-t border-line px-6 py-4">
            <a href={withBase("/search")} className="text-sm font-semibold text-ink-soft underline-offset-2 hover:text-sea-900 hover:underline">Clear all</a>
            <button className="ml-auto rounded-full bg-sea-900 px-6 py-3 text-sm font-semibold text-white hover:bg-sea-800">
              Show results
            </button>
          </div>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{resultCount} results</p>
    </form>
  );
}
