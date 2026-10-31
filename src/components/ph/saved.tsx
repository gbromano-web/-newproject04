"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Heart, X } from "lucide-react";
import clsx from "clsx";
import { PHOTOS, type ListingImage } from "@/lib/ph/photos";
import { ListingPhoto } from "./listing-photo";

/**
 * Saved properties, kept on this device only (no account needed). Each entry
 * is a small snapshot of the card, so the Saved page works without asking the
 * server; the link still opens the live listing, which says if it is gone.
 */
export type SavedItem = { id: string; slug: string; title: string; price: string; location: string; photo: ListingImage };

const STORAGE_KEY = "gsp:saved";
const MAX_ITEMS = 100;
const EMPTY: SavedItem[] = [];

const str = (v: unknown, max: number) => (typeof v === "string" && v.length > 0 && v.length <= max ? v : null);

/** Storage can be edited by hand, so only well-formed entries with safe image URLs come back out. */
function clean(raw: unknown): SavedItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = str(r.id, 64), slug = str(r.slug, 200), title = str(r.title, 200), price = str(r.price, 60), location = str(r.location, 200);
  if (!id || !slug || !/^[a-z0-9-]+$/i.test(slug) || !title || !price || !location) return null;
  let photo: ListingImage | null = null;
  if (typeof r.photo === "string" && r.photo in PHOTOS) photo = r.photo as ListingImage;
  else if (r.photo && typeof r.photo === "object") {
    const p = r.photo as Record<string, unknown>;
    const src = str(p.src, 1000);
    if (src && (/^https?:\/\//.test(src) || (src.startsWith("/") && !src.startsWith("//")))) {
      photo = { src, alt: str(p.alt, 200) ?? title, photographer: "", profileUrl: "", pageUrl: "", upload: true, fallback: "/images/listings/interior-1.svg" };
    }
  }
  return photo ? { id, slug, title, price, location, photo } : null;
}

let memory: SavedItem[] = EMPTY;
let cachedRaw: string | null | undefined;
let cachedItems: SavedItem[] = EMPTY;
const listeners = new Set<() => void>();

function read(): SavedItem[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return memory; // storage blocked (private window): keep this visit's saves in memory
  }
  if (raw === cachedRaw) return cachedItems; // same snapshot object while nothing changed
  cachedRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cachedItems = Array.isArray(parsed) ? parsed.map(clean).filter((x): x is SavedItem => x !== null).slice(0, MAX_ITEMS) : EMPTY;
  } catch {
    cachedItems = EMPTY;
  }
  return cachedItems;
}

function write(items: SavedItem[]) {
  memory = items;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* keep the in-memory list */
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

const useSaved = () => useSyncExternalStore(subscribe, read, () => EMPTY);

function toggle(item: SavedItem) {
  const items = read();
  write(items.some((x) => x.id === item.id) ? items.filter((x) => x.id !== item.id) : [item, ...items].slice(0, MAX_ITEMS));
}

export function SaveButton({ item, className }: { item: SavedItem; className?: string }) {
  const saved = useSaved().some((x) => x.id === item.id);
  return (
    <button
      type="button"
      onClick={() => toggle(item)}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${item.title} from saved` : `Save ${item.title}`}
      title={saved ? "Saved on this device" : "Save"}
      className={clsx("grid size-9 place-items-center rounded-full bg-white/90 backdrop-blur transition-colors", saved ? "text-coral-500" : "text-sea-900 hover:text-coral-500", className)}
    >
      <Heart className={clsx("size-4", saved && "fill-current")} />
    </button>
  );
}

export function SavedLink() {
  const count = useSaved().length;
  return (
    <Link
      href="/saved"
      prefetch={false}
      aria-label={count ? `Saved properties (${count})` : "Saved properties"}
      className="relative hidden rounded-full p-2 text-ink-soft hover:bg-mist hover:text-sea-900 sm:block"
    >
      <Heart className="size-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-coral-500 px-1 text-[10px] font-bold leading-[18px] text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

export function SavedList() {
  const items = useSaved();
  if (!items.length) {
    return (
      <div className="mt-8 rounded-2xl bg-mist px-6 py-12 text-center">
        <Heart className="mx-auto size-7 text-ink-soft" />
        <p className="mt-3 text-ink">Nothing saved yet.</p>
        <p className="mt-1 text-sm text-ink-soft">Tap the heart on any listing to keep it here.</p>
        <Link href="/search" className="mt-6 inline-block rounded-full bg-sea-900 px-5 py-3 text-sm font-semibold text-white hover:bg-sea-800">Search homes</Link>
      </div>
    );
  }
  return (
    <>
      <ul className="mt-8 divide-y divide-line rounded-2xl bg-white ring-1 ring-line">
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-4 p-4">
            <Link href={`/property/${it.slug}`} className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-mist">
              <ListingPhoto photo={it.photo} sizes="112px" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/property/${it.slug}`} className="line-clamp-2 font-semibold text-ink hover:text-lagoon-700">{it.title}</Link>
              <p className="price mt-0.5 font-semibold text-sea-950">{it.price}</p>
              <p className="truncate text-xs text-ink-soft">{it.location}</p>
            </div>
            <button
              type="button"
              onClick={() => toggle(it)}
              aria-label={`Remove ${it.title} from saved`}
              className="grid size-9 shrink-0 place-items-center rounded-full text-ink-soft ring-1 ring-line hover:bg-mist hover:text-sea-900"
            >
              <X className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-ink-soft">Saved on this device only. Clearing your browser data removes them.</p>
    </>
  );
}
