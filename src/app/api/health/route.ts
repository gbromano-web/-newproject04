import { connection } from "next/server";

/**
 * Liveness check for uptime monitors and load balancers. Returns the deployed
 * commit so a rollback can be confirmed. Add a database ping here once Prisma
 * is connected (with a short timeout) to make it a readiness check.
 */
export async function GET() {
  await connection(); // always run per request, never prerendered
  return Response.json(
    { status: "ok", commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? process.env.GIT_COMMIT ?? "dev", at: new Date().toISOString() },
    { headers: { "cache-control": "no-store" } },
  );
}
