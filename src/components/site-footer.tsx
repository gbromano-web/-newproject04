import Link from "next/link";
import { RATES_AS_OF, RATES_SOURCE } from "@/lib/ph/currency";
import { CurrencySelect } from "./ph/currency";
import { Logo } from "./logo";
import { SAMPLE_DATA, STATIC_PREVIEW } from "@/lib/ph/preview";

const cols = [
  {
    title: "Philippines",
    links: [
      ["Condos for rent in BGC", "/search?type=RENT&location=BGC"],
      ["House and lot in Cavite", "/search?type=SALE&propertyType=HOUSE_AND_LOT&location=Cavite"],
      ["Pre-selling condos in Makati", "/search?type=PRE_SELLING&location=Makati"],
      ["Condos open to foreign buyers", "/search?foreignEligible=1"],
      ["Buying from abroad", "/#buying-from-abroad"],
    ],
  },
  {
    title: "UAE",
    links: [
      ["Apartments in Dubai Marina", "/uae/search?type=SALE&location=Dubai Marina"],
      ["Villas in Dubai Hills Estate", "/uae/search?type=SALE&propertyType=HOUSE_AND_LOT&location=Dubai Hills Estate"],
      ["Off-plan in Abu Dhabi", "/uae/search?type=PRE_SELLING&location=Abu Dhabi"],
      ["Freehold homes", "/uae/search?foreignEligible=1"],
      ["Mortgage calculator", "/uae/calculator"],
    ],
  },
  { title: "For professionals", links: [["Agent sign in", STATIC_PREVIEW ? "/dashboard" : "/agent/sign-in"], ["Get verified", "/contact#agents"], ["Advertise a project", "/contact#developers"]] },
  { title: "Company", links: [["About", "/about"], ["Contact", "/contact"], ["Terms", "/terms"], ["Privacy notice", "/privacy"]] },
];

export function SiteFooter() {
  return (
    <footer className="mt-28 bg-sea-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div className="space-y-4">
          <Logo inverted />
          <p className="max-w-xs text-sm leading-relaxed text-white/65">
            Property in the Philippines and the UAE. Every agent shows a licence or broker registration number you can check.
          </p>
          <CurrencySelect tone="dark" />
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h3 className="mb-4 text-sm font-semibold text-white">{c.title}</h3>
            <ul className="space-y-2.5 text-sm">
              {c.links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} prefetch={href.startsWith("/dashboard") ? false : undefined} className="text-white/60 transition-colors hover:text-white">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-white/45 sm:flex-row sm:justify-between sm:px-6">
          <p>© 2026 Go Search Property.{SAMPLE_DATA && " Sample listings for demonstration."}</p>
          <p>Converted prices are estimates using {RATES_SOURCE}, {RATES_AS_OF}. Transactions are in the local currency: pesos in the Philippines, dirhams in the UAE.</p>
        </div>
      </div>
    </footer>
  );
}
