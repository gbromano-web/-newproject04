"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Minus, Plus, RotateCcw, X } from "lucide-react";
import { formatListingPrice, formatPeso } from "@/lib/ph/format";
import { PH_MAP_VIEWS, project } from "@/lib/ph/map-geometry";
import { PROPERTY_TYPE_LABEL, type PhListing } from "@/lib/ph/listings";
import { ListingPhoto } from "./listing-photo";

const VIEW = PH_MAP_VIEWS.philippines;
const FULL = { x: 0, y: 0, w: VIEW.width, h: VIEW.height };

const LABELS: [string, number, number][] = [
  ["Luzon", 16.4, 121.5],
  ["Metro Manila", 14.6, 121.35],
  ["Palawan", 9.6, 118.35],
  ["Visayas", 11.25, 124.6],
  ["Cebu", 10.6, 123.55],
  ["Mindanao", 7.6, 124.9],
];

type Box = typeof FULL;
type Cluster = { x: number; y: number; items: PhListing[] };

function cluster(points: (PhListing & { px: number; py: number })[], radius: number): Cluster[] {
  const out: Cluster[] = [];
  for (const p of points) {
    const hit = out.find((c) => Math.hypot(c.x - p.px, c.y - p.py) < radius);
    if (hit) {
      hit.items.push(p);
      hit.x = (hit.x * (hit.items.length - 1) + p.px) / hit.items.length;
      hit.y = (hit.y * (hit.items.length - 1) + p.py) / hit.items.length;
    } else out.push({ x: p.px, y: p.py, items: [p] });
  }
  return out;
}

const shortPrice = (l: PhListing) => (l.listingType === "RENT" ? `${formatPeso(l.price)}/mo` : formatPeso(l.price));

/**
 * Offline-friendly national map: Natural Earth outline, projected at build
 * time, with clustered price pins. Clicking a cluster zooms to it.
 * Production: MapLibre GL with vector tiles and Supercluster for street level,
 * keeping this component's props.
 */
/** A box of width `w` centred on a coordinate, used to open the map zoomed in on one property. */
function boxAround(lat: number, lng: number, w: number): Box {
  const { x, y } = project(VIEW, lat, lng);
  const h = (w * VIEW.height) / VIEW.width;
  return { x: x - w / 2, y: y - h / 2, w, h };
}

