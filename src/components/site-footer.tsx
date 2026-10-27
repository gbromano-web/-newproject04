import Link from "next/link";
import { RATES_AS_OF, RATES_SOURCE } from "@/lib/ph/currency";
import { CurrencySelect } from "./ph/currency";
import { Logo } from "./logo";

const cols = [
  {
    title: "Popular searches",
    links: [
      ["Condos for rent in BGC", "/search?type=RENT&location=BGC"],
      ["House and lot in Cavite", "/search?type=SALE&propertyType=HOUSE_AND_LOT&location=Cavite"],
      ["Pre-selling condos in Makati", "/search?type=PRE_SELLING&location=Makati"],
      ["Beach lots in Palawan", "/search?type=SALE&propertyType=LOT_ONLY&location=Palawan"],
      ["Condos in Cebu IT Park", "/search?location=Cebu IT Park"],
    ],
  },
  {
    title: "International buyers",
    links: [
      ["What foreigners can own", "/#buying-from-abroad"],
      ["Condos open to foreign buyers", "/search?foreignEligible=1"],
      ["For overseas Filipinos", "/#buying-from-abroad"],
    ],
  },
  { title: "For professionals", links: [["Agent dashboard", "/dashboard"], ["Advertise a project", "/dashboard"], ["Get verified (PRC / DHSUD)", "/dashboard"]] },
  { title: "Company", links: [["About", "/"], ["Contact", "/"], ["Terms", "/"], ["Privacy notice", "/"]] },
];

export function SiteFooter() {
  return (
    <footer className="mt-28 bg-sea-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div className="space-y-4">
          <Logo inverted />
          <p className="max-w-xs text-sm leading-relaxed text-white/65">
            Property across the Philippines, from Metro Manila to the islands. Every agent shows a PRC or DHSUD number you can check.
          </p>
          <CurrencySelect tone="dark" />
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h3 className="mb-4 text-sm font-semibold text-white">{c.title}</h3>
            <ul className="space-y-2.5 text-sm">
              {c.links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="text-white/60 transition-colors hover:text-white">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-white/45 sm:flex-row sm:justify-between sm:px-6">
          <p>© 2026 SA Realty. Sample listings for demonstration.</p>
          <p>Converted prices are estimates using {RATES_SOURCE}, {RATES_AS_OF}. Transactions are in Philippine pesos.</p>
        </div>
      </div>
    </footer>
  );
}
