"""Generate illustrated placeholder photos for the demo listings.

Real listings load photos from object storage (S3 / Supabase Storage) through
the image CDN. These SVGs only exist so the demo looks complete offline.
Run: python3 scripts/generate-placeholder-images.py
"""
import random
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "images" / "listings"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1200, 800

SKIES = [
    ("#f6c98f", "#fbe7cf", "#e8954f"),  # late afternoon
    ("#9fd3dd", "#e4f3f2", "#f2c46b"),  # clear morning
    ("#e9a77f", "#f7d9c4", "#d9774a"),  # sunset
    ("#b9d9e8", "#eef6f9", "#f5d27a"),  # haze
]
STONE = ["#efe4d2", "#e6d6bd", "#f3ede3", "#dccbb0", "#ece7df"]
GLASS = ["#5f8e96", "#4b7c86", "#6c9aa1", "#3f6f78"]


def palm(x, ground, s, r):
    h = 150 * s
    lean = r.uniform(-14, 14) * s
    out = [f'<path d="M{x} {ground} Q{x + lean / 2} {ground - h / 2} {x + lean} {ground - h}" '
           f'stroke="#6b4f33" stroke-width="{7 * s:.1f}" fill="none" stroke-linecap="round"/>']
    tx, ty = x + lean, ground - h
    for a in range(-160, 30, 32):
        import math
        rad = math.radians(a)
        ex, ey = tx + math.cos(rad) * 70 * s, ty + math.sin(rad) * 40 * s + 22 * s
        cx, cy = tx + math.cos(rad) * 40 * s, ty + math.sin(rad) * 40 * s - 18 * s
        out.append(f'<path d="M{tx:.0f} {ty:.0f} Q{cx:.0f} {cy:.0f} {ex:.0f} {ey:.0f}" '
                   f'stroke="#3f6b3a" stroke-width="{9 * s:.1f}" fill="none" stroke-linecap="round"/>')
    return "".join(out)


def sky(r):
    top, bottom, sun = r.choice(SKIES)
    sx, sy = r.randint(150, 1050), r.randint(90, 220)
    return (f'<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1">'
            f'<stop offset="0" stop-color="{top}"/><stop offset="1" stop-color="{bottom}"/></linearGradient></defs>'
            f'<rect width="{W}" height="{H}" fill="url(#s)"/>'
            f'<circle cx="{sx}" cy="{sy}" r="58" fill="{sun}" opacity=".85"/>')


def distant_skyline(r, base):
    parts, x = [], -20
    while x < W:
        w = r.randint(40, 90)
        h = r.randint(60, 220)
        parts.append(f'<rect x="{x}" y="{base - h}" width="{w}" height="{h}" fill="#c9cfc9" opacity=".55"/>')
        x += w + r.randint(4, 20)
    return "".join(parts)


def tower(r):
    ground = 640
    g = [sky(r), distant_skyline(r, ground)]
    tx, tw = r.randint(380, 520), r.randint(240, 300)
    top = r.randint(70, 140)
    stone, glass = r.choice(STONE), r.choice(GLASS)
    g.append(f'<rect x="{tx}" y="{top}" width="{tw}" height="{ground - top}" fill="{stone}"/>')
    g.append(f'<rect x="{tx + tw - 40}" y="{top}" width="40" height="{ground - top}" fill="#000" opacity=".08"/>')
    floor_h = 30
    y = top + 24
    while y < ground - 50:
        g.append(f'<rect x="{tx + 14}" y="{y}" width="{tw - 28}" height="{floor_h - 10}" fill="{glass}" opacity=".9"/>')
        g.append(f'<rect x="{tx + 6}" y="{y + floor_h - 10}" width="{tw - 12}" height="5" fill="#fff" opacity=".9"/>')
        y += floor_h
    # second, shorter tower
    sx = tx + tw + 50
    st = top + r.randint(120, 200)
    g.append(f'<rect x="{sx}" y="{st}" width="180" height="{ground - st}" fill="{r.choice(STONE)}"/>')
    y = st + 20
    while y < ground - 40:
        for c in range(4):
            g.append(f'<rect x="{sx + 16 + c * 40}" y="{y}" width="26" height="18" fill="{glass}" opacity=".8"/>')
        y += 30
    g.append(f'<rect y="{ground}" width="{W}" height="{H - ground}" fill="#d8c8a8"/>')
    g.append(f'<rect y="{ground + 40}" width="{W}" height="40" fill="#8d8d88"/>')
    for px in (120, 260, 980, 1110):
        g.append(palm(px, ground + 20, r.uniform(.9, 1.2), r))
    return g


