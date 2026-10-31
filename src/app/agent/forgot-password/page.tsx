import type { Metadata } from "next";
import { ResetForm } from "../forms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-sea-950">Reset your password</h1>
      <p className="mt-1.5 mb-6 text-sm text-ink-soft">We will email you a link to set a new one. Open it on this device.</p>
      <ResetForm />
    </>
  );
}
