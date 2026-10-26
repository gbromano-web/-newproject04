// Illustrated Manila Bay dusk skyline. Stand-in for the HOME_HERO banner
// photos (HeroBanner rows) until real photography is uploaded to storage.
export function ManilaSkyline() {
  const towers: [number, number, number, "flat" | "slant" | "crown" | "spire"][] = [
    [20, 70, 230, "flat"], [100, 55, 300, "slant"], [165, 80, 260, "flat"], [255, 60, 380, "crown"],
    [325, 75, 320, "flat"], [410, 50, 270, "slant"], [470, 90, 410, "spire"], [570, 65, 340, "flat"],
    [645, 55, 290, "crown"], [710, 85, 450, "slant"], [805, 60, 360, "flat"], [875, 75, 300, "flat"],
    [960, 55, 390, "spire"], [1025, 80, 330, "crown"], [1115, 60, 280, "flat"], [1185, 70, 350, "slant"],
    [1265, 55, 300, "flat"], [1330, 85, 240, "crown"], [1425, 60, 320, "flat"], [1495, 90, 260, "slant"],
  ];
  const base = 470;
  const scale = 0.62; // keep towers low so the dusk sky shows behind the glass search box
  const top = (x: number, w: number, hRaw: number, kind: string) => {
    const h = hRaw * scale;
    const y = base - h;
    if (kind === "slant") return `M${x} ${base} V${y + 30} L${x + w} ${y} V${base} Z`;
    if (kind === "crown") return `M${x} ${base} V${y + 18} L${x + w * 0.2} ${y} H${x + w * 0.8} L${x + w} ${y + 18} V${base} Z`;
    if (kind === "spire") return `M${x} ${base} V${y + 20} H${x + w * 0.45} L${x + w / 2} ${y - 60} L${x + w * 0.55} ${y + 20} H${x + w} V${base} Z`;
    return `M${x} ${base} V${y} H${x + w} V${base} Z`;
  };
  return (
    <svg viewBox="0 0 1600 600" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="ph-dusk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14214f" />
          <stop offset=".3" stopColor="#3a2a6e" />
          <stop offset=".55" stopColor="#a84a7c" />
          <stop offset=".74" stopColor="#f19a4c" />
          <stop offset=".8" stopColor="#f6b83c" />
        </linearGradient>
        <linearGradient id="ph-bay" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5b3a6e" />
          <stop offset="1" stopColor="#14214f" />
        </linearGradient>
      </defs>
      <rect width="1600" height="600" fill="url(#ph-dusk)" />
      <circle cx="1240" cy="440" r="90" fill="#ffd27a" opacity=".85" />
      <g fill="#1a1f45" opacity=".55">
        {towers.map(([x, w, h], i) => <rect key={i} x={x + 30} y={base - h * scale * 0.7} width={w * 0.8} height={h * scale * 0.7} />)}
      </g>
      <g fill="#151a3c">
        {towers.map(([x, w, h, k], i) => <path key={i} d={top(x, w, h, k)} />)}
      </g>
      <g fill="#ffd27a" opacity=".6">
        {towers.flatMap(([x, w, h], i) =>
          Array.from({ length: Math.floor((h * scale) / 70) }, (_, r) => (
            <rect key={`${i}-${r}`} x={x + 8 + ((i * 17 + r * 11) % Math.max(8, w - 20))} y={base - h * scale + 30 + r * 70} width="5" height="8" />
          )),
        )}
      </g>
      <rect y={base} width="1600" height="130" fill="url(#ph-bay)" />
      <g stroke="#ffd27a" strokeWidth="3" strokeLinecap="round" opacity=".55">
        <path d="M1170 492 H1310 M1195 512 H1285 M1215 532 H1265" />
      </g>
    </svg>
  );
}
