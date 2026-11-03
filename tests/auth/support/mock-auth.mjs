// Local stand-in for Supabase Auth (GoTrue), for the auth test suite only.
// Speaks the endpoints the site uses, keeps state in memory, and exposes
// /__* control routes so tests can reset it, read what it was asked, and
// simulate an outage. Never used outside tests.
import http from "node:http";
import { randomBytes } from "node:crypto";

const PORT = Number(process.env.MOCK_AUTH_PORT || 54329);
const SHORT_SESSION_SECONDS = 15; // inside supabase-js's refresh margin, so every request refreshes

const seedUsers = () => ({
  "agent@test.local": { id: "u_agent", password: "Correct horse battery 1" },
  "unlinked@test.local": { id: "u_unlinked", password: "Unlinked account pass 3" },
  "shortlived@test.local": { id: "u_short", password: "Short lived session 4", short: true },
  // Invited, has not chosen a password yet
  "newagent@test.local": { id: "u_new", password: null },
});
const seedLinks = () => ({
  "invite-ok": { type: "invite", email: "newagent@test.local" },
  "recovery-ok": { type: "recovery", email: "agent@test.local" },
});

let users, links, accessTokens, refreshTokens, log, mode;
function reset() {
  users = seedUsers();
  links = seedLinks();
  accessTokens = new Map(); // token -> { email, sessionId }
  refreshTokens = new Map(); // token -> { email, sessionId }
  log = [];
  mode = "normal";
}
reset();

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const userJson = (email) => ({
  id: users[email].id, aud: "authenticated", role: "authenticated", email,
  email_confirmed_at: "2026-01-01T00:00:00Z", app_metadata: { provider: "email" }, user_metadata: {},
  created_at: "2026-01-01T00:00:00Z", updated_at: new Date().toISOString(),
});

function issue(email, sessionId = randomBytes(8).toString("hex")) {
  const ttl = users[email].short ? SHORT_SESSION_SECONDS : 3600;
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const at = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: users[email].id, email, exp, iat: exp - ttl, aud: "authenticated", role: "authenticated", session_id: sessionId })}.${randomBytes(16).toString("base64url")}`;
  const rt = randomBytes(24).toString("base64url");
  accessTokens.set(at, { email, sessionId });
  refreshTokens.set(rt, { email, sessionId });
  return { access_token: at, token_type: "bearer", expires_in: ttl, expires_at: exp, refresh_token: rt, user: userJson(email) };
}

/** Signs the user out everywhere, like Supabase's default (global) sign-out. */
function revokeUser(email) {
  for (const m of [accessTokens, refreshTokens]) for (const [k, v] of m) if (v.email === email) m.delete(k);
}

const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const url = new URL(req.url, "http://mock");
    const send = (status, json) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(json === undefined ? "" : JSON.stringify(json));
    };
    let data = {};
    try { data = body ? JSON.parse(body) : {}; } catch { /* not JSON */ }

    // ── Control routes for tests ──────────────────────────────────────────
    if (url.pathname === "/__health") return send(200, { ok: true });
    if (url.pathname === "/__reset") { reset(); return send(200, { ok: true }); }
    if (url.pathname === "/__log") return send(200, log);
    if (url.pathname === "/__mode") { mode = data.mode ?? "normal"; return send(200, { mode }); }
    if (url.pathname === "/__password") return send(200, { password: users[data.email]?.password ?? null });

    if (!url.pathname.startsWith("/auth/v1/")) return send(404, { msg: "not found" });
    const grant = url.searchParams.get("grant_type");
    log.push({ method: req.method, path: url.pathname, grant, email: (data.email ?? "").toLowerCase() || undefined, at: Date.now() });

    if (mode === "hang") return; // never answers
    if (mode === "down") return send(503, { code: 503, error_code: "unexpected_failure", msg: "Service Unavailable" });

    const bearer = (req.headers.authorization ?? "").replace(/^Bearer /, "");

    if (url.pathname === "/auth/v1/token" && grant === "password") {
      const u = users[(data.email ?? "").toLowerCase()];
      if (u && u.password && u.password === data.password) return send(200, issue(data.email.toLowerCase()));
      return send(400, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" });
    }
    if (url.pathname === "/auth/v1/token" && grant === "refresh_token") {
      const s = refreshTokens.get(data.refresh_token);
      if (!s) return send(400, { code: 400, error_code: "refresh_token_not_found", msg: "Invalid Refresh Token: Refresh Token Not Found" });
      refreshTokens.delete(data.refresh_token); // rotation: each refresh token works once
      return send(200, issue(s.email, s.sessionId));
    }
    if (url.pathname === "/auth/v1/user" && req.method === "GET") {
      const s = accessTokens.get(bearer);
      return s ? send(200, userJson(s.email)) : send(403, { code: 403, error_code: "bad_jwt", msg: "invalid JWT: unable to parse or verify signature" });
    }
    if (url.pathname === "/auth/v1/user" && req.method === "PUT") {
      const s = accessTokens.get(bearer);
      if (!s) return send(401, { code: 401, error_code: "no_authorization", msg: "This endpoint requires a valid Bearer token" });
      if (typeof data.password === "string") {
        if (data.password.length < 6) return send(422, { code: 422, error_code: "weak_password", msg: "Password should be at least 6 characters." });
        if (data.password === users[s.email].password) return send(422, { code: 422, error_code: "same_password", msg: "New password should be different from the old password." });
        users[s.email].password = data.password;
      }
      return send(200, userJson(s.email));
    }
    if (url.pathname === "/auth/v1/logout") {
      const s = accessTokens.get(bearer);
      if (s) revokeUser(s.email);
      res.writeHead(204);
      return res.end();
    }
    if (url.pathname === "/auth/v1/verify" && req.method === "POST") {
      const link = links[data.token_hash];
      if (!link || link.type !== data.type) return send(403, { code: 403, error_code: "otp_expired", msg: "Email link is invalid or has expired" });
      delete links[data.token_hash]; // one-time
      return send(200, issue(link.email));
    }
    if (url.pathname === "/auth/v1/recover") return send(200, {});
    // Public sign-up is switched off in the real project; mirror that
    if (url.pathname === "/auth/v1/signup") return send(422, { code: 422, error_code: "signup_disabled", msg: "Signups not allowed for this instance" });
    send(404, { msg: `not mocked: ${req.method} ${url.pathname}` });
  });
});

server.listen(PORT, "127.0.0.1", () => console.log(`mock auth on ${PORT}`));
