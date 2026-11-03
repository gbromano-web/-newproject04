"use client";

import { useState } from "react";
import clsx from "clsx";
import { CALLING_CODES, toE164 } from "@/lib/phone";

/**
 * Mobile number with its country calling code. Sends one field, `name`, in
 * international (E.164) form, e.g. "+639171234567", built from the chosen code
 * and the number as typed (spaces, dashes and a leading 0 are fine).
 */
export function PhoneInput({
  name,
  defaultCountry = "PH",
  required = false,
  className,
  inputClassName,
  label = "Mobile number",
}: {
  name: string;
  defaultCountry?: string;
  required?: boolean;
  className?: string;
  inputClassName?: string;
  label?: string;
}) {
  const [iso, setIso] = useState(defaultCountry);
  const [local, setLocal] = useState("");
  const e164 = toE164(iso, local);
  const invalid = local.trim() !== "" && e164 === null;
  const example = iso === "AE" ? "50 123 4567" : iso === "PH" ? "917 123 4567" : "Mobile number";

  return (
    <div className={clsx("flex gap-2", className)}>
      <select
        aria-label="Country code"
        value={iso}
        onChange={(e) => setIso(e.target.value)}
        className={clsx("w-[7.5rem] shrink-0 cursor-pointer", inputClassName)}
      >
        {CALLING_CODES.map((c) => (
          <option key={c.iso} value={c.iso}>
            {c.iso} +{c.dial}
          </option>
        ))}
      </select>
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        aria-label={label}
        aria-invalid={invalid || undefined}
        placeholder={example}
        required={required}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        className={clsx("min-w-0 flex-1", inputClassName, invalid && "ring-2 ring-coral-500")}
      />
      {/* What the server receives: the full international number, or what was typed if it is not valid (the server then rejects it) */}
      <input type="hidden" name={name} value={e164 === null ? local.trim() : e164} />
    </div>
  );
}
