"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { ChevronDown, Globe2 } from "lucide-react";
import { CURRENCIES, RATES_AS_OF, RATES_SOURCE, convertPeso } from "@/lib/ph/currency";

const STORAGE_KEY = "gsp:currency";

const DEFAULT_CODE = "USD";
const isValid = (c: string | null): c is string => !!c && CURRENCIES.some((x) => x.code === c);

// Tiny external store over localStorage, with an in-memory fallback for
// private windows or blocked storage.
let memory: string | null = null;
const listeners = new Set<() => void>();

function readCode() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isValid(saved)) return saved;
  } catch {
    /* storage unavailable */
  }
  return isValid(memory) ? memory : DEFAULT_CODE;
}

function writeCode(code: string) {
  memory = code;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* keep the in-memory value */
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

const CurrencyContext = createContext<{ code: string; setCode: (c: string) => void }>({ code: DEFAULT_CODE, setCode: writeCode });

/**
 * Remembers the visitor's preferred display currency. Prices are always
 * stored and shown in pesos; the chosen currency adds an estimate beside them.
 * USD is the default second currency because it is the most common reference
 * for overseas Filipinos and foreign buyers.
 */
export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const code = useSyncExternalStore(subscribe, readCode, () => DEFAULT_CODE);
  return <CurrencyContext.Provider value={{ code, setCode: writeCode }}>{children}</CurrencyContext.Provider>;
}

export const useCurrency = () => useContext(CurrencyContext);

/** Header control: "Prices also in USD" */
export function CurrencySelect({ tone = "light" }: { tone?: "light" | "dark" }) {
  const { code, setCode } = useCurrency();
  return (
    <label
      className={`relative flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold ${
        tone === "dark" ? "border-white/20 text-white" : "border-line text-sea-800"
      }`}
      title={`Indicative ${RATES_SOURCE}, ${RATES_AS_OF}`}
    >
      <Globe2 className="size-4 opacity-70" />
      <span className="sr-only">Also show prices in</span>
      <select
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="cursor-pointer appearance-none bg-transparent pr-4 focus:outline-none"
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code} className="text-ink">
            {c.code === "PHP" ? "PHP only" : `PHP + ${c.code}`}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 size-3.5 opacity-60" />
    </label>
  );
}

/** "≈ US$293K" beside a peso price; renders nothing when PHP only is chosen. */
export function ConvertedPrice({ php, className }: { php: number; className?: string }) {
  const { code } = useCurrency();
  const text = convertPeso(php, code);
  if (!text) return null;
  return (
    <span className={className} title={`Indicative, ${RATES_SOURCE} ${RATES_AS_OF}`}>
      {text}
    </span>
  );
}
