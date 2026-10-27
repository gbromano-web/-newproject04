"use client";

import { useState } from "react";
import { List, Map as MapIcon } from "lucide-react";
import type { PhListing } from "@/lib/ph/listings";
import { PhMap } from "./ph-map";

/** Phones: a floating "Map" button opens the map full screen. */
export function MobileMapToggle({ listings }: { listings: PhListing[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      {open && (
        <div className="fixed inset-0 z-40 bg-white p-3 pt-[76px]">
          <PhMap listings={listings} />
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-sea-900 px-5 py-3 text-sm font-semibold text-white shadow-xl"
      >
        {open ? <List className="size-4" /> : <MapIcon className="size-4" />} {open ? "Show list" : "Show map"}
      </button>
    </div>
  );
}
