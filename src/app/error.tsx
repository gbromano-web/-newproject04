"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Shown when a page fails to load (for example the database is briefly
 * unreachable), inside the normal header and footer. No error details are
 * shown to visitors: server errors arrive here as a generic message and a
 * digest that matches the server logs.
 */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && "digest" in error ? String((error as { digest?: string }).digest ?? "") : "";
  useEffect(() => {
    console.error("page.error", digest || error);
  }, [error, digest]);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-28 text-center">
      <h1 className="text-3xl font-bold text-sea-950">This page didn&apos;t load</h1>
      <p className="mt-3 text-[16px] leading-relaxed text-ink-soft">
        Something went wrong on our side. Please try again in a moment.
      </p>
      <div className="mt-8 flex gap-3">
        <button onClick={() => retry()} className="rounded-full bg-sea-900 px-5 py-3 text-sm font-semibold text-white hover:bg-sea-800">
          Try again
        </button>
        <Link href="/" className="rounded-full px-5 py-3 text-sm font-semibold text-sea-900 ring-1 ring-line hover:bg-mist">
          Go to the homepage
        </Link>
      </div>
      {digest && <p className="mt-6 text-xs text-ink-soft">Reference: {digest}</p>}
    </div>
  );
}
