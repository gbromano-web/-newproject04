// Decorative dusk skyline behind the hero search. Pure SVG so it costs no
// image request and stays sharp at every width.
export function HeroSkyline() {
  const towers: [number, number, number][] = [
    [0, 90, 210], [70, 60, 300], [140, 80, 250], [230, 50, 360], [290, 70, 280], [370, 90, 330],
    [470, 60, 260], [540, 40, 420], [590, 80, 310], [880, 70, 340], [960, 50, 270], [1020, 90, 380],
    [1120, 60, 300], [1190, 80, 240], [1280, 70, 350], [1360, 90, 280], [1460, 60, 320], [1530, 90, 230],
  ];
  return (
    <svg viewBox="0 0 1600 560" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#08343a" />
          <stop offset=".55" stopColor="#1d6c75" />
          <stop offset="1" stopColor="#e9b06a" />
        </linearGradient>
        <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0e4a52" />
          <stop offset="1" stopColor="#08343a" />
        </linearGradient>
      </defs>
      <rect width="1600" height="560" fill="url(#dusk)" />
      <circle cx="1210" cy="360" r="70" fill="#f0b54f" opacity=".55" />
      <g fill="#0b3d44">
        {towers.map(([x, w, h]) => (
          <rect key={x} x={x} y={470 - h} width={w} height={h} />
        ))}
        {/* the supertall spire */}
        <path d="M720 470 L720 250 L736 250 L736 150 L748 150 L748 60 L753 10 L758 60 L758 150 L770 150 L770 250 L786 250 L786 470 Z" />
        <path d="M800 470 V200 Q840 150 860 200 V470 Z" />
      </g>
      <g fill="#f0b54f" opacity=".55">
        {towers.flatMap(([x, w, h], i) =>
          Array.from({ length: Math.floor(h / 70) }, (_, r) => (
            <rect key={`${i}-${r}`} x={x + 10 + ((i * 13 + r * 7) % (w - 24))} y={470 - h + 20 + r * 70} width="6" height="9" />
          )),
        )}
      </g>
      <rect y="470" width="1600" height="90" fill="url(#water)" />
      <g stroke="#f0b54f" strokeWidth="2" opacity=".35">
        <path d="M1150 490 H1270 M1170 505 H1250 M1190 520 H1230" />
      </g>
    </svg>
  );
}
