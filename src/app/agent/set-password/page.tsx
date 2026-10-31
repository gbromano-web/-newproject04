import type { Metadata } from "next";
import { SetPasswordForm } from "../forms";

export const metadata: Metadata = { title: "Set your password" };

/** Reached from an invite or reset link; the proxy sends anyone without a session to sign in. */
export default function SetPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-sea-950">Set your password</h1>
      <p className="mt-1.5 mb-6 text-sm text-ink-soft">You will use it with your email to sign in.</p>
      <SetPasswordForm />
    </>
  );
}
