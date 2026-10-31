import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/server/agent-session";
import { log } from "@/lib/server/request";

const TYPES: EmailOtpType[] = ["invite", "recovery", "signup", "email", "magiclink", "email_change"];
const NEXT = new Set(["/agent/set-password", "/dashboard"]);

/**
 * Landing route for links in Supabase emails (invite, password reset).
 *
 * - One-time code (default templates, PKCE): exchanged here on GET. It only
 *   works in the browser that asked for it, so a mail scanner opening the link
 *   cannot use it up.
 * - Token hash (templates pointing at {{ .SiteURL }}/auth/confirm?token_hash=...&type=...):
 *   GET only shows a "Continue" page; the token is spent on the POST from that
 *   button. Mail scanners (Outlook Safe Links and similar) open links with GET,
 *   so they no longer burn the agent's one-time invite.
 *
 * Invites and resets always go to "set a password" first.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  if (!code && tokenHash) {
    const to = new URL("/auth/continue", url.origin);
    url.searchParams.forEach((v, k) => to.searchParams.set(k, v));
    return NextResponse.redirect(to, { headers: { "cache-control": "no-store" } });
  }
  return confirm(url.origin, code, null, null, url.searchParams.get("next"));
}

export async function POST(req: NextRequest) {
  // Only our own Continue page may post here: stops another site from signing a
  // visitor into an account the attacker controls (login CSRF)
  const origin = req.headers.get("origin");
  if (origin !== req.nextUrl.origin) {
    log("warn", "agent.link_cross_site", { origin });
    return new NextResponse("Open the link from your email again.", { status: 403, headers: { "cache-control": "no-store" } });
  }
  const form = await req.formData().catch(() => null);
  const field = (k: string) => (typeof form?.get(k) === "string" ? String(form!.get(k)).slice(0, 2048) : null);
  return confirm(req.nextUrl.origin, null, field("token_hash"), field("type") as EmailOtpType | null, field("next"));
}

async function confirm(origin: string, code: string | null, tokenHash: string | null, type: EmailOtpType | null, wantedNext: string | null) {
  const wanted = wantedNext ?? "";
  let next = NEXT.has(wanted) ? wanted : "/dashboard";
  if (type === "invite" || type === "recovery") next = "/agent/set-password";

  const to = (path: string) => {
    // 303 so a POST is followed by a GET
    const r = NextResponse.redirect(new URL(path, origin), 303);
    r.headers.set("cache-control", "no-store");
    return r;
  };

  const sb = await supabaseServer();
  if (!sb) return to("/agent/sign-in?error=unavailable");

  let failed = true;
  if (code) {
    failed = !!(await sb.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type && TYPES.includes(type)) {
    failed = !!(await sb.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  }
  if (failed) {
    log("info", "agent.link_failed", { type });
    return to("/agent/sign-in?error=link");
  }
  return to(next);
}
