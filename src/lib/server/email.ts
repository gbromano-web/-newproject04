import "server-only";
import { SITE } from "@/lib/site";
import { log } from "./request";

/**
 * Transactional email through Resend (https://resend.com). Off until
 * RESEND_API_KEY is set: every send is then skipped and logged as email.skipped,
 * and nothing else changes. Plain text only. Never throws: a failed email must
 * not fail the inquiry or approval that triggered it.
 *
 * Settings: RESEND_API_KEY (secret), EMAIL_FROM (an address on a domain verified
 * in Resend, e.g. "Go Search Property <hello@gosearchproperty.com>").
 * RESEND_API_BASE exists only for the end-to-end tests' stand-in.
 * Logs never contain addresses or content, only the email's tag.
 */
export type Email = { to: string | string[]; subject: string; text: string; replyTo?: string; tag: string };

export const emailEnabled = () => Boolean(process.env.RESEND_API_KEY);
const from = () => process.env.EMAIL_FROM || `${SITE.name} <noreply@gosearchproperty.com>`;
export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

/** People who may use /admin, and who get new-application alerts. */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
}

export async function sendEmail(m: Email): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    log("info", "email.skipped", { tag: m.tag, reason: "RESEND_API_KEY not set" });
    return false;
  }
  const to = Array.isArray(m.to) ? m.to : [m.to];
  if (!to.length) return false;
  try {
    const res = await fetch(`${(process.env.RESEND_API_BASE || "https://api.resend.com").replace(/\/$/, "")}/emails`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json", "user-agent": "go-search-property" },
      body: JSON.stringify({ from: from(), to, subject: m.subject, text: m.text, reply_to: m.replyTo, tags: [{ name: "type", value: m.tag }] }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      log("error", "email.failed", { tag: m.tag, status: res.status });
      return false;
    }
    log("info", "email.sent", { tag: m.tag, recipients: to.length });
    return true;
  } catch (e) {
    log("error", "email.failed", { tag: m.tag, error: e instanceof Error ? e.name : "unknown" });
    return false;
  }
}

/** One line per field, skipping empty ones. */
export const lines = (...l: (string | false | null | undefined)[]) => l.filter(Boolean).join("\n");
