"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { PhoneInput } from "@/components/phone-input";
import { EMIRATE_REGULATORS } from "@/lib/uae/regulators";
import { Message, PasswordFields, button, input, label } from "../forms";
import { signUp, type SignUpState } from "./actions";

const hint = "mt-1 block text-xs font-normal text-ink-soft";

export function SignUpForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<SignUpState, FormData>(signUp, {});
  const v = state.values ?? {};
  const [country, setCountry] = useState(v.country === "AE" ? "AE" : "PH");
  const [licenseType, setLicenseType] = useState(v.licenseType === "REAL_ESTATE_SALESPERSON" ? "REAL_ESTATE_SALESPERSON" : "REAL_ESTATE_BROKER");
  const [emirate, setEmirate] = useState(v.emirate || "Dubai");
  const reg = EMIRATE_REGULATORS.find((e) => e.emirate === emirate);

  if (state.ok) {
    return (
      <div className="space-y-4">
        <Message state={state} />
        <p className="text-sm text-ink-soft">
          Wrong email? <Link href="/agent/sign-up" className="font-semibold text-sea-900 underline">Start again</Link>. Already confirmed?{" "}
          <Link href="/agent/sign-in" className="font-semibold text-sea-900 underline">Sign in</Link>.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate={false}>
      <Message state={state} />
      <input type="hidden" name="t" value={token} />
      {/* Bot trap: hidden from people and screen readers */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] size-px opacity-0" />

      <fieldset>
        <legend className={label}>Where are you licensed?</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {[["PH", "Philippines"], ["AE", "UAE"]].map(([code, name]) => (
            <label key={code} className={`flex cursor-pointer items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-semibold ${country === code ? "border-sea-900 bg-sea-50 text-sea-950" : "border-line text-ink-soft"}`}>
              <input type="radio" name="country" value={code} checked={country === code} onChange={() => setCountry(code)} className="sr-only" />
              {name}
            </label>
          ))}
        </div>
      </fieldset>

      <label className={label}>
        Full name
        <input className={input} name="fullName" autoComplete="name" required maxLength={100} defaultValue={v.fullName} />
        <span className={hint}>As it appears on your licence.</span>
      </label>
      <label className={label}>
        Email
        <input className={input} name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={v.email} />
      </label>
      <div className={label}>
        Mobile
        <PhoneInput key={country} name="mobile" defaultCountry={country} required inputClassName={input} />
      </div>

      {country === "PH" ? (
        <>
          <label className={label}>
            Licence
            <select className={input} name="licenseType" value={licenseType} onChange={(e) => setLicenseType(e.target.value)}>
              <option value="REAL_ESTATE_BROKER">Real estate broker (PRC)</option>
              <option value="REAL_ESTATE_SALESPERSON">Real estate salesperson (DHSUD)</option>
            </select>
          </label>
          {licenseType === "REAL_ESTATE_BROKER" ? (
            <label className={label}>
              PRC licence number
              <input className={input} name="prc" inputMode="numeric" required maxLength={7} defaultValue={v.prc} />
            </label>
          ) : (
            <>
              <label className={label}>
                DHSUD accreditation number
                <input className={input} name="dhsud" required maxLength={30} defaultValue={v.dhsud} />
              </label>
              <label className={label}>
                Supervising broker&apos;s PRC licence number
                <input className={input} name="supervisor" inputMode="numeric" required maxLength={7} defaultValue={v.supervisor} />
              </label>
            </>
          )}
        </>
      ) : (
        <>
          <label className={label}>
            Emirate where you are registered
            <select className={input} name="emirate" value={emirate} onChange={(e) => setEmirate(e.target.value)}>
              {EMIRATE_REGULATORS.map((e) => <option key={e.emirate} value={e.emirate}>{e.emirate}</option>)}
            </select>
          </label>
          <label className={label}>
            {reg?.numberLabel ?? "Broker registration number"}
            <input className={input} name="brn" inputMode="numeric" required maxLength={10} defaultValue={v.brn} />
          </label>
          <label className={label}>
            Brokerage office registration number {emirate === "Dubai" ? "(ORN)" : ""}
            <input className={input} name="orn" inputMode="numeric" required maxLength={10} defaultValue={v.orn} />
          </label>
        </>
      )}
      <label className={label}>
        Brokerage name <span className="font-normal text-ink-soft">(optional)</span>
        <input className={input} name="brokerage" autoComplete="organization" maxLength={120} defaultValue={v.brokerage} />
      </label>

      <PasswordFields />

      <label className="flex items-start gap-2.5 text-sm text-ink-soft">
        <input type="checkbox" name="terms" required className="mt-0.5 size-4 accent-[var(--color-sea-900)]" />
        <span>
          I agree to the <Link href="/terms" className="font-semibold text-sea-900 underline">Terms</Link> and the{" "}
          <Link href="/privacy" className="font-semibold text-sea-900 underline">Privacy notice</Link>, and confirm my licence details are correct.
        </span>
      </label>
      <button className={button} disabled={pending}>{pending ? "Creating your account…" : "Create account"}</button>
      <p className="text-center text-sm text-ink-soft">
        Already have an account? <Link href="/agent/sign-in" className="font-semibold text-sea-900 hover:text-lagoon-700">Sign in</Link>
      </p>
    </form>
  );
}
