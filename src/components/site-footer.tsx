import Link from "next/link";
import { Logo } from "./logo";

const cols = [
  {
    title: "Search",
    links: [
      ["Condos for rent in BGC", "/search?type=RENT&location=BGC"],
      ["House and lot for sale in Cavite", "/search?type=SALE&propertyType=HOUSE_AND_LOT&location=Cavite"],
      ["Pre-selling condos in Makati", "/search?type=PRE_SELLING&location=Makati"],
      ["Beach lots in Palawan", "/search?type=SALE&propertyType=LOT_ONLY&location=Palawan"],
      ["Foreclosed properties", "/search?type=FORECLOSED"],
    ],
  },
  { title: "For professionals", links: [["Agent dashboard", "/dashboard"], ["Advertise a project", "/dashboard"], ["Get verified (PRC / DHSUD)", "/dashboard"]] },
  { title: "Company", links: [["About", "/"], ["Contact", "/"], ["Terms", "/"], ["Privacy notice", "/"]] },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-24 bg-sea-950 text-sea-100">
      {/* Shoreline edge */}
      <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="absolute -top-[59px] left-0 h-[60px] w-full" aria-hidden>
        <path d="M0 40 C180 10 360 10 540 32 S900 58 1080 34 S1320 8 1440 24 V60 H0 Z" fill="var(--color-lagoon-500)" opacity=".35" />
        <path d="M0 48 C200 26 380 24 560 42 S920 62 1100 44 S1330 26 1440 38 V60 H0 Z" fill="var(--color-sea-950)" />
      </svg>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="space-y-3">
          <Logo inverted />
          <p className="max-w-xs text-sm leading-relaxed text-sea-100/80">
            Homes from the city to the coast. Every agent shows a PRC or DHSUD number you can check before you visit.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h3 className="mb-3 font-sans text-sm font-bold text-mango-400">{c.title}</h3>
            <ul className="space-y-2 text-sm">
              {c.links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="text-sea-100/80 hover:text-white">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-sea-100/60">© 2026 SA Realty. Demo data only.</div>
    </footer>
  );
}
