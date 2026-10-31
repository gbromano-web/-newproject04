"use client";

import { useActionState } from "react";
import Link from "next/link";
import { sendReset, setPassword, signIn, type FormState } from "./actions";

const input =
  "mt-1.5 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-lagoon-600 focus:ring-2 focus:ring-lagoon-600/20";
const label = "block text-sm font-semibold text-ink";
const button =
  "w-full rounded-full bg-sea-900 px-5 py-3 text-sm font-semibold text-white hover:bg-sea-800 disabled:opacity-60";

function Message({ state }: { state: FormState }) {
  if (state.error) return <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-800">{state.error}</p>;
  if (state.ok) return <p role="status" className="rounded-xl bg-lagoon-50 px-3.5 py-2.5 text-sm text-lagoon-700">{state.ok}</p>;
  return null;
}

export function SignInForm({ next, notice }: { next: string; notice?: string }) {
  const [state, action, pending] = useActionState(signIn, notice ? { error: notice } : {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Message state={state} />
      <label className={label}>
        Email
        <input className={input} name="email" type="email" autoComplete="username" required maxLength={254} defaultValue={state.email} />
      </label>
      <label className={label}>
        Password
        <input className={input} name="password" type="password" autoComplete="current-password" required maxLength={200} />
      </label>
      <button className={button} disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
      <p className="text-center text-sm">
        <Link href="/agent/forgot-password" className="font-semibold text-sea-900 hover:text-lagoon-700">Forgot your password?</Link>
      </p>
    </form>
  );
}

export function ResetForm() {
  const [state, action, pending] = useActionState(sendReset, {});
  return (
    <form action={action} className="space-y-4">
      <Message state={state} />
      <label className={label}>
        Email
        <input className={input} name="email" type="email" autoComplete="username" required maxLength={254} defaultValue={state.email} />
      </label>
      <button className={button} disabled={pending}>{pending ? "Sending…" : "Email me a link"}</button>
      <p className="text-center text-sm">
        <Link href="/agent/sign-in" className="font-semibold text-sea-900 hover:text-lagoon-700">Back to sign in</Link>
      </p>
    </form>
  );
}

export function SetPasswordForm() {
  const [state, action, pending] = useActionState(setPassword, {});
  return (
    <form action={action} className="space-y-4">
      <Message state={state} />
      <label className={label}>
        New password
        <input className={input} name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={200} />
        <span className="mt-1 block text-xs font-normal text-ink-soft">At least 10 characters. A short sentence is easy to remember and hard to guess.</span>
      </label>
      <label className={label}>
        Type it again
        <input className={input} name="confirm" type="password" autoComplete="new-password" required minLength={10} maxLength={200} />
      </label>
      <button className={button} disabled={pending}>{pending ? "Saving…" : "Save password"}</button>
    </form>
  );
}
