// Illustrated Philippine landscapes used as hero slides and destination
// cards. They stand in for HOME_HERO banner photography (HeroBanner rows)
// until real photos are uploaded. Pure SVG: no requests, sharp at any size.
//
// Every scene takes a `uid` so several can share a page without their
// gradient ids colliding.

type SceneProps = { uid: string; className?: string };

const W = 1600;
const H = 800;

function Svg({ children, className, label }: { children: React.ReactNode; className?: string; label: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className={className ?? "absolute inset-0 h-full w-full"} role="img" aria-label={label}>
      {children}
    </svg>
  );
}

function Palm({ x, ground, s = 1, lean = 20, flip = false }: { x: number; ground: number; s?: number; lean?: number; flip?: boolean }) {
  const h = 230 * s;
  const l = (flip ? -1 : 1) * lean * s;
  const tx = x + l;
  const ty = ground - h;
  const fronds = [-170, -140, -110, -70, -40, -10, 20];
  return (
    <g>
      <path d={`M${x} ${ground} Q${x + l * 0.2} ${ground - h * 0.6} ${tx} ${ty}`} stroke="#1f2a22" strokeWidth={8 * s} fill="none" strokeLinecap="round" />
      {fronds.map((a) => {
        const r = (a * Math.PI) / 180;
        const ex = tx + Math.cos(r) * 120 * s;
        const ey = ty + Math.sin(r) * 50 * s + 55 * s;
        const cx = tx + Math.cos(r) * 70 * s;
        const cy = ty + Math.sin(r) * 60 * s - 25 * s;
        return <path key={a} d={`M${tx} ${ty} Q${cx} ${cy} ${ex} ${ey}`} stroke="#1b3324" strokeWidth={10 * s} fill="none" strokeLinecap="round" />;
      })}
      <circle cx={tx} cy={ty + 8 * s} r={7 * s} fill="#1f2a22" />
    </g>
  );
}

function Clouds({ y = 120, opacity = 0.9 }: { y?: number; opacity?: number }) {
  return (
    <g fill="#fff" opacity={opacity * 0.55} style={{ filter: "blur(18px)" }}>
      {[[180, y], [560, y + 50], [1050, y - 20], [1400, y + 40]].map(([cx, cy], i) => (
        <g key={i}>
          <ellipse cx={cx} cy={cy} rx="90" ry="26" />
          <ellipse cx={cx + 50} cy={cy - 18} rx="60" ry="30" />
          <ellipse cx={cx - 45} cy={cy - 8} rx="45" ry="22" />
        </g>
      ))}
    </g>
  );
}

