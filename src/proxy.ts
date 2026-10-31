import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SAMPLE_DATA } from "@/lib/ph/preview";
import { supabaseConfig } from "@/lib/server/supabase-config";

/**
 * Guards the agent area.
 *
 * Live listings (NEXT_PUBLIC_LISTINGS_SOURCE=database): each agent signs in
 * with Supabase Auth. The session is checked with the Auth server on every
 * request to /dashboard; without one the agent is sent to the sign-in page.
 *
 * Sample listings: the sample dashboard sits behind one shared username and
 * password (HTTP Basic auth over HTTPS), and agent sign-in is not open yet.
 *
 * Both fail closed: on a production server with the settings missing, the
 * dashboard is unavailable, never open.
 */
const REALM = 'Basic realm="Go Search Property agents", charset="UTF-8"';
const NO_STORE = "private, no-store";

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  // Constant-time compare; lengths are compared separately so timing does not leak contents
  return x.length === y.length && timingSafeEqual(x, y);
}

const unavailable = (what: string) =>
  new NextResponse(`${what} is not configured.`, { status: 503, headers: { "cache-control": "no-store" } });

function sampleDashboard(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith("/dashboard")) return NextResponse.next();
  const user = process.env.DASHBOARD_USER;
  const pass = process.env.DASHBOARD_PASSWORD;
  if (!user || !pass) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return unavailable("The agent dashboard");
  }
  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const i = decoded.indexOf(":");
    if (i > 0 && same(decoded.slice(0, i), user) && same(decoded.slice(i + 1), pass)) {
      const res = NextResponse.next();
      res.headers.set("cache-control", NO_STORE);
      return res;
    }
  }
  return new NextResponse("Sign in to see the agent dashboard.", {
    status: 401,
    headers: { "www-authenticate": REALM, "cache-control": "no-store" },
  });
}

async function agentArea(req: NextRequest) {
  const cfg = supabaseConfig();
  if (!cfg) return unavailable("Agent sign-in");

  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(cfg.url, cfg.key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list, headers) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => res.headers.set(k, v));
      },
    },
  });

  // getUser asks the Auth server, so a revoked or forged cookie does not pass
  const { data } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;
  const needsSession = path.startsWith("/dashboard") || path === "/agent/set-password";

  if (needsSession && !data.user) {
    const to = req.nextUrl.clone();
    to.pathname = "/agent/sign-in";
    to.search = path.startsWith("/dashboard") ? `?next=${encodeURIComponent(path + req.nextUrl.search)}` : "";
    const redirect = NextResponse.redirect(to);
    res.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    redirect.headers.set("cache-control", "no-store");
    return redirect;
  }
  res.headers.set("cache-control", NO_STORE);
  return res;
}

export function proxy(req: NextRequest) {
  return SAMPLE_DATA ? sampleDashboard(req) : agentArea(req);
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/agent/:path*"],
};
