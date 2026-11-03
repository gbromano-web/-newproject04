"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Flag } from "./flags";
import clsx from "clsx";
import { MARKETS, marketFromPath, type CountryCode } from "@/lib/markets";

/**
 * Which country the visitor is browsing. Pages under /uae are the UAE, the
 * Philippine pages are the Philippines; pages that belong to neither (a
 * property, About, Saved) keep the country the visitor was last in, which a
 * property page also sets from its listing.
 */
const STORAGE_KEY = "gsp:market";
let memory: CountryCode = "PH";
const listeners = new Set<() => void>();

const valid = (v: unknown): v is CountryCode => v === "PH" || v === "AE";

function readStored(): CountryCode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (valid(v)) return v;
  } catch {
    /* storage blocked: fall back to this visit's choice */
  }
  return memory;
}

function remember(code: CountryCode) {
  if (readStored() === code) return;
  memory = code;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* keep it in memory */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function useMarket(): CountryCode {
  const path = usePathname() ?? "/";
  const fromPath = marketFromPath(path);
  const stored = useSyncExternalStore(subscribe, readStored, () => "PH" as CountryCode);
  useEffect(() => {
    if (fromPath) remember(fromPath);
  }, [fromPath]);
  return fromPath ?? stored;
}

/** Placed on a property page so the header follows the listing's country. */
export function RememberMarket({ code }: { code: CountryCode }) {
  useEffect(() => remember(code), [code]);
  return null;
}

const NAV: Record<CountryCode, { href: string; label: string; wide?: boolean }[]> = {
  PH: [
    { href: "/search?type=SALE", label: "Buy" },
    { href: "/search?type=RENT", label: "Rent" },
    { href: "/search?type=PRE_SELLING", label: "New projects" },
    { href: "/search?type=FORECLOSED", label: "Foreclosed" },
    { href: "/#buying-from-abroad", label: "Buying from abroad", wide: true },
  ],
  AE: [
    { href: "/uae/search?type=SALE", label: "Buy" },
    { href: "/uae/search?type=RENT", label: "Rent" },
    { href: "/uae/search?type=PRE_SELLING", label: "Off-plan" },
    { href: "/uae/calculator", label: "Mortgage" },
    { href: "/uae#buying-in-the-uae", label: "Buying in the UAE", wide: true },
  ],
};

export function MarketNav() {
  const code = useMarket();
  return (
    <nav aria-label={`${MARKETS[code].name} listings`} className="hidden items-center gap-6 whitespace-nowrap text-[15px] font-medium text-ink-soft lg:flex">
      {NAV[code].map((n) => (
        <Link key={n.href} href={n.href} className={clsx("transition-colors hover:text-sea-900", n.wide && "hidden 2xl:inline")}>
          {n.label}
        </Link>
      ))}
    </nav>
  );
}

const COUNTRIES: { code: CountryCode; short: string; full: string; dial: string }[] = [
  { code: "PH", short: "PH", full: "Philippines", dial: "+63" },
  { code: "AE", short: "UAE", full: "United Arab Emirates", dial: "+971" },
];

/**
 * Country selector: flag, country and calling code. Choosing a country opens
 * its home page; property pages set it from their listing.
 */
export function CountrySwitch() {
  const code = useMarket();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const current = COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={root} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="country-menu"
        aria-label={`Country: ${current.full} (${current.dial}). Change country`}
        className="flex items-center gap-1 rounded-full border border-line px-2 py-1.5 sm:gap-1.5 sm:px-2.5 text-sm font-semibold text-sea-900 hover:bg-mist"
      >
        <Flag code={current.code} />
        <span className="hidden sm:inline">{current.short}</span>
        <span className="price text-xs font-medium text-ink-soft">{current.dial}</span>
        <ChevronDown className={clsx("size-3.5 opacity-60 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul id="country-menu" aria-label="Choose a country" className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl bg-white p-1 shadow-lg ring-1 ring-line">
          {COUNTRIES.map((c) => (
            <li key={c.code}>
              <Link
                href={MARKETS[c.code].home}
                aria-current={c.code === code ? "true" : undefined}
                onClick={() => {
                  remember(c.code);
                  setOpen(false);
                }}
                className={clsx("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-mist", c.code === code ? "font-semibold text-sea-950" : "text-ink")}
              >
                <Flag code={c.code} className="h-4 w-6" />
                <span className="flex-1">{c.full}</span>
                <span className="price text-xs text-ink-soft">{c.dial}</span>
                {c.code === code && <Check className="size-4 text-lagoon-600" aria-hidden />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
