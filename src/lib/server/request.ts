import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";

/**
 * Server helpers for public endpoints: request IDs, structured logs without
 * personal data, hashed client IPs and a small rate limiter.
 */

export const requestId = (req: Request) => req.headers.get("x-request-id") ?? req.headers.get("x-vercel-id") ?? randomUUID();

/** One JSON line per event, so logs can be searched and alerted on. Never pass names, emails, phones or messages. */
export function log(level: "info" | "warn" | "error", event: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({ level, event, at: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

// Without LEAD_IP_SALT a random salt is used per server instance: rate limiting
// still works, but hashes are not comparable across instances or restarts.
const SALT = process.env.LEAD_IP_SALT || randomBytes(16).toString("hex");
if (!process.env.LEAD_IP_SALT && process.env.NODE_ENV === "production") {
  log("warn", "config.missing", { name: "LEAD_IP_SALT" });
}

/** Data Privacy Act: keep a salted hash for abuse control, never the raw IP. */
export function ipHash(req: { headers: Headers }) {
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return createHash("sha256").update(SALT + ip).digest("hex").slice(0, 32);
}

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|viber|telegram|discord|slack/i;
/** Link-preview fetchers and crawlers follow chat links; they should not count as leads. */
export const isBot = (req: Request) => BOT.test(req.headers.get("user-agent") ?? "");

/** Fixed-window limiter in this process's memory: the fallback when there is no database. */
const windows = new Map<string, { count: number; resetAt: number }>();
export function memoryRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (windows.size > 10_000) for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k); // bound memory
  const w = windows.get(key);
  if (!w || w.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  w.count += 1;
  return { ok: w.count <= limit, retryAfter: Math.ceil((w.resetAt - now) / 1000) };
}

/**
 * Fixed-window limiter shared by every server instance, in Postgres
 * ("RateLimit" table, one atomic upsert per call). Falls back to memory if the
 * database is not configured or does not answer, so a database outage never
 * blocks buyers; the fallback is logged.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<{ ok: boolean; retryAfter: number }> {
  const pool = (await import("./db")).db();
  if (!pool) return memoryRateLimit(key, limit, windowMs);
  try {
    const { rows } = await pool.query<{ count: number; retry: number }>(
      `INSERT INTO "RateLimit" (key, "windowStart", count) VALUES ($1, now(), 1)
       ON CONFLICT (key) DO UPDATE SET
         count = CASE WHEN "RateLimit"."windowStart" <= now() - make_interval(secs => $2) THEN 1 ELSE "RateLimit".count + 1 END,
         "windowStart" = CASE WHEN "RateLimit"."windowStart" <= now() - make_interval(secs => $2) THEN now() ELSE "RateLimit"."windowStart" END
       RETURNING count, GREATEST(0, CEIL(EXTRACT(EPOCH FROM ("windowStart" + make_interval(secs => $2) - now()))))::int AS retry`,
      [key, windowMs / 1000],
    );
    return { ok: rows[0].count <= limit, retryAfter: rows[0].retry };
  } catch (e) {
    log("warn", "ratelimit.db_fallback", { error: e instanceof Error ? e.message : String(e) });
    return memoryRateLimit(key, limit, windowMs);
  }
}
