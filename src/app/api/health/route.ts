import { connection } from "next/server";
import { db } from "@/lib/server/db";

/**
 * Health check for uptime monitors and load balancers. Returns the deployed
 * commit so a rollback can be confirmed, and pings the database (when one is
 * configured) so a broken connection shows up as 503 instead of lost inquiries.
 */
export async function GET() {
  await connection(); // always run per request, never prerendered
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? process.env.GIT_COMMIT ?? "dev";
  const pool = db();
  let database: "ok" | "down" | "not_configured" = "not_configured";
  if (pool) {
    database = await Promise.race([
      pool.query("SELECT 1").then(() => "ok" as const),
      new Promise<"down">((r) => setTimeout(() => r("down"), 2_000)),
    ]).catch(() => "down" as const);
  }
  const ok = database !== "down";
  return Response.json(
    { status: ok ? "ok" : "degraded", database, commit, at: new Date().toISOString() },
    { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
