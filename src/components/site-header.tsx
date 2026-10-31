import Link from "next/link";
import { STATIC_PREVIEW } from "@/lib/ph/preview";
import { UserRound } from "lucide-react";
import { CurrencySelect } from "./ph/currency";
import { Logo } from "./logo";
import { SavedLink } from "./ph/saved";
import { CountrySwitch, MarketNav } from "./market-nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center gap-3 px-4 sm:gap-8 sm:px-6 xl:gap-10">
        <Link href="/" aria-label="Go Search Property home" className="shrink-0">
          <Logo />
        </Link>
        <MarketNav />
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <CountrySwitch />
          {/* The longer name leaves no room for both the full nav and the currency control between lg and xl */}
          <div className="hidden md:block lg:hidden xl:block">
            <CurrencySelect />
          </div>
          <SavedLink />
          <Link href={STATIC_PREVIEW ? "/dashboard" : "/agent/sign-in"} prefetch={false} className="flex items-center gap-2 whitespace-nowrap rounded-full px-2 py-1.5 text-sm font-semibold text-sea-900 hover:bg-mist sm:px-3" title="Sign in for agents" aria-label="Agent sign in">
            <UserRound className="size-4" />
            <span className="hidden sm:inline">Sign in</span>
          </Link>
          <Link href="/dashboard" prefetch={false} className="hidden whitespace-nowrap rounded-full bg-sea-900 px-4 py-2 text-sm font-semibold text-white hover:bg-sea-800 lg:block">
            List a property
          </Link>
        </div>
      </div>
    </header>
  );
}
