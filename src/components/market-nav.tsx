"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
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

const SWITCH: { code: CountryCode; short: string }[] = [
  { code: "PH", short: "PH" },
  { code: "AE", short: "UAE" },
];

/** Philippines | UAE. Each opens that country's home page. */
export function CountrySwitch() {
  const code = useMarket();
  return (
    <div role="group" aria-label="Country" className="flex shrink-0 rounded-full bg-mist p-0.5 text-xs font-bold">
      {SWITCH.map((s) => {
        const active = s.code === code;
        return (
          <Link
            key={s.code}
            href={MARKETS[s.code].home}
            aria-current={active ? "true" : undefined}
            title={MARKETS[s.code].name === "UAE" ? "United Arab Emirates" : MARKETS[s.code].name}
            onClick={() => remember(s.code)}
            className={clsx("rounded-full px-2 py-1 transition-colors sm:px-2.5", active ? "bg-white text-sea-950 shadow-sm" : "text-ink-soft hover:text-sea-900")}
          >
            {s.short}
          </Link>
        );
      })}
    </div>
  );
}
