"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, MapPin, Search } from "lucide-react";
import clsx from "clsx";
import { locationSuggestions } from "@/lib/mock-data";
import type { SearchFilters } from "@/lib/search";

const RENT_PRICES = [40000, 60000, 80000, 100000, 150000, 200000, 300000];
const BUY_PRICES = [750000, 1000000, 2000000, 3000000, 5000000, 10000000, 20000000];

const fmt = (n: number) => (n >= 1_000_000 ? `${n / 1_000_000}M` : `${n / 1000}K`);

export function SearchBar({ initial, variant = "hero" }: { initial?: Partial<SearchFilters>; variant?: "hero" | "compact" }) {
  const router = useRouter();
  const [purpose, setPurpose] = useState<"rent" | "buy">(initial?.purpose ?? "rent");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [type, setType] = useState(initial?.type ?? "");
  const [beds, setBeds] = useState(initial?.beds ?? "");
  const [minPrice, setMinPrice] = useState(initial?.minPrice ? String(initial.minPrice) : "");
  const [maxPrice, setMaxPrice] = useState(initial?.maxPrice ? String(initial.maxPrice) : "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Production: debounce and query /api/locations (Typesense `locations` collection, prefix search).
  const suggestions = useMemo(() => {
    const q = location.trim().toLowerCase();
    if (!q) return locationSuggestions.filter((s) => s.level !== "Sub-community").slice(0, 6);
    return locationSuggestions.filter((s) => s.label.toLowerCase().includes(q)).slice(0, 6);
  }, [location]);

  const prices = purpose === "rent" ? RENT_PRICES : BUY_PRICES;

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const params = new URLSearchParams({ purpose });
    if (location) params.set("location", location);
    if (type) params.set("type", type);
    if (beds) params.set("beds", beds);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    router.push(`/search?${params.toString()}`);
  }

  const select = "h-12 w-full appearance-none rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink focus:border-creek-500 focus:outline-none";

  return (
    <form onSubmit={submit} className={clsx("w-full", variant === "hero" && "rounded-2xl bg-white p-4 shadow-[0_24px_60px_-20px_rgba(8,52,58,.45)] sm:p-5")}>
      <div role="tablist" aria-label="Purpose" className="mb-4 inline-flex rounded-full bg-mist p-1">
        {(["rent", "buy"] as const).map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={purpose === p}
            onClick={() => { setPurpose(p); setMinPrice(""); setMaxPrice(""); }}
            className={clsx(
              "rounded-full px-5 py-1.5 text-sm font-semibold transition-colors",
              purpose === p ? "bg-creek-700 text-white" : "text-ink-soft hover:text-ink",
            )}
          >
            {p === "rent" ? "Rent" : "Buy"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-[minmax(0,2.2fr)_repeat(4,minmax(0,1fr))_auto]">
        <div className="relative col-span-2 md:col-span-1">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-creek-500" />
          <input
            ref={inputRef}
            value={location}
            onChange={(e) => { setLocation(e.target.value); setOpen(true); setActive(0); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={(e) => {
              if (!open || !suggestions.length) return;
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % suggestions.length); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + suggestions.length) % suggestions.length); }
              if (e.key === "Enter" && open) { e.preventDefault(); setLocation(suggestions[active].label); setOpen(false); }
            }}
            placeholder="City, community or building"
            aria-label="Location"
            aria-autocomplete="list"
            aria-expanded={open}
            role="combobox"
            aria-controls="location-suggestions"
            className="h-12 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm font-medium placeholder:text-ink-soft/70 focus:border-creek-500 focus:outline-none"
          />
          {open && suggestions.length > 0 && (
            <ul id="location-suggestions" role="listbox" className="absolute inset-x-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-xl">
              {suggestions.map((s, i) => (
                <li
                  key={s.label}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={() => { setLocation(s.label); setOpen(false); }}
                  onMouseEnter={() => setActive(i)}
                  className={clsx("flex cursor-pointer items-center gap-3 px-3 py-2 text-sm", i === active && "bg-creek-50")}
                >
                  {s.level === "City" ? <Building2 className="size-4 text-ink-soft" /> : <MapPin className="size-4 text-ink-soft" />}
                  <span className="font-semibold">{s.label}</span>
                  <span className="ml-auto text-xs text-ink-soft">{s.level} in {s.parent}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <select aria-label="Property type" value={type} onChange={(e) => setType(e.target.value)} className={select}>
          <option value="">All types</option>
          <option value="apartment">Apartment</option>
          <option value="villa">Villa</option>
          <option value="townhouse">Townhouse</option>
          <option value="penthouse">Penthouse</option>
        </select>
        <select aria-label="Bedrooms" value={beds} onChange={(e) => setBeds(e.target.value)} className={select}>
          <option value="">Any beds</option>
          <option value="0">Studio</option>
          {[1, 2, 3, 4].map((b) => <option key={b} value={b}>{b} bed{b > 1 ? "s" : ""}</option>)}
          <option value="5">5+ beds</option>
        </select>
        <select aria-label="Minimum price" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className={select}>
          <option value="">Min AED</option>
          {prices.map((p) => <option key={p} value={p}>{fmt(p)}</option>)}
        </select>
        <select aria-label="Maximum price" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className={select}>
          <option value="">Max AED</option>
          {prices.map((p) => <option key={p} value={p}>{fmt(p)}</option>)}
        </select>
        <button type="submit" className="col-span-2 flex h-12 md:col-span-1 items-center justify-center gap-2 rounded-lg bg-creek-700 px-6 text-sm font-semibold text-white hover:bg-creek-900">
          <Search className="size-4" />
          Search
        </button>
      </div>
    </form>
  );
}
