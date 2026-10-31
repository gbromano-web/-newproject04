import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/server/agent-session";
import { log } from "@/lib/server/request";

const TYPES: EmailOtpType[] = ["invite", "recovery", "signup", "email", "magiclink", "email_change"];
const NEXT = new Set(["/agent/set-password", "/dashboard"]);

/**
 * Landing page for links in Supabase emails (invite, password reset).
 * Accepts either a one-time code (default email templates) or a token hash
 * (templates pointing at {{ .SiteURL }}/auth/confirm?token_hash=...&type=...),
 * starts the session, then sends the agent on. Invites and resets always go
 * to "set a password" first.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const wanted = url.searchParams.get("next") ?? "";
  let next = NEXT.has(wanted) ? wanted : "/dashboard";
  if (type === "invite" || type === "recovery") next = "/agent/set-password";

  const to = (path: string) => {
    const r = NextResponse.redirect(new URL(path, url.origin));
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
