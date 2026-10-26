import Link from "next/link";
import { Logo } from "./logo";

const cols = [
  { title: "Search", links: [["Apartments for rent in Dubai", "/search?purpose=rent&type=apartment&location=Dubai"], ["Villas for sale in Dubai", "/search?purpose=buy&type=villa"], ["Townhouses for rent", "/search?purpose=rent&type=townhouse"], ["Studios in JVC", "/search?purpose=rent&beds=0&location=Jumeirah Village Circle"]] },
  { title: "For professionals", links: [["Agent dashboard", "/dashboard"], ["Advertise with us", "/dashboard"], ["Listing feed API", "/dashboard"]] },
  { title: "Company", links: [["About", "/"], ["Contact", "/"], ["Terms", "/"], ["Privacy", "/"]] },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-creek-900 text-creek-100">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="space-y-3">
          <Logo inverted />
          <p className="max-w-xs text-sm leading-relaxed text-creek-200">
            Every listing shows its permit number, so you can check it with the Dubai Land Department before you visit.
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
