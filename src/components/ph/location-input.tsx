"use client";

import { useId, useMemo, useState } from "react";
import { Building2, MapPin, Mountain, Waves } from "lucide-react";
import clsx from "clsx";
import { locationsFor, type LocationLevel } from "@/lib/ph/locations";
import type { CountryCode } from "@/lib/markets";

const FLAT = { PH: locationsFor("PH"), AE: locationsFor("AE") };

const LEVEL_LABEL: Record<CountryCode, Record<LocationLevel, string>> = {
  PH: { REGION: "Region", PROVINCE: "Province", CITY: "City", MUNICIPALITY: "Town", BARANGAY: "Barangay", DISTRICT: "District" },
  AE: { REGION: "Region", PROVINCE: "Emirate", CITY: "City", MUNICIPALITY: "Town", BARANGAY: "Area", DISTRICT: "Community" },
};

/**
 * Location field with suggestions from the Region > Province > City > District
 * tree. Matches names and aliases ("BGC", "The Fort"). Keyboard: arrows,
 * Enter to pick, Escape to close.
 * Production: debounce and query the Typesense `locations` collection instead.
 */
export function LocationInput({
  name = "location",
  defaultValue = "",
  placeholder = "City, barangay or project",
  className,
  inputClassName,
  country = "PH",
}: {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  country?: CountryCode;
}) {
  const flat = FLAT[country];
  const parentName = (key: string | null) => (key ? flat.find((l) => l.key === key)?.name : undefined);
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    const pool = q
      ? flat.filter((l) => l.name.toLowerCase().includes(q) || l.aliases.some((a) => a.toLowerCase().includes(q)))
      : flat.filter((l) => l.isPopular);
    // Prefer names that start with the query, then popular places
    return pool
      .sort((a, b) => Number(b.name.toLowerCase().startsWith(q)) - Number(a.name.toLowerCase().startsWith(q)) || Number(b.isPopular) - Number(a.isPopular))
      .slice(0, 7);
  }, [value, flat]);

  const pick = (label: string) => {
    setValue(label);
    setOpen(false);
  };

  return (
    <div className={clsx("relative", className)}>
      <input
        name={name}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "Escape") return setOpen(false);
          if (!open || suggestions.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % suggestions.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a - 1 + suggestions.length) % suggestions.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(suggestions[active].name);
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-label="Location"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        className={inputClassName}
      />
      {open && suggestions.length > 0 && (
        <ul id={listId} role="listbox" className="absolute left-0 top-[calc(100%+10px)] z-50 w-[min(26rem,calc(100vw-3rem))] overflow-hidden rounded-2xl bg-white py-2 shadow-[0_24px_60px_-20px_rgba(7,29,43,.45)] ring-1 ring-line">
          {!value.trim() && <li className="px-4 pb-1 pt-1 text-xs font-semibold text-ink-soft">Popular places</li>}
          {suggestions.map((s, i) => {
            const Icon = s.level === "DISTRICT" ? Building2 : s.level === "MUNICIPALITY" ? Waves : s.level === "PROVINCE" || s.level === "REGION" ? Mountain : MapPin;
            const parent = parentName(s.parentKey);
            return (
              <li
                key={s.key}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s.name);
                }}
                onMouseEnter={() => setActive(i)}
                className={clsx("flex cursor-pointer items-center gap-3 px-4 py-2.5", i === active && "bg-mist")}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-lagoon-50 text-lagoon-700"><Icon className="size-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">
                    {s.name}
                    {s.aliases[0] && s.aliases[0].length <= 4 && <span className="ml-1.5 font-medium text-ink-soft">{s.aliases[0]}</span>}
                  </span>
                  <span className="block truncate text-xs text-ink-soft">{LEVEL_LABEL[country][s.level]}{parent ? ` in ${parent}` : ""}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
