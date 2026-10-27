import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-28 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-lagoon-50 text-lagoon-700"><Compass className="size-7" /></span>
      <h1 className="mt-6 text-3xl font-bold text-sea-950">This page isn&apos;t here</h1>
      <p className="mt-3 text-[16px] leading-relaxed text-ink-soft">The listing may have been sold, rented or removed by the agent. Search for similar homes instead.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/search" className="rounded-full bg-sea-900 px-5 py-3 text-sm font-semibold text-white hover:bg-sea-800">Search homes</Link>
        <Link href="/" className="rounded-full px-5 py-3 text-sm font-semibold text-sea-900 ring-1 ring-line hover:bg-mist">Go to the homepage</Link>
      </div>
    </div>
  );
}
