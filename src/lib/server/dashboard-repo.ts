import "server-only";
import { db } from "./db";
import { photoFrom } from "./listings-repo";
import type { ListingImage } from "@/lib/ph/photos";
import type { RentPeriod } from "@/lib/ph/format";
import type { CountryCode } from "@/lib/markets";

/**
 * Everything here is scoped to one agent id, which callers take from the
 * verified session (never from the request), so an agent only ever sees their
 * own listings and the leads sent to them.
 */

export type AgentListingRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  listingType: string;
  price: number;
  rentPeriod: RentPeriod | null;
  country: CountryCode;
  location: string;
  photo: ListingImage;
  leads: number;
  live: boolean;
  expiresAt: Date | null;
};

export type AgentLeadRow = {
  id: string;
  channel: string;
  status: string;
  name: string | null;
  email: string | null;
  mobile: string | null;
  message: string | null;
  createdAt: Date;
  listingTitle: string | null;
  listingSlug: string | null;
};

export type AgentDashboardData = {
  listings: AgentListingRow[];
  leads: AgentLeadRow[];
  weekByChannel: Record<string, number>;
  newLeads: number;
};

export async function agentDashboard(agentId: string): Promise<AgentDashboardData> {
  const pool = db();
  if (!pool) return { listings: [], leads: [], weekByChannel: {}, newLeads: 0 };

  const [listings, leads, week, fresh] = await Promise.all([
    pool.query(
      `SELECT p.id, p.slug, p.title, p.status::text AS status, p."listingType"::text AS "listingType", p.price,
              p."rentPeriod"::text AS "rentPeriod", p."expiresAt", loc."displayName" AS location, loc.country::text AS country,
              (p.status = 'ACTIVE' AND p."publishedAt" IS NOT NULL AND (p."expiresAt" IS NULL OR p."expiresAt" > now())) AS live,
              (SELECT m."storageKey" FROM "PropertyMedia" m WHERE m."propertyId" = p.id AND m.kind = 'PHOTO' ORDER BY m."sortOrder" LIMIT 1) AS photo,
              (SELECT count(*) FROM "Lead" ld WHERE ld."propertyId" = p.id)::int AS leads
         FROM "Property" p
         JOIN "Location" loc ON loc.id = p."locationId"
        WHERE p."agentId" = $1
        ORDER BY p."updatedAt" DESC
        LIMIT 200`,
      [agentId],
    ),
    pool.query(
      `SELECT ld.id, ld.channel::text AS channel, ld.status::text AS status, ld.name, ld.email, ld.mobile, ld.message,
              ld."createdAt", p.title AS "listingTitle", p.slug AS "listingSlug"
         FROM "Lead" ld
         LEFT JOIN "Property" p ON p.id = ld."propertyId"
        WHERE ld."agentId" = $1 AND ld.status <> 'SPAM'
        ORDER BY ld."createdAt" DESC
        LIMIT 50`,
      [agentId],
    ),
    pool.query(
      `SELECT channel::text AS channel, count(*)::int AS n FROM "Lead"
        WHERE "agentId" = $1 AND "createdAt" > now() - interval '7 days' AND status <> 'SPAM'
        GROUP BY channel`,
      [agentId],
    ),
    pool.query(`SELECT count(*)::int AS n FROM "Lead" WHERE "agentId" = $1 AND status = 'NEW'`, [agentId]),
  ]);

  return {
    listings: listings.rows.map((r) => ({
      ...r,
      price: Number(r.price),
      photo: r.photo ? photoFrom(r.photo, null, r.title) : "condoLiving",
    })),
    leads: leads.rows,
    weekByChannel: Object.fromEntries(week.rows.map((r) => [r.channel, r.n])),
    newLeads: fresh.rows[0]?.n ?? 0,
  };
}