export function PhMap({ listings, focus = false }: { listings: PhListing[]; focus?: boolean }) {
  const initial = focus && listings[0] ? boxAround(listings[0].lat, listings[0].lng, VIEW.width / 4) : FULL;
  const [box, setBox] = useState<Box>(initial);
  const [selected, setSelected] = useState<PhListing | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 560, h: 640 });

  // Measure the panel so pins, labels and cluster radius stay constant in screen pixels
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const k = Math.min(size.w / box.w, size.h / box.h); // screen pixels per map unit

  const points = useMemo(
    () =>
      listings.map((l) => {
        const { x, y } = project(VIEW, l.lat, l.lng);
        return { ...l, px: x, py: y };
      }),
    [listings],
  );
  const clusters = useMemo(() => cluster(points, 64 / k), [points, k]);

  const zoomTo = (c: Cluster) => {
    const xs = c.items.map((i) => project(VIEW, i.lat, i.lng).x);
    const ys = c.items.map((i) => project(VIEW, i.lat, i.lng).y);
    const pad = 60 / k;
    const w = Math.max(Math.max(...xs) - Math.min(...xs) + pad * 2, VIEW.width / 14);
    const h = (w * VIEW.height) / VIEW.width;
    setBox({ x: (Math.min(...xs) + Math.max(...xs)) / 2 - w / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 - h / 2, w, h });
  };
  const zoom = (f: number) =>
    setBox((b) => {
      const w = Math.min(VIEW.width, Math.max(VIEW.width / 16, b.w * f));
      const h = (w * VIEW.height) / VIEW.width;
      if (w === VIEW.width) return FULL;
      return { x: b.x + (b.w - w) / 2, y: b.y + (b.h - h) / 2, w, h };
    });

  return (
    <div ref={frame} className="relative h-full min-h-72 overflow-hidden rounded-2xl bg-[#d7e8ee] ring-1 ring-line">
      <svg viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} preserveAspectRatio="xMidYMid meet" className="absolute inset-0 size-full transition-[all] duration-500" role="img" aria-label={`Map of the Philippines showing ${listings.length} listings`}>
        <defs>
          <radialGradient id="sea" cx="50%" cy="45%" r="75%">
            <stop offset="0" stopColor="#e3f0f4" />
            <stop offset="1" stopColor="#c9dfe7" />
          </radialGradient>
        </defs>
        <rect x={-VIEW.width} y={-VIEW.height} width={VIEW.width * 3} height={VIEW.height * 3} fill="url(#sea)" />
        <path d={VIEW.path} fill="#faf8f4" stroke="#9fb7c0" strokeWidth={0.8 / k} strokeLinejoin="round" />
        <g fill="#7b8f97" fontFamily="var(--font-sans)" fontWeight={600} textAnchor="middle">
          {LABELS.map(([name, lat, lng]) => {
            const { x, y } = project(VIEW, lat, lng);
            return (
              <text key={name} x={x} y={y} fontSize={11 / k} letterSpacing={0.3 / k}>
                {name}
              </text>
            );
          })}
        </g>

        {clusters.map((c) => {
          const multi = c.items.length > 1;
          const l = c.items[0];
          const active = !multi && selected?.id === l.id;
          const label = multi ? `${c.items.length} homes` : shortPrice(l);
          const w = label.length * 6.6 + 18;
          return (
            <g
              key={c.items.map((i) => i.id).join("-")}
              transform={`translate(${c.x} ${c.y}) scale(${1 / k})`}
              className="cursor-pointer"
              onClick={() => (multi ? zoomTo(c) : setSelected(l))}
              role="button"
              tabIndex={0}
              aria-label={multi ? `${c.items.length} listings, zoom in` : `${l.title}, ${formatListingPrice(l)}`}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                if (multi) zoomTo(c);
                else setSelected(l);
              }}
            >
              <g style={{ filter: "drop-shadow(0 3px 5px rgb(7 29 43 / .25))" }}>
                <rect x={-w / 2} y={-34} width={w} height={26} rx={13} fill={multi ? "var(--color-sea-900)" : active ? "var(--color-mango-500)" : "#fff"} />
                <path d="M-5 -9 L0 -2 L5 -9 Z" fill={multi ? "var(--color-sea-900)" : active ? "var(--color-mango-500)" : "#fff"} />
              </g>
              <text y={-16.5} textAnchor="middle" fontSize={12} fontWeight={700} fontFamily="var(--font-sans)" fill={multi ? "#fff" : "var(--color-sea-950)"}>
                {label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="absolute right-3 top-3 flex flex-col overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-line">
        <button onClick={() => zoom(0.6)} className="p-2.5 text-sea-900 hover:bg-mist" aria-label="Zoom in"><Plus className="size-4" /></button>
        <button onClick={() => zoom(1.6)} className="border-t border-line p-2.5 text-sea-900 hover:bg-mist" aria-label="Zoom out"><Minus className="size-4" /></button>
        <button onClick={() => { setBox(initial); setSelected(null); }} className="border-t border-line p-2.5 text-sea-900 hover:bg-mist" aria-label={focus ? "Reset map" : "Show all of the Philippines"}><RotateCcw className="size-4" /></button>
      </div>

      {selected && (
        <div className="absolute inset-x-3 bottom-3 flex gap-3 rounded-2xl bg-white p-2.5 shadow-xl ring-1 ring-line">
          <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-mist">
            <ListingPhoto photo={selected.photos[0]} sizes="112px" />
          </div>
          <div className="min-w-0 flex-1 py-0.5">
            <p className="price text-base font-bold text-sea-950">{formatListingPrice(selected)}</p>
            <Link href={`/property/${selected.slug}`} className="line-clamp-1 text-sm font-semibold text-ink hover:text-lagoon-700">{selected.title}</Link>
            <p className="truncate text-xs text-ink-soft">{PROPERTY_TYPE_LABEL[selected.propertyType]}, {selected.locationLabel}</p>
          </div>
          <button onClick={() => setSelected(null)} className="self-start rounded-full p-1 text-ink-soft hover:bg-mist" aria-label="Close preview"><X className="size-4" /></button>
        </div>
      )}
    </div>
  );
}
