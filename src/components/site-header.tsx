import Link from "next/link";
import { STATIC_PREVIEW } from "@/lib/ph/preview";
import { UserRound } from "lucide-react";
import { CurrencySelect } from "./ph/currency";
import { Logo } from "./logo";
import { SavedLink } from "./ph/saved";

const nav = [
  { href: "/search?type=SALE", label: "Buy" },
  { href: "/search?type=RENT", label: "Rent" },
  { href: "/search?type=PRE_SELLING", label: "New projects" },
  { href: "/search?type=FORECLOSED", label: "Foreclosed" },
  { href: "/#buying-from-abroad", label: "Buying from abroad", wide: true },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center gap-8 px-4 sm:px-6 xl:gap-10">
        <Link href="/" aria-label="Go Search Property home" className="shrink-0">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-6 whitespace-nowrap text-[15px] font-medium text-ink-soft lg:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={`transition-colors hover:text-sea-900 ${n.wide ? "hidden xl:inline" : ""}`}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {/* The longer name leaves no room for both the full nav and the currency control between lg and xl */}
          <div className="hidden md:block lg:hidden xl:block">
            <CurrencySelect />
          </div>
          <SavedLink />
          <Link href={STATIC_PREVIEW ? "/dashboard" : "/agent/sign-in"} prefetch={false} className="flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold text-sea-900 hover:bg-mist" title="Sign in for agents">
            <UserRound className="size-4" />
            Sign in
          </Link>
          <Link href="/dashboard" prefetch={false} className="hidden whitespace-nowrap rounded-full bg-sea-900 px-4 py-2 text-sm font-semibold text-white hover:bg-sea-800 sm:block">
            List a property
          </Link>
        </div>
      </div>
    </header>
  );
}
