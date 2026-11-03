import "server-only";
import { createHash } from "node:crypto";
import { log } from "./request";

/**
 * Password rules for every password set on the site (sign-up, invite, reset),
 * following NIST SP 800-63B: length over complexity, no known-breached
 * passwords, nothing built from the person's own details.
 */
export const MIN_PASSWORD = 12;
export const MAX_PASSWORD = 200;

/**
 * Have I Been Pwned "range" lookup with k-anonymity: only the first 5
 * characters of the password's SHA-1 leave the server, and padding hides the
 * response size. Returns true if breached, false if not, null if the service
 * could not be reached (sign-up then goes ahead: availability over a
 * best-effort check).
 */
export async function isBreached(password: string): Promise<boolean | null> {
  const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);
  const base = (process.env.PWNED_PASSWORDS_URL || "https://api.pwnedpasswords.com").replace(/\/$/, "");
  const started = performance.now();
  try {
    const res = await fetch(`${base}/range/${prefix}`, {
      headers: { "Add-Padding": "true", "User-Agent": "GoSearchProperty-password-check" },
      signal: AbortSignal.timeout(3_000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    for (const line of (await res.text()).split("\n")) {
      const [s, count] = line.trim().split(":");
      if (s === suffix && Number(count) > 0) return true; // padding lines have count 0
    }
    return false;
  } catch (e) {
    log("warn", "password.breach_check_unavailable", { error: e instanceof Error ? e.message : String(e) });
    return null;
  } finally {
    const ms = Math.round(performance.now() - started);
    if (ms > 1_000) log("warn", "hibp.slow", { ms });
  }
}

/** The first problem with a new password, or null if it is acceptable. */
export async function passwordProblem(password: string, about: { email?: string; name?: string } = {}): Promise<string | null> {
  if (password.trim().length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (password.length > MAX_PASSWORD) return `Use at most ${MAX_PASSWORD} characters.`;
  if (/^(.)\1+$/.test(password.trim())) return "Don't repeat a single character.";
  const lower = password.toLowerCase();
  const local = about.email?.split("@")[0]?.toLowerCase() ?? "";
  if (local.length >= 4 && lower.includes(local)) return "Don't use your email address in your password.";
  const nameParts = (about.name ?? "").toLowerCase().split(/\s+/).filter((p) => p.length >= 4);
  if (nameParts.some((p) => lower.includes(p))) return "Don't use your name in your password.";
  if (await isBreached(password)) return "This password has appeared in a known data breach. Choose a different one.";
  return null;
}
