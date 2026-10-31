import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Continue", robots: { index: false, follow: false }, referrer: "same-origin" };

type Params = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const COPY: Record<string, { title: string; body: string; button: string }> = {
  invite: { title: "Welcome to Go Search Property", body: "Continue to set the password for your agent account.", button: "Continue" },
  recovery: { title: "Reset your password", body: "Continue to choose a new password.", button: "Continue" },
};

async function ContinueForm({ searchParams }: { searchParams: Params }) {
  const p = await searchParams;
  const type = one(p.type);
  const copy = COPY[type] ?? { title: "Confirm your email", body: "Continue to finish signing in.", button: "Continue" };
  return (
    <>
      <h1 className="text-2xl font-bold text-sea-950">{copy.title}</h1>
      <p className="mt-1.5 mb-6 text-sm text-ink-soft">{copy.body}</p>
      {/* The one-time link is used only when this button is pressed, not when the email link is opened */}
      <form method="post" action="/auth/confirm">
        <input type="hidden" name="token_hash" value={one(p.token_hash)} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="next" value={one(p.next)} />
        <button className="w-full rounded-full bg-sea-900 px-5 py-3 text-sm font-semibold text-white hover:bg-sea-800">{copy.button}</button>
      </form>
    </>
  );
}

export default function ContinuePage({ searchParams }: { searchParams: Params }) {
  return (
    <div className="bg-mist/60 px-4 py-14 sm:py-20">
      <div className="mx-auto w-full max-w-[420px] rounded-3xl bg-white p-6 shadow-sm ring-1 ring-line sm:p-8">
        <Suspense fallback={<div className="h-40" />}>
          <ContinueForm searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