def villa(r):
    ground = 600
    g = [sky(r)]
    stone = r.choice(STONE)
    g.append(f'<rect y="{ground - 30}" width="{W}" height="40" fill="#6f9a62"/>')
    # two-storey modern villa
    g.append(f'<rect x="260" y="330" width="680" height="{ground - 330}" fill="{stone}"/>')
    g.append(f'<rect x="200" y="310" width="800" height="26" fill="#f8f4ee"/>')
    g.append(f'<rect x="520" y="200" width="420" height="140" fill="{r.choice(STONE)}"/>')
    g.append(f'<rect x="490" y="186" width="480" height="22" fill="#f8f4ee"/>')
    glass = r.choice(GLASS)
    g.append(f'<rect x="560" y="226" width="340" height="88" fill="{glass}" opacity=".85"/>')
    for i in range(4):
        g.append(f'<rect x="{300 + i * 150}" y="370" width="110" height="{ground - 400}" fill="{glass}" opacity=".85"/>')
        g.append(f'<rect x="{300 + i * 150 + 53}" y="370" width="4" height="{ground - 400}" fill="#fff" opacity=".6"/>')
    g.append(f'<rect x="300" y="250" width="160" height="60" fill="#7a6a55" opacity=".25"/>')
    # pool
    g.append(f'<rect y="{ground + 10}" width="{W}" height="{H - ground}" fill="#e6d9c0"/>')
    g.append(f'<rect x="240" y="{ground + 50}" width="720" height="90" rx="4" fill="#5cc0cf"/>')
    g.append(f'<rect x="260" y="{ground + 64}" width="680" height="10" fill="#fff" opacity=".35"/>')
    for px in (110, 1080):
        g.append(palm(px, ground + 10, 1.3, r))
    return g


def townhouse(r):
    ground = 610
    g = [sky(r)]
    g.append(f'<rect y="{ground - 20}" width="{W}" height="30" fill="#77a06a"/>')
    x = 70
    for i in range(4):
        stone = STONE[(i + r.randint(0, 4)) % len(STONE)]
        w = 260
        g.append(f'<rect x="{x}" y="300" width="{w}" height="{ground - 300}" fill="{stone}"/>')
        g.append(f'<polygon points="{x - 10},304 {x + w / 2},210 {x + w + 10},304" fill="#9b6b4f"/>')
        glass = r.choice(GLASS)
        g.append(f'<rect x="{x + 30}" y="340" width="80" height="80" fill="{glass}" opacity=".85"/>')
        g.append(f'<rect x="{x + 150}" y="340" width="80" height="80" fill="{glass}" opacity=".85"/>')
        g.append(f'<rect x="{x + 95}" y="460" width="70" height="{ground - 460}" fill="#6b4f3a"/>')
        x += w + 10
    g.append(f'<rect y="{ground + 10}" width="{W}" height="{H - ground}" fill="#cfc3ab"/>')
    for px in (40, 1160):
        g.append(palm(px, ground + 10, 1.1, r))
    return g


def interior(r):
    wall = r.choice(["#efe8dd", "#ebe5db", "#f1ece4"])
    floor = r.choice(["#c9b18f", "#b99c76", "#d8c6a8"])
    g = [f'<rect width="{W}" height="{H}" fill="{wall}"/>',
         f'<rect y="560" width="{W}" height="240" fill="{floor}"/>',
         # floor-to-ceiling window with a view
         f'<rect x="560" y="90" width="560" height="470" fill="#a9d4dc"/>',
         f'<rect x="560" y="380" width="560" height="180" fill="#8fb0b0" opacity=".5"/>']
    for i in range(6):
        h = r.randint(80, 240)
        g.append(f'<rect x="{580 + i * 90}" y="{560 - h}" width="60" height="{h}" fill="#7f979a" opacity=".55"/>')
    for i in range(1, 4):
        g.append(f'<rect x="{560 + i * 140}" y="90" width="6" height="470" fill="#f7f4ef"/>')
    sofa = r.choice(["#55767b", "#8a6f5a", "#6e7d6a"])
    g += [f'<rect x="90" y="450" width="430" height="110" rx="14" fill="{sofa}"/>',
          f'<rect x="90" y="400" width="430" height="70" rx="14" fill="{sofa}" opacity=".85"/>',
          f'<rect x="230" y="600" width="260" height="30" rx="6" fill="#3e3a35"/>',
          f'<rect x="120" y="150" width="300" height="190" fill="#d6c2a3"/>',
          f'<rect x="140" y="170" width="260" height="150" fill="#b79670"/>',
          f'<ellipse cx="360" cy="700" rx="320" ry="40" fill="#fff" opacity=".25"/>']
    return g


def floor_plan(r):
    g = [f'<rect width="{W}" height="{H}" fill="#fbfaf7"/>',
         '<g stroke="#17262a" stroke-width="8" fill="none">',
         '<rect x="150" y="100" width="900" height="600"/>',
         '<path d="M150 380 H520 M520 100 V700 M520 450 H1050 M800 450 V700 M330 380 V700"/>',
         '</g>',
         '<g font-family="sans-serif" font-size="30" fill="#17262a">',
         '<text x="250" y="250">Living / Dining</text>',
         '<text x="700" y="290">Master bedroom</text>',
         '<text x="190" y="560">Kitchen</text>',
         '<text x="370" y="560">Maid room</text>',
         '<text x="590" y="590">Bedroom 2</text>',
         '<text x="860" y="590">Balcony</text>',
         '</g>']
    return g


def write(name, layers):
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}">' + "".join(layers) + "</svg>"
    (OUT / f"{name}.svg").write_text(svg)


makers = {"tower": tower, "villa": villa, "townhouse": townhouse}
for kind, fn in makers.items():
    for i in range(1, 5):
        write(f"{kind}-{i}", fn(random.Random(f"{kind}{i}")))
for i in range(1, 5):
    write(f"interior-{i}", interior(random.Random(f"int{i}")))
write("floor-plan", floor_plan(random.Random(1)))
print("wrote", len(list(OUT.glob("*.svg"))), "images to", OUT)
