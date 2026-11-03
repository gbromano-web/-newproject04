import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "./db";
import { AUTH_COOKIE_OPTIONS, authFetch, supabaseConfig } from "./supabase-config";

/** A Supabase client bound to this request's cookies. New per request, never shared. */
export async function supabaseServer() {
  const cfg = supabaseConfig();
  if (!cfg) return null;
  const store = await cookies();
  return createServerClient(cfg.url, cfg.key, {
    global: { fetch: authFetch },
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a server component, which cannot set cookies; the proxy refreshes the session instead
        }
      },
    },
  });
}

export type SessionAgent = {
  id: string;
  displayName: string;
  verification: string;
  licenseType: string;
  licenseNumber: string | null;
  agency: string | null;
};

/** What an agent submitted at sign-up, kept on their Supabase account until an admin approves it. */
export type AgentApplication = {
  country: "PH" | "AE";
  fullName: string;
  mobile: string;
  brokerage?: string;
  licenseType: "REAL_ESTATE_BROKER" | "REAL_ESTATE_SALESPERSON" | "UAE_BROKER";
  prcLicenseNumber?: string;
  dhsudAccreditationNumber?: string;
  supervisingBrokerPrc?: string;
  emirate?: string;
  uaeRegulator?: string;
  uaeBrokerNumber?: string;
  uaeOfficeNumber?: string;
  consentedAt: string;
  termsVersion: string;
};

export type Session = { userId: string; email: string; agent: SessionAgent | null; application: AgentApplication | null };

function applicationOf(meta: unknown): AgentApplication | null {
  const a = (meta as { application?: unknown } | null)?.application as Partial<AgentApplication> | undefined;
  return a && typeof a === "object" && (a.country === "PH" || a.country === "AE") && typeof a.fullName === "string" ? (a as AgentApplication) : null;
}

/**
 * The signed-in user, checked with the Supabase Auth server (not just the
 * cookie), and the agent profile linked to them (Agent.userId = auth user id).
 * Null when nobody is signed in.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  await connection(); // per request: the auth client reads the clock and the cookies
  const sb = await supabaseServer();
  if (!sb) return null;
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) return null;
  const pool = db();
  let agent: SessionAgent | null = null;
  if (pool) {
    const { rows } = await pool.query(
      `SELECT a.id, a."displayName", a.verification::text AS verification, a."licenseType"::text AS "licenseType",
              CASE WHEN a."licenseType" = 'UAE_BROKER'
                   THEN NULLIF(btrim(concat_ws(' ', a."uaeRegulator", a."uaeBrokerNumber")), '')
                   ELSE COALESCE(a."prcLicenseNumber", a."dhsudAccreditationNumber") END AS "licenseNumber", ag.name AS agency
         FROM "Agent" a
         LEFT JOIN "Agency" ag ON ag.id = a."agencyId"
        WHERE a."userId" = $1`,
      [data.user.id],
    );
    agent = rows[0] ?? null;
  }
  return { userId: data.user.id, email: data.user.email ?? "", agent, application: agent ? null : applicationOf(data.user.user_metadata) };
});
