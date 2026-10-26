import Link from "next/link";
import { Heart, UserRound } from "lucide-react";
import { Logo } from "./logo";

const nav = [
  { href: "/search?purpose=buy", label: "Buy" },
  { href: "/search?purpose=rent", label: "Rent" },
  { href: "/search?purpose=buy&q=off-plan", label: "New projects" },
  { href: "/dashboard", label: "For agents" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-4 sm:px-6">
        <Link href="/" aria-label="SA Realty home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-6 text-[15px] font-medium text-ink-soft md:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="transition-colors hover:text-creek-700">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button className="hidden rounded-full p-2 text-ink-soft hover:bg-mist sm:block" aria-label="Saved properties">
            <Heart className="size-5" />
          </button>
          <button className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm font-semibold hover:bg-mist">
            <UserRound className="size-4" />
            Sign in
          </button>
          <Link
            href="/dashboard"
            className="hidden rounded-full bg-creek-700 px-4 py-2 text-sm font-semibold text-white hover:bg-creek-900 lg:block"
          >
            List a property
          </Link>
        </div>
      </div>
    </header>
  );
}