/** El Nido, Palawan: limestone karsts, turquoise lagoon, bangka, white sand */
function LagoonScene({ uid, className }: SceneProps) {
  return (
    <Svg className={className} label="Illustration of a turquoise lagoon between limestone cliffs in El Nido, Palawan">
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4fc0ea" />
          <stop offset=".55" stopColor="#bfeaf7" />
        </linearGradient>
        <linearGradient id={`${uid}-sea`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a8fa8" />
          <stop offset=".6" stopColor="#14c0bd" />
          <stop offset="1" stopColor="#7fe6d6" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${uid}-sky)`} />
      <Clouds y={130} />
      {/* distant islands */}
      <path d="M380 470 L430 380 L470 400 L510 330 L560 390 L600 360 L650 470 Z" fill="#8bb7ad" opacity=".75" />
      <path d="M900 470 L950 400 L990 410 L1030 350 L1080 410 L1120 470 Z" fill="#8bb7ad" opacity=".7" />
      {/* water */}
      <rect y="460" width={W} height="260" fill={`url(#${uid}-sea)`} />
      <g stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".35">
        <path d="M520 520 H640 M760 500 H860 M980 545 H1120 M600 585 H700 M1200 520 H1260" />
      </g>
      {/* left karst */}
      <path d="M0 480 V120 Q40 80 80 130 L120 95 Q170 70 195 140 L240 180 Q285 160 305 230 L350 280 Q395 285 410 350 L440 480 Z" fill="#3f6f5b" />
      <path d="M0 480 V260 L60 300 L90 250 L150 320 L200 280 L260 350 L320 330 L380 400 L440 480 Z" fill="#8a9b8f" opacity=".7" />
      <path d="M0 140 Q40 80 80 130 L120 95 Q170 70 195 140 L240 180 Q285 160 305 230 L250 230 L200 190 L140 170 L80 180 L0 200 Z" fill="#2c5a43" />
      {/* right karst */}
      <path d="M1600 480 V150 Q1555 110 1515 165 L1470 135 Q1420 120 1400 190 L1350 235 Q1305 245 1290 310 L1235 370 L1200 480 Z" fill="#3f6f5b" />
      <path d="M1600 480 V300 L1550 330 L1500 290 L1440 350 L1380 320 L1320 380 L1260 400 L1200 480 Z" fill="#8a9b8f" opacity=".7" />
      <path d="M1600 155 Q1555 110 1515 165 L1470 135 Q1420 120 1400 190 L1350 235 L1420 235 L1480 210 L1540 205 L1600 215 Z" fill="#2c5a43" />
      {/* bangka */}
      <g transform="translate(790 520)">
        <path d="M-40 -6 Q-90 -10 -120 -2 M40 -6 Q90 -10 120 -2" stroke="#d8c08f" strokeWidth="4" fill="none" />
        <path d="M-120 0 H120" stroke="#d8c08f" strokeWidth="4" />
        <path d="M-80 -18 H80 L60 6 H-60 Z" fill="#fff" />
        <path d="M-74 -10 H74" stroke="#1c7fd1" strokeWidth="5" />
        <path d="M-20 -18 V-48 H30 V-18" fill="#f2554a" />
        <ellipse cx="0" cy="12" rx="90" ry="7" fill="#0a7d93" opacity=".35" />
      </g>
      {/* shallows and sand */}
      <path d="M0 690 Q420 640 820 668 T1600 650 V720 H0 Z" fill="#a8f0e2" opacity=".85" />
      <path d="M0 708 Q420 670 820 694 T1600 680 V800 H0 Z" fill="#f7ead0" />
      <path d="M0 708 Q420 670 820 694 T1600 680" stroke="#fff" strokeWidth="6" fill="none" opacity=".8" />
      <Palm x={90} ground={760} s={1.25} lean={60} />
      <Palm x={1500} ground={770} s={1.1} lean={50} flip />
    </Svg>
  );
}

/** Banaue rice terraces, Ifugao */
function TerracesScene({ uid, className }: SceneProps) {
  const greens = ["#86c55a", "#5fa846", "#9bd469", "#4f9a3f", "#73b950"];
  const bands: { y: number; h: number; amp: number; phase: number }[] = [];
  let y = 330;
  for (let i = 0; i < 16; i++) {
    const h = 16 + i * 4.2;
    bands.push({ y, h, amp: 26 + i * 2, phase: i * 0.55 });
    y += h;
  }
  const edge = (yy: number, amp: number, phase: number) => {
    const pts: string[] = [];
    for (let x = 0; x <= W; x += 40) pts.push(`${x} ${(yy + amp * Math.sin(x / 230 + phase)).toFixed(1)}`);
    return pts;
  };
  return (
    <Svg className={className} label="Illustration of the Banaue rice terraces in Ifugao">
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7cc8ec" />
          <stop offset=".5" stopColor="#e3f4ef" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${uid}-sky)`} />
      <Clouds y={110} opacity={0.8} />
      <path d="M0 330 L180 210 L330 270 L520 160 L720 260 L900 180 L1110 270 L1300 190 L1600 290 V400 H0 Z" fill="#9fc6b4" />
      <path d="M0 360 L220 270 L420 320 L640 240 L860 320 L1080 250 L1320 320 L1600 280 V420 H0 Z" fill="#6fa47f" />
      {bands.map((b, i) => {
        const top = edge(b.y, b.amp, b.phase);
        const bottom = edge(b.y + b.h + 6, b.amp, b.phase).reverse();
        return (
          <g key={i}>
            <path d={`M${top.join(" L")} L${bottom.join(" L")} Z`} fill={greens[i % greens.length]} />
            <path d={`M${top.join(" L")}`} stroke="#d7f3f6" strokeWidth={2 + i * 0.2} fill="none" opacity=".75" />
            <path d={`M${edge(b.y + b.h + 2, b.amp, b.phase).join(" L")}`} stroke="#3c7a33" strokeWidth={3 + i * 0.25} fill="none" opacity=".55" />
          </g>
        );
      })}
      {/* Ifugao hut */}
      <g transform="translate(1420 600)">
        <path d="M-26 0 V40 M26 0 V40 M-12 0 V40 M12 0 V40" stroke="#5b3d22" strokeWidth="5" />
        <rect x="-32" y="-14" width="64" height="16" fill="#7a5530" />
        <path d="M-48 -12 L0 -80 L48 -12 Z" fill="#b8874a" />
        <path d="M-48 -12 L0 -80" stroke="#8e6430" strokeWidth="3" />
      </g>
    </Svg>
  );
}

/** Mayon Volcano, Albay */
function VolcanoScene({ uid, className }: SceneProps) {
  return (
    <Svg className={className} label="Illustration of Mayon Volcano above rice fields in Albay">
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5bb8ea" />
          <stop offset=".6" stopColor="#fde4bd" />
        </linearGradient>
        <linearGradient id={`${uid}-cone`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7d8a99" />
          <stop offset=".55" stopColor="#6f8f78" />
          <stop offset="1" stopColor="#4f8a4b" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${uid}-sky)`} />
      <Clouds y={150} opacity={0.7} />
      {/* plume */}
      <g fill="#fff" opacity=".85">
        <circle cx="830" cy="105" r="26" />
        <circle cx="870" cy="88" r="32" />
        <circle cx="920" cy="80" r="26" />
        <circle cx="965" cy="70" r="20" />
      </g>
      {/* the near-perfect cone with concave flanks */}
      <path d="M260 600 Q690 520 792 132 Q800 118 808 132 Q910 520 1340 600 Z" fill={`url(#${uid}-cone)`} />
      <path d="M792 132 Q800 118 808 132 L830 210 L812 196 L800 230 L786 198 L770 214 Z" fill="#eef2f5" />
      <g stroke="#5d6b78" strokeWidth="3" opacity=".35" fill="none">
        <path d="M800 230 Q760 400 600 560" />
        <path d="M806 240 Q850 420 1000 560" />
        <path d="M796 260 Q790 420 760 580" />
      </g>
      {/* tree line and paddies */}
      <path d="M0 600 Q80 560 160 590 T320 585 T480 592 T640 580 T800 595 T960 582 T1120 592 T1280 580 T1440 590 T1600 578 V640 H0 Z" fill="#2f6e35" />
      <rect y="630" width={W} height="170" fill="#7cbf4f" />
      <g stroke="#a7dc78" strokeWidth="4">
        {[660, 700, 750].map((yy) => <path key={yy} d={`M0 ${yy} L${W} ${yy - 10}`} />)}
        {[200, 520, 900, 1260].map((xx) => <path key={xx} d={`M${xx} 630 L${xx - 120} 800`} />)}
      </g>
      <Palm x={140} ground={720} s={1} lean={30} />
      <Palm x={1450} ground={730} s={1.15} lean={40} flip />
      <Palm x={1340} ground={700} s={0.8} lean={20} flip />
    </Svg>
  );
}

