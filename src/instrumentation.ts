import type { Instrumentation } from "next";

/**
 * Every unhandled server error (page render, route handler, server action or
 * proxy) becomes one structured log line, "request.error", next to the site's
 * other events (docs/PLAYBOOK.md section 8). The digest matches the one shown
 * on the error page, so a visitor's report can be found in the logs.
 *
 * Only the path is logged, never the query string, headers or body, which can
 * hold emails, tokens or phone numbers.
 */
export const onRequestError: Instrumentation.onRequestError = (err, request, context) => {
  const e = (typeof err === "object" && err !== null ? err : { message: String(err) }) as { name?: string; message?: string; digest?: string };
  const header = (k: string) => {
    const v = request.headers[k];
    return Array.isArray(v) ? v[0] : v ?? null;
  };
  console.error(
    JSON.stringify({
      level: "error",
      event: "request.error",
      at: new Date().toISOString(),
      name: e.name ?? null,
      message: e.message?.slice(0, 500) ?? null,
      digest: e.digest ?? null,
      method: request.method,
      path: request.path.split("?")[0],
      route: context.routePath,
      routeType: context.routeType,
      renderSource: context.renderSource ?? null,
      revalidateReason: context.revalidateReason ?? null,
      requestId: header("x-vercel-id") ?? header("x-request-id"),
    }),
  );
};
