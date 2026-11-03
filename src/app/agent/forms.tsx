"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { sendReset, setPassword, signIn } from "./actions";

export const input =
  "mt-1.5 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-lagoon-600 focus:ring-2 focus:ring-lagoon-600/20";
export const label = "block text-sm font-semibold text-ink";
export const button =
  "w-full rounded-full bg-sea-900 px-5 py-3 text-sm font-semibold text-white hover:bg-sea-800 disabled:opacity-60";

/**
 * Advisory strength meter: longer passwords and a mix of character kinds score
 * higher. The server's rules (length, breached-password check) are what count.
 */
function strength(pw: string) {
  if (!pw) return { score: 0, label: "" };
  let score = 0;
  if (pw.trim().length >= 12) score++;
  if (pw.length >= 16) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.trim().length < 12) score = Math.min(score, 1);
  return { score, label: ["Too short", "Too short", "Fair", "Good", "Strong", "Very strong"][score] };
}

export function PasswordFields({ minLength = 12 }: { minLength?: number }) {
  const [pw, setPw] = useState("");
  const s = strength(pw);
  return (
    <>
      <label className={label}>
        Password
        <input className={input} name="password" type="password" autoComplete="new-password" required minLength={minLength} maxLength={200} value={pw} onChange={(e) => setPw(e.target.value)} aria-describedby="password-help" />
        <span className="mt-2 flex gap-1" aria-hidden>
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i <= s.score ? (s.score <= 1 ? "bg-coral-500" : s.score <= 2 ? "bg-mango-500" : "bg-lagoon-600") : "bg-mist"}`} />
          ))}
        </span>
        <span id="password-help" className="mt-1 block text-xs font-normal text-ink-soft">
          {s.label ? <span className="font-semibold text-ink">{s.label}. </span> : null}
          At least {minLength} characters. A short sentence is easy to remember and hard to guess. We check it against known data breaches without sending it anywhere.
        </span>
      </label>
      <label className={label}>
        Type it again
        <input className={input} name="confirm" type="password" autoComplete="new-password" required minLength={minLength} maxLength={200} />
      </label>
    </>
  );
}

export function Message({ state }: { state: { error?: string; ok?: string } }) {
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
      <PasswordFields />
      <button className={button} disabled={pending}>{pending ? "Saving…" : "Save password"}</button>
    </form>
  );
}
