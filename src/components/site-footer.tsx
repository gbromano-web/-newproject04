import Link from "next/link";
import { Logo } from "./logo";

const cols = [
  { title: "Search", links: [["Condos for rent in BGC", "/search?type=RENT&location=BGC"], ["House and lot for sale in Cavite", "/search?type=SALE&propertyType=HOUSE_AND_LOT&location=Cavite"], ["Pre-selling condos in Makati", "/search?type=PRE_SELLING&location=Makati"], ["Foreclosed properties", "/search?type=FORECLOSED"]] },
  { title: "For professionals", links: [["Agent dashboard", "/dashboard"], ["Advertise a project", "/dashboard"], ["Get verified (PRC / DHSUD)", "/dashboard"]] },
  { title: "Company", links: [["About", "/"], ["Contact", "/"], ["Terms", "/"], ["Privacy notice", "/"]] },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-creek-900 text-creek-100">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="space-y-3">
          <Logo inverted />
          <p className="max-w-xs text-sm leading-relaxed text-creek-200">
            Every agent shows their license number, so you can check it before you visit a property.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h3 className="mb-3 font-sans text-sm font-semibold text-white">{c.title}</h3>
            <ul className="space-y-2 text-sm">
              {c.links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="text-creek-200 hover:text-white">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-creek-200">© 2026 SA Realty. Demo data only.</div>
    </footer>
  );
}
