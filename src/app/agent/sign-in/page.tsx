import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { SAMPLE_DATA } from "@/lib/ph/preview";
import { safeNext } from "@/lib/server/supabase-config";
import { SignInForm } from "../forms";

export const metadata: Metadata = { title: "Agent sign in" };

const NOTICES: Record<string, string> = {
  link: "That link has expired or was already used. Sign in, or ask for a new link.",
  unavailable: "Sign-in is not available right now. Please try again shortly.",
};

async function Form({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return <SignInForm next={safeNext(one(p.next))} notice={NOTICES[one(p.error) ?? ""]} />;
}

export default function SignInPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <>
      <h1 className="text-2xl font-bold text-sea-950">Agent sign in</h1>
      {SAMPLE_DATA ? (
        <p className="mt-3 text-sm text-ink-soft">
          Agent accounts open when real listings go live. Until then, the <Link href="/dashboard" className="font-semibold text-sea-900 underline">sample dashboard</Link> shows what agents will see.
        </p>
      ) : (
        <>
          <p className="mt-1.5 mb-6 text-sm text-ink-soft">For licensed brokers and salespersons with a Go Search Property account.</p>
          <Suspense fallback={<div className="h-64" />}>
            <Form searchParams={props.searchParams} />
          </Suspense>
          <p className="mt-6 border-t border-line pt-4 text-xs text-ink-soft">
            New agent? Accounts are created by invitation after your PRC licence or DHSUD accreditation is checked.
          </p>
        </>
      )}
    </>
  );
}
