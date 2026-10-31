import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Locks the agent dashboard behind a username and password (HTTP Basic auth
 * over HTTPS) until per-agent sign-in with Supabase Auth is built.
 *
 * Fails closed: on a production server without DASHBOARD_USER and
 * DASHBOARD_PASSWORD the dashboard is unavailable, never open.
 * Local development stays open so the sample dashboard can be worked on.
 */
const REALM = 'Basic realm="Go Search Property agents", charset="UTF-8"';

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  // Constant-time compare; lengths are compared separately so timing does not leak contents
  return x.length === y.length && timingSafeEqual(x, y);
}

export function proxy(req: NextRequest) {
  const user = process.env.DASHBOARD_USER;
  const pass = process.env.DASHBOARD_PASSWORD;

  if (!user || !pass) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return new NextResponse("The agent dashboard is not configured.", { status: 503, headers: { "cache-control": "no-store" } });
  }

  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const i = decoded.indexOf(":");
    if (i > 0 && same(decoded.slice(0, i), user) && same(decoded.slice(i + 1), pass)) {
      const res = NextResponse.next();
      res.headers.set("cache-control", "private, no-store");
      return res;
    }
  }
  return new NextResponse("Sign in to see the agent dashboard.", {
    status: 401,
    headers: { "www-authenticate": REALM, "cache-control": "no-store" },
  });
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
};