/** Chocolate Hills, Bohol */
function HillsScene({ uid, className }: SceneProps) {
  const rows = [
    { y: 470, n: 15, w: 70, h: 60, c: "#b8a46c" },
    { y: 545, n: 11, w: 100, h: 85, c: "#a68a4f" },
    { y: 640, n: 8, w: 140, h: 115, c: "#93773d" },
    { y: 770, n: 5, w: 210, h: 160, c: "#7f6a33" },
  ];
  return (
    <Svg className={className} label="Illustration of the Chocolate Hills in Bohol">
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6cc3ec" />
          <stop offset=".6" stopColor="#fff1d6" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${uid}-sky)`} />
      <Clouds y={120} opacity={0.85} />
      <rect y="440" width={W} height="360" fill="#6f9f4f" />
      {rows.map((r, ri) =>
        Array.from({ length: r.n }, (_, i) => {
          const step = W / (r.n - 1);
          const x = i * step + ((ri % 2) * step) / 2 - step / 4;
          const h = r.h * (0.85 + ((i * 37 + ri * 11) % 30) / 100);
          return (
            <g key={`${ri}-${i}`}>
              <path d={`M${x - r.w} ${r.y} Q${x} ${r.y - h * 2} ${x + r.w} ${r.y} Z`} fill={r.c} />
              <path d={`M${x - r.w * 0.55} ${r.y - h * 0.55} Q${x} ${r.y - h * 1.35} ${x + r.w * 0.2} ${r.y - h * 0.9}`} stroke="#d9c58f" strokeWidth={3 + ri} fill="none" opacity=".5" />
              <path d={`M${x - r.w} ${r.y} Q${x} ${r.y - 14} ${x + r.w} ${r.y}`} fill="#5f8e45" />
            </g>
          );
        }),
      )}
    </Svg>
  );
}

/** Bonifacio Global City at golden hour */
function CityScene({ uid, className }: SceneProps) {
  const towers: [number, number, number, number][] = [
    [30, 80, 260, 0], [120, 60, 340, 1], [190, 90, 290, 0], [300, 70, 420, 2], [380, 85, 360, 0],
    [480, 60, 300, 1], [550, 100, 470, 3], [665, 75, 390, 0], [750, 60, 330, 2], [820, 95, 500, 1],
    [930, 70, 400, 0], [1010, 85, 340, 0], [1110, 60, 430, 3], [1180, 90, 370, 2], [1285, 70, 310, 0],
    [1365, 80, 390, 1], [1460, 60, 330, 0], [1530, 90, 280, 2],
  ];
  const base = 640;
  const roof = (x: number, w: number, h: number, k: number) => {
    const y = base - h;
    if (k === 1) return `M${x} ${base} V${y + 34} L${x + w} ${y} V${base} Z`;
    if (k === 2) return `M${x} ${base} V${y + 20} L${x + w * 0.2} ${y} H${x + w * 0.8} L${x + w} ${y + 20} V${base} Z`;
    if (k === 3) return `M${x} ${base} V${y + 24} H${x + w * 0.45} L${x + w / 2} ${y - 70} L${x + w * 0.55} ${y + 24} H${x + w} V${base} Z`;
    return `M${x} ${base} V${y} H${x + w} V${base} Z`;
  };
  return (
    <Svg className={className} label="Illustration of the Bonifacio Global City skyline at golden hour">
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a6fb0" />
          <stop offset=".45" stopColor="#f39a6b" />
          <stop offset=".75" stopColor="#ffc95c" />
        </linearGradient>
        <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1f4c74" />
          <stop offset="1" stopColor="#2d6a93" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${uid}-sky)`} />
      <circle cx="1220" cy="520" r="110" fill="#ffe08a" opacity=".9" />
      <g fill="#6c7aa3" opacity=".5">
        {towers.map(([x, w, h], i) => <rect key={i} x={x + 40} y={base - h * 0.65} width={w * 0.8} height={h * 0.65} />)}
      </g>
      <g fill={`url(#${uid}-glass)`}>
        {towers.map(([x, w, h, k], i) => <path key={i} d={roof(x, w, h, k)} />)}
      </g>
      <g fill="#ffd27a" opacity=".85">
        {towers.flatMap(([x, w, h], i) =>
          Array.from({ length: Math.floor(h / 26) }, (_, r) => (
            <rect key={`${i}-${r}`} x={x + 8} y={base - h + 14 + r * 26} width={w - 16} height="3" opacity={(i + r) % 3 === 0 ? 0.9 : 0.25} />
          )),
        )}
      </g>
      {/* High Street park strip */}
      <rect y={base} width={W} height={H - base} fill="#2e6b45" />
      <rect y={base + 40} width={W} height="22" fill="#cdbf9f" />
      {[80, 260, 520, 760, 1000, 1240, 1480].map((x) => (
        <g key={x}>
          <rect x={x - 4} y={base + 6} width="8" height="40" fill="#4a3522" />
          <circle cx={x} cy={base} r="34" fill="#3f8d4c" />
        </g>
      ))}
    </Svg>
  );
}

export const SCENES = {
  lagoon: LagoonScene,
  terraces: TerracesScene,
  volcano: VolcanoScene,
  hills: HillsScene,
  city: CityScene,
} as const;

export type SceneKey = keyof typeof SCENES;
