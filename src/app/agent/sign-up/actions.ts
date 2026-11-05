"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { SAMPLE_DATA } from "@/lib/ph/preview";
import { regulatorFor } from "@/lib/uae/regulators";
import { supabaseServer } from "@/lib/server/agent-session";
import { db } from "@/lib/server/db";
import { passwordProblem } from "@/lib/server/password-policy";
import { checkFormToken } from "@/lib/server/form-token";
import { ipHash, log, rateLimit } from "@/lib/server/request";
import type { AgentApplication } from "@/lib/server/agent-session";

/** Values echoed back on an error so the form stays filled (never the password). */
export type SignUpValues = Partial<Record<"fullName" | "email" | "country" | "licenseType" | "prc" | "dhsud" | "supervisor" | "emirate" | "brn" | "orn" | "brokerage", string>>;
export type SignUpState = { error?: string; field?: string; ok?: string; values?: SignUpValues };

const EMAIL = /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]{2,}$/;
const E164 = /^\+[1-9]\d{7,14}$/;
const PRC = /^\d{5,7}$/; // PRC real estate broker licence numbers
const DHSUD = /^[A-Za-z0-9][A-Za-z0-9 -]{3,29}$/;
const UAE_NUMBER = /^\d{3,10}$/;
const NAME = /^[\p{L}\p{M}][\p{L}\p{M} .'-]{1,99}$/u;
const TERMS_VERSION = "2026-11-05";
const HOUR = 60 * 60_000;
const MAX_FORM_AGE_MS = 2 * HOUR;
const minSeconds = () => Number(process.env.SIGNUP_MIN_SECONDS ?? 3);

const text = (f: FormData, k: string, max = 120) => String(f.get(k) ?? "").trim().slice(0, max);

const sent = (email: string) =>
  `Check your inbox at ${email} and open the link to confirm your email address (it works once). We then check your licence and email you when your agent account is active.`;

/**
 * Agent sign-up. Creates a Supabase account that cannot be used until the
 * email is confirmed, with the licence details stored on it as an application.
 * The account sees no data until an admin checks the licence and links an
 * agent profile (see docs/PLAYBOOK.md, "Approve an agent").
 */
export async function signUp(_: SignUpState, form: FormData): Promise<SignUpState> {
  if (SAMPLE_DATA) return { error: "Agent sign-up opens when real listings go live." };

  const values: SignUpValues = {
    fullName: text(form, "fullName", 100),
    email: text(form, "email", 254).toLowerCase(),
    country: text(form, "country", 2),
    licenseType: text(form, "licenseType", 40),
    prc: text(form, "prc", 20),
    dhsud: text(form, "dhsud", 30),
    supervisor: text(form, "supervisor", 20),
    emirate: text(form, "emirate", 40),
    brn: text(form, "brn", 20),
    orn: text(form, "orn", 20),
    brokerage: text(form, "brokerage", 120),
  };
  const fail = (error: string, field?: string): SignUpState => ({ error, field, values });
  const email = values.email!;
  const ip = ipHash({ headers: await headers() });

  // Bots: a field people never see, and a form submitted faster than a person can fill it
  if (text(form, "website", 200)) {
    log("info", "signup.honeypot", { ipHash: ip });
    return { ok: sent(email) }; // look successful so the bot learns nothing
  }
  const token = checkFormToken("signup", String(form.get("t") ?? ""), minSeconds() * 1000, MAX_FORM_AGE_MS);
  if (token === "fast") return fail("That was quick. Please check your details and press Create account again.");
  if (token === "expired" || token === "invalid") return fail("This form has expired. Reload the page and try again.");

  // Details
  if (!NAME.test(values.fullName!)) return fail("Enter your full name as it appears on your licence.", "fullName");
  if (!EMAIL.test(email)) return fail("Enter a valid email address.", "email");
  const mobile = String(form.get("mobile") ?? "").trim();
  if (!E164.test(mobile)) return fail("Enter your mobile number with its country code.", "mobile");
  if (values.country !== "PH" && values.country !== "AE") return fail("Choose where you are licensed.", "country");

  let licence: Partial<AgentApplication>;
  if (values.country === "PH") {
    if (values.licenseType === "REAL_ESTATE_BROKER") {
      if (!PRC.test(values.prc!)) return fail("Enter your PRC licence number (5 to 7 digits).", "prc");
      licence = { licenseType: "REAL_ESTATE_BROKER", prcLicenseNumber: values.prc };
    } else if (values.licenseType === "REAL_ESTATE_SALESPERSON") {
      if (!DHSUD.test(values.dhsud!)) return fail("Enter your DHSUD accreditation number.", "dhsud");
      if (!PRC.test(values.supervisor!)) return fail("Enter your supervising broker's PRC licence number.", "supervisor");
      licence = { licenseType: "REAL_ESTATE_SALESPERSON", dhsudAccreditationNumber: values.dhsud, supervisingBrokerPrc: values.supervisor };
    } else {
      return fail("Choose broker or salesperson.", "licenseType");
    }
  } else {
    const reg = regulatorFor(values.emirate!);
    if (!reg) return fail("Choose the emirate where you are registered.", "emirate");
    if (!UAE_NUMBER.test(values.brn!)) return fail("Enter your broker registration number (digits only).", "brn");
    if (!UAE_NUMBER.test(values.orn!)) return fail("Enter your brokerage's office registration number (digits only).", "orn");
    licence = { licenseType: "UAE_BROKER", emirate: values.emirate, uaeRegulator: reg.regulator, uaeBrokerNumber: values.brn, uaeOfficeNumber: values.orn };
  }
  if (values.brokerage && values.brokerage.length < 2) return fail("Enter your brokerage's name, or leave it blank.", "brokerage");

  const password = String(form.get("password") ?? "").slice(0, 201);
  if (password !== String(form.get("confirm") ?? "").slice(0, 201)) return fail("The two passwords do not match.", "password");
  if (form.get("terms") !== "on") return fail("Agree to the Terms and Privacy notice to create an account.", "terms");

  const weak = await passwordProblem(password, { email, name: values.fullName });
  if (weak) return fail(weak, "password");

  // Only attempts that reach Supabase count, so fixing a typo or choosing another password never locks anyone out
  const byVisitor = await rateLimit(`signup:ip:${ip}`, 5, HOUR);
  const byEmail = await rateLimit(`signup:email:${createHash("sha256").update(email).digest("hex").slice(0, 24)}`, 3, HOUR);
  if (!byVisitor.ok || !byEmail.ok) {
    log("warn", "signup.rate_limited", { ipHash: ip, scope: byVisitor.ok ? "email" : "visitor" });
    return fail("Too many sign-ups from here. Please try again in an hour.");
  }

  const sb = await supabaseServer();
  if (!sb) return fail("Sign-up is temporarily unavailable. Please try again in a few minutes.");
  const application: AgentApplication = {
    country: values.country,
    fullName: values.fullName!,
    mobile,
    brokerage: values.brokerage || undefined,
    ...licence,
    consentedAt: new Date().toISOString(),
    termsVersion: TERMS_VERSION,
  } as AgentApplication;
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${site}/auth/confirm?next=/dashboard`, data: { full_name: values.fullName, application } },
  });
  if (error) {
    if (error.name === "AuthRetryableFetchError" || !error.status || error.status >= 500) {
      log("error", "signup.unavailable", { ipHash: ip, status: error.status ?? null });
      return fail("Sign-up is temporarily unavailable. Please try again in a few minutes.");
    }
    if (error.status === 429) return fail("Too many sign-ups right now. Please try again in an hour.");
    if (error.code === "weak_password") return fail(error.message, "password");
    if (error.code === "signup_disabled") return fail("Sign-up is closed at the moment. Please contact us.");
    log("warn", "signup.failed", { ipHash: ip, code: error.code ?? null });
    return fail("Your account could not be created. Please check your details and try again.");
  }
  // Supabase hides whether the email was already registered (an existing account comes back with no
  // identities and no email is sent); the visitor sees the same message either way
  const created = !!data.user && (data.user.identities?.length ?? 0) > 0;
  if (created) {
    await db()
      ?.query(
        `INSERT INTO "AuditLog" (id, action, "entityType", "entityId", after, "ipHash", "createdAt")
         VALUES (gen_random_uuid()::text, 'agent.applied', 'User', $1, $2, $3, now())`,
        [data.user!.id, { country: application.country, licenseType: application.licenseType }, ip],
      )
      .catch((e) => log("warn", "signup.audit_failed", { error: e instanceof Error ? e.message : String(e) }));
  }
  log("info", "signup.submitted", { ipHash: ip, created, country: application.country });
  return { ok: sent(email) };
}
