import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { SAMPLE_DATA } from "@/lib/ph/preview";
import { formToken } from "@/lib/server/form-token";
import { SignUpForm } from "./form";

export const metadata: Metadata = { title: "Create an agent account" };

/** Rendered per request: the form carries a signed timestamp used to spot bots. */
async function Form() {
  await connection();
  return <SignUpForm token={formToken("signup")} />;
}

export default function SignUpPage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-sea-950">Create an agent account</h1>
      {SAMPLE_DATA ? (
        <p className="mt-3 text-sm text-ink-soft">
          Agent accounts open when real listings go live. Until then, the <Link href="/dashboard" prefetch={false} className="font-semibold text-sea-900 underline">sample dashboard</Link> shows what agents will see.
        </p>
      ) : (
        <>
          <p className="mt-1.5 mb-6 text-sm text-ink-soft">
            For licensed brokers and salespersons in the Philippines and the UAE. After you confirm your email, we check your licence with the regulator and email you when your account is active.{" "}
            Starter is free, and Pro is free during the launch offer: <Link href="/pricing" className="font-semibold text-sea-900 underline">see plans</Link>.
          </p>
          <Suspense fallback={<div className="h-[56rem]" />}>
            <Form />
          </Suspense>
        </>
      )}
    </>
  );
}
