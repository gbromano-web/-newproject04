/**
 * Supabase Auth settings. The Supabase–Vercel integration sets these names.
 * Only the URL and the publishable (anon) key are used here: the key is safe to
 * expose, and every database read for the dashboard goes through the server's
 * own Postgres connection, filtered by the signed-in agent.
 */
export function supabaseConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

/**
 * Where a signed-in agent may be sent after sign-in: a dashboard path only.
 * No "//" (another host), no backslashes (browsers read them as "/") and no
 * "." or ".." segments (which would climb out of /dashboard).
 */
export function safeNext(next: unknown): string {
  return typeof next === "string" &&
    /^\/dashboard(?:[/?#]|$)/.test(next) &&
    !next.includes("//") &&
    !next.includes("\\") &&
    !/\/\.\.?(?:[/?#]|$)/.test(next)
    ? next
    : "/dashboard";
}

/**
 * The session cookie. HttpOnly: no script on the page can read it (the site
 * only uses Supabase on the server), so an injected script cannot steal a
 * session. Secure in production: never sent over plain http.
 */
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/** Calls to Supabase Auth give up after this long, so a slow Auth server cannot hang a page. */
const AUTH_TIMEOUT_MS = 5_000;

export const authFetch: typeof fetch = (input, init) => {
  const timeout = AbortSignal.timeout(AUTH_TIMEOUT_MS);
  return fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout });
};
