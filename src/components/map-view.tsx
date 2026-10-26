import Link from "next/link";
import { Minus, Plus, LocateFixed } from "lucide-react";
import { compactPrice } from "@/lib/search";
import type { Property } from "@/lib/types";

/**
 * Offline stand-in for the interactive map so the demo runs without a tile
 * provider. Production swaps this for MapLibre GL (or Mapbox) with:
 *  - vector tiles from MapTiler / your own tile server
 *  - Supercluster for marker clustering
 *  - "search as I move the map" sending the viewport bbox to Typesense geo filters
 * The projection, clustering and pin rendering below mirror that behaviour.
 */
const BOUNDS = { west: 55.1, east: 55.36, south: 24.97, north: 25.22 };
const W = 800;
const H = 760;

const project = (lat: number, lng: number) => ({
  x: ((lng - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * W,
  y: ((BOUNDS.north - lat) / (BOUNDS.north - BOUNDS.south)) * H,
});

type Cluster = { x: number; y: number; items: Property[] };

function cluster(items: Property[], radius = 56): Cluster[] {
  const out: Cluster[] = [];
  for (const p of items) {
    const pt = project(p.location.lat, p.location.lng);
    const hit = out.find((c) => Math.hypot(c.x - pt.x, c.y - pt.y) < radius);
    if (hit) {
      hit.items.push(p);
      hit.x = (hit.x * (hit.items.length - 1) + pt.x) / hit.items.length;
      hit.y = (hit.y * (hit.items.length - 1) + pt.y) / hit.items.length;
    } else out.push({ ...pt, items: [p] });
  }
  return out;
}

const labels: [string, number, number][] = [
  ["Dubai Marina", 55.165, 25.062], ["JVC", 55.208, 25.05], ["Palm Jumeirah", 55.16, 25.15],
  ["Downtown", 55.282, 25.205], ["Dubai Hills", 55.246, 25.112], ["Al Barsha", 55.2, 25.105],
  ["Arabian Ranches", 55.27, 25.044], ["Town Square", 55.296, 25.002],
];

export function MapView({ items }: { items: Property[] }) {
  const clusters = cluster(items);

  return (
    <div className="relative h-full min-h-[420px] overflow-hidden rounded-xl border border-line bg-[#eef1ea]">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" role="img" aria-label={`Map showing ${items.length} properties`}>
        <rect width={W} height={H} fill="#eef1ea" />
        {/* districts */}
        <g fill="#e3e8de">
          <rect x="300" y="300" width="150" height="120" rx="20" />
          <rect x="420" y="520" width="200" height="150" rx="30" />
          <rect x="180" y="470" width="140" height="120" rx="24" />
        </g>
        <g fill="#cfe3c6">
          <ellipse cx="400" cy="345" rx="40" ry="26" />
          <ellipse cx="620" cy="560" rx="60" ry="30" />
        </g>
        {/* sea */}
        <path d="M0 520 L115 410 Q250 270 369 140 T560 -20 L0 -20 Z" fill="#bcdde2" />
        {/* creek */}
        <path d="M600 -10 Q690 40 760 90 T820 170" stroke="#bcdde2" strokeWidth="24" fill="none" strokeLinecap="round" />
        {/* palm */}
        <g fill="#eef1ea" stroke="#d9dfd4" strokeWidth="2">
          <rect x="150" y="300" width="14" height="70" transform="rotate(42 157 335)" />
          {[-60, -40, -20, 0, 20, 40].map((a) => (
            <rect key={a} x="105" y="290" width="8" height="58" rx="4" transform={`rotate(${a + 42} 128 330)`} />
          ))}
          <path d="M60 300 A70 70 0 0 1 190 240" strokeWidth="8" stroke="#eef1ea" fill="none" />
        </g>
        {/* roads */}
        <g fill="none" strokeLinecap="round">
          <path d="M0 610 L250 360 L560 50 L700 -10" stroke="#fff" strokeWidth="11" />
          <path d="M0 610 L250 360 L560 50 L700 -10" stroke="#f3d48b" strokeWidth="6" />
          <path d="M90 770 L380 450 L650 110" stroke="#fff" strokeWidth="8" />
          <path d="M210 770 L500 470 L790 210" stroke="#fff" strokeWidth="8" />
          <path d="M300 770 L560 520 L810 330" stroke="#fff" strokeWidth="6" />
          <path d="M140 240 L620 680" stroke="#fff" strokeWidth="5" />
          <path d="M330 100 L800 520" stroke="#fff" strokeWidth="5" />
        </g>
        <g fontFamily="var(--font-sans)" fontSize="15" fontWeight="600" fill="#6f7f80">
          {labels.map(([name, lng, lat]) => {
            const { x, y } = project(lat, lng);
            return <text key={name} x={x} y={y} textAnchor="middle">{name}</text>;
          })}
        </g>
        <text x="140" y="120" fontFamily="var(--font-sans)" fontSize="16" fontStyle="italic" fill="#7fa7ad">Arabian Gulf</text>

        {/* Markers live in the SVG so they share its projection when it is cropped to fit */}
        <g fontFamily="var(--font-sans)" fontWeight="700">
          {clusters.map((c) => {
            if (c.items.length > 1) {
              return (
                <g key={c.items[0].id}>
                  <circle cx={c.x} cy={c.y} r="22" fill="var(--color-creek-700)" stroke="#fff" strokeWidth="4" />
                  <text x={c.x} y={c.y + 5} textAnchor="middle" fontSize="15" fill="#fff">{c.items.length}</text>
                </g>
              );
            }
            const p = c.items[0];
            const label = `AED ${compactPrice(p.price)}`;
            const w = label.length * 7.6 + 22;
            const fill = p.featured ? "var(--color-date-500)" : "#fff";
            return (
              <Link key={p.id} href={`/property/${p.slug}`} aria-label={`${p.title}, ${label}`}>
                <g className="cursor-pointer">
                  <rect x={c.x - w / 2} y={c.y - 34} width={w} height="26" rx="13" fill={fill} stroke="#fff" strokeWidth="2" style={{ filter: "drop-shadow(0 2px 3px rgb(0 0 0 / .2))" }} />
                  <path d={`M${c.x - 6} ${c.y - 9} L${c.x} ${c.y - 1} L${c.x + 6} ${c.y - 9} Z`} fill={fill} />
                  <text x={c.x} y={c.y - 16} textAnchor="middle" fontSize="13" fill="var(--color-ink)">{label}</text>
                </g>
              </Link>
            );
          })}
        </g>
      </svg>

      <div className="absolute right-3 top-3 flex flex-col overflow-hidden rounded-lg border border-line bg-white shadow">
        <button className="p-2 hover:bg-mist" aria-label="Zoom in"><Plus className="size-4" /></button>
        <button className="border-t border-line p-2 hover:bg-mist" aria-label="Zoom out"><Minus className="size-4" /></button>
      </div>
      <button className="absolute bottom-3 right-3 rounded-lg border border-line bg-white p-2 shadow hover:bg-mist" aria-label="Near me"><LocateFixed className="size-4" /></button>
      <label className="absolute left-3 top-3 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold shadow">
        <input type="checkbox" defaultChecked className="accent-creek-700" /> Search as I move the map
      </label>
    </div>
  );
}
