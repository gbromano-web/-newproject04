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

/** Where a signed-in agent may be sent after sign-in. Anything else goes to the dashboard. */
export function safeNext(next: unknown): string {
  return typeof next === "string" && /^\/dashboard(?:[/?#]|$)/.test(next) && !next.includes("//") ? next : "/dashboard";
}
