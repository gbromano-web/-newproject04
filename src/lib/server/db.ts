import "server-only";
import { Pool, type PoolClient } from "pg";
import { log } from "./request";

/**
 * Postgres access for the request path (leads, rate limits). Plain parameterised
 * SQL through node-postgres keeps cold starts small and needs no engine binary;
 * Prisma stays the source of truth for the schema and migrations.
 *
 * Every connection has hard timeouts so a slow database fails fast instead of
 * holding the request open.
 */
let pool: Pool | null | undefined;

export function db(): Pool | null {
  if (pool !== undefined) return pool;
  // DATABASE_URL when set by hand; POSTGRES_URL when the Supabase–Vercel integration sets it
  // (both are the transaction pooler, port 6543)
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return (pool = null);
  pool = new Pool({
    connectionString: withoutSslMode(url),
    ssl: sslConfig(url),
    max: Number(process.env.DATABASE_POOL_MAX ?? 5), // serverless: keep small; Supabase pooler does the fan-in
    connectionTimeoutMillis: 3_000,
    idleTimeoutMillis: 10_000,
    statement_timeout: 5_000,
    query_timeout: 6_000,
    application_name: "go-search-property",
  });
  // A broken idle connection must not crash the process
  pool.on("error", (e) => log("error", "db.pool_error", { error: e.message }));
  return pool;
}

/**
 * TLS for the database connection. With DATABASE_SSL_CA (the Supabase root
 * certificate, from Project settings > Database > SSL) the server certificate
 * is fully verified. Without it the connection is still encrypted but not
 * verified, which is logged as a warning in production. Local URLs without
 * sslmode stay plain.
 */
function sslConfig(url: string) {
  const ca = process.env.DATABASE_SSL_CA?.replace(/\\n/g, "\n");
  if (ca) return { ca, rejectUnauthorized: true };
  const mode = new URL(url).searchParams.get("sslmode");
  const local = /@(localhost|127\.0\.0\.1)(:|\/)/.test(url);
  if (local && !mode) return undefined;
  if (process.env.NODE_ENV === "production") log("warn", "db.tls_unverified", { hint: "set DATABASE_SSL_CA" });
  return { rejectUnauthorized: false };
}

// node-postgres lets sslmode in the URL override the ssl option above, so it is removed
function withoutSslMode(url: string) {
  const u = new URL(url);
  u.searchParams.delete("sslmode");
  return u.toString();
}

/** Runs `fn` in a transaction; rolls back on any error and always releases the connection. */
export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const p = db();
  if (!p) throw new Error("DATABASE_URL is not set");
  const c = await p.connect();
  try {
    await c.query("BEGIN");
    const out = await fn(c);
    await c.query("COMMIT");
    return out;
  } catch (e) {
    await c.query("ROLLBACK").catch(() => undefined);
    throw e;
  } finally {
    c.release();
  }
}
