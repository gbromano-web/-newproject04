import Link from "next/link";
import { Heart, UserRound } from "lucide-react";
import { CurrencySelect } from "./ph/currency";
import { Logo } from "./logo";

const nav = [
  { href: "/search?type=SALE", label: "Buy" },
  { href: "/search?type=RENT", label: "Rent" },
  { href: "/search?type=PRE_SELLING", label: "New projects" },
  { href: "/search?type=FORECLOSED", label: "Foreclosed" },
  { href: "/#buying-from-abroad", label: "Buying from abroad" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center gap-10 px-4 sm:px-6">
        <Link href="/" aria-label="SA Realty home" className="shrink-0">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-7 text-[15px] font-medium text-ink-soft lg:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="transition-colors hover:text-sea-900">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden md:block">
            <CurrencySelect />
          </div>
          <button className="hidden rounded-full p-2 text-ink-soft hover:bg-mist hover:text-sea-900 sm:block" aria-label="Saved properties">
            <Heart className="size-5" />
          </button>
          <button className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-sea-900 hover:bg-mist">
            <UserRound className="size-4" />
            Sign in
          </button>
          <Link href="/dashboard" className="hidden rounded-full bg-sea-900 px-4 py-2 text-sm font-semibold text-white hover:bg-sea-800 sm:block">
            List a property
          </Link>
        </div>
      </div>
    </header>
  );
}
