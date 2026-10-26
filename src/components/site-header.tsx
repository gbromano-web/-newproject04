import Link from "next/link";
import { Heart, UserRound } from "lucide-react";
import { Logo } from "./logo";

const nav = [
  { href: "/search?type=SALE", label: "Buy" },
  { href: "/search?type=RENT", label: "Rent" },
  { href: "/search?type=PRE_SELLING", label: "Pre-selling" },
  { href: "/search?type=FORECLOSED", label: "Foreclosed" },
  { href: "/dashboard", label: "Find an agent" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur">
      {/* Sea-to-sunset accent line */}
      <div className="h-1 bg-gradient-to-r from-lagoon-500 via-mango-500 to-coral-500" />
      <div className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-4 sm:px-6">
          <Link href="/" aria-label="SA Realty home">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 text-[15px] font-semibold text-ink-soft md:flex">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-full px-3 py-1.5 transition-colors hover:bg-lagoon-50 hover:text-sea-800">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button className="hidden rounded-full p-2 text-ink-soft hover:bg-lagoon-50 hover:text-coral-500 sm:block" aria-label="Saved properties">
              <Heart className="size-5" />
            </button>
            <button className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-sea-800 hover:bg-lagoon-50">
              <UserRound className="size-4" />
              Sign in
            </button>
            <Link href="/dashboard" className="hidden rounded-full bg-mango-500 px-4 py-2 text-sm font-bold text-sea-950 shadow-sm hover:bg-mango-400 lg:block">
              List a property
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
