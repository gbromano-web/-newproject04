import "server-only";
import { connection } from "next/server";
import { LISTINGS, agentOf, latestListings as sampleLatest, type PhAgent, type PhListing, type NearbyPlace } from "@/lib/ph/listings";
import { SAMPLE_DATA } from "@/lib/ph/preview";
import { searchListings as searchSamples, type SearchFilters } from "@/lib/ph/search";
import type { Photo } from "@/lib/ph/photos";
import { db } from "./db";

/**
 * One place that answers "which listings exist": the built-in samples while
 * SAMPLE_DATA is on, Supabase otherwise. Pages call these functions only.
 *
 * Database reads call connection() first, so pages render per request with
 * current data (agents' edits show at once) instead of being frozen at build.
 */

const BUCKET = "listing-photos";
const MAX_RESULTS = 200;

// ─── Row → PhListing ──────────────────────────────────────────────────────────

interface AgentJson {
  id: string; displayName: string; licenseType: PhAgent["licenseType"]; prc: string | null; dhsud: string | null;
  verification: string; agency: string | null; mobile: string; viber: string | null; whatsapp: string | null;
  languages: string[] | null; reply: number | null;
}
interface Row {
  id: string; slug: string; title: string; description: string; listingType: PhListing["listingType"]; propertyType: PhListing["propertyType"];
  price: string; rentPeriod: PhListing["rentPeriod"] | null; floorAreaSqm: string | null; lotAreaSqm: string | null;
  bedrooms: number | null; bathrooms: number | null; parkingSlots: number | null; furnishing: string | null; titleType: string | null;
  foreignOwnershipEligible: boolean; lat: number; lng: number; turnoverQuarter: number | null; turnoverYear: number | null;
  reservationFee: string | null; downpaymentPercent: string | null; downpaymentTermMonths: number | null;
  foreclosingInstitution: string | null; minimumBidPrice: string | null; occupancy: string | null;
  agentId: string; featured: boolean; publishedAt: Date | null; locationLabel: string; city: string | null; province: string | null;
  agent: AgentJson; photos: { key: string; caption: string | null }[]; amenities: string[]; nearby: { kind: string; name: string; m: number }[];
}

const num = (v: string | number | null | undefined) => (v === null || v === undefined ? undefined : Number(v));
const FURNISHING: Record<string, PhListing["furnishing"]> = { FULLY_FURNISHED: "Fully furnished", SEMI_FURNISHED: "Semi-furnished", UNFURNISHED: "Unfurnished", BARE: "Bare" };
const OCCUPANCY: Record<string, PhListing["occupancy"]> = { VACANT: "Vacant", OCCUPIED: "Occupied", UNKNOWN: "Unknown" };
const NEARBY_KINDS = new Set<NearbyPlace["kind"]>(["school", "hospital", "mall", "transit", "airport", "beach", "park", "church"]);

function replyText(minutes: number | null) {
  if (minutes === null) return "Replies by email or mobile";
  if (minutes <= 60) return "Usually replies within 1 hour";
  if (minutes <= 24 * 60) return `Usually replies within ${Math.ceil(minutes / 60)} hours`;
  return "Usually replies within a few days";
}

export function photoFrom(key: string, caption: string | null, title: string): Photo {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return {
    src: `${base}/storage/v1/object/public/${BUCKET}/${key.split("/").map(encodeURIComponent).join("/")}`,
    alt: caption || title,
    photographer: "",
    profileUrl: "",
    pageUrl: "",
    upload: true,
    fallback: "/images/listings/interior-1.svg",
  };
}

function toAgent(a: AgentJson): PhAgent {
  const initials = a.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  const mobile = a.mobile;
  return {
    id: a.id,
    name: a.displayName,
    initials,
    licenseType: a.licenseType,
    license: a.licenseType === "REAL_ESTATE_BROKER" ? `PRC ${a.prc ?? ""}`.trim() : `DHSUD ${a.dhsud ?? ""}`.trim(),
    verified: a.verification === "VERIFIED",
    agency: a.agency ?? "Independent",
    mobile,
    viber: a.viber || mobile,
    whatsapp: (a.whatsapp || mobile).replace(/\D/g, ""),
    languages: a.languages?.length ? a.languages : ["English", "Filipino"],
    replyTime: replyText(a.reply),
  };
}

function toListing(r: Row): PhListing {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    listingType: r.listingType,
    propertyType: r.propertyType,
    price: Number(r.price),
    rentPeriod: r.rentPeriod ?? undefined,
    floorAreaSqm: num(r.floorAreaSqm),
    lotAreaSqm: num(r.lotAreaSqm),
    bedrooms: r.bedrooms ?? undefined,
    bathrooms: r.bathrooms ?? undefined,
    parking: r.parkingSlots ?? undefined,
    furnishing: r.furnishing ? FURNISHING[r.furnishing] : undefined,
    titleType: r.titleType === "TCT" || r.titleType === "CCT" || r.titleType === "CONTRACT_TO_SELL" ? r.titleType : undefined,
    locationLabel: r.locationLabel,
    city: r.city ?? r.locationLabel,
    province: r.province ?? r.city ?? r.locationLabel,
    lat: r.lat,
    lng: r.lng,
    photos: r.photos.length ? r.photos.map((p) => photoFrom(p.key, p.caption, r.title)) : ["condoLiving"],
    amenities: r.amenities,
    nearby: r.nearby
      .filter((n) => NEARBY_KINDS.has(n.kind as NearbyPlace["kind"]))
      .map((n) => ({ kind: n.kind as NearbyPlace["kind"], name: n.name, km: Math.round(n.m / 100) / 10 })),
    foreignBuyerEligible: r.foreignOwnershipEligible,
    turnoverQuarter: r.turnoverQuarter ?? undefined,
    turnoverYear: r.turnoverYear ?? undefined,
    reservationFee: num(r.reservationFee),
    downpaymentPercent: num(r.downpaymentPercent),
    downpaymentMonths: r.downpaymentTermMonths ?? undefined,
    foreclosingInstitution: r.foreclosingInstitution ?? undefined,
    minimumBid: num(r.minimumBidPrice),
    occupancy: r.occupancy ? OCCUPANCY[r.occupancy] : undefined,
    agentId: r.agentId,
    agent: toAgent(r.agent),
    featured: r.featured,
    listedAt: (r.publishedAt ?? new Date()).toISOString().slice(0, 10),
  };
}

// ─── SQL ──────────────────────────────────────────────────────────────────────

const SELECT = `
SELECT p.id, p.slug, p.title, p.description, p."listingType", p."propertyType", p.price, p."rentPeriod",
  p."floorAreaSqm", p."lotAreaSqm", p.bedrooms, p.bathrooms, p."parkingSlots", p.furnishing, p."titleType",
  p."foreignOwnershipEligible", p.lat, p.lng, p."turnoverQuarter", p."turnoverYear", p."reservationFee",
  p."downpaymentPercent", p."downpaymentTermMonths", p."foreclosingInstitution", p."minimumBidPrice", p.occupancy,
  p."agentId", p."publishedAt",
  (p."isFeatured" AND (p."featuredUntil" IS NULL OR p."featuredUntil" > now())) AS featured,
  loc."displayName" AS "locationLabel",
  (SELECT x.name FROM "Location" x WHERE (x.id = loc.id OR x.id = ANY(loc."ancestorIds")) AND x.level IN ('CITY','MUNICIPALITY') LIMIT 1) AS city,
  (SELECT x.name FROM "Location" x WHERE (x.id = loc.id OR x.id = ANY(loc."ancestorIds")) AND x.level = 'PROVINCE' LIMIT 1) AS province,
  json_build_object('id', a.id, 'displayName', a."displayName", 'licenseType', a."licenseType", 'prc', a."prcLicenseNumber",
    'dhsud', a."dhsudAccreditationNumber", 'verification', a.verification, 'agency', ag.name, 'mobile', a.mobile,
    'viber', a."viberNumber", 'whatsapp', a."whatsappNumber", 'languages', a.languages, 'reply', a."medianReplyMinutes") AS agent,
  COALESCE((SELECT json_agg(json_build_object('key', m."storageKey", 'caption', m.caption) ORDER BY m."sortOrder")
            FROM "PropertyMedia" m WHERE m."propertyId" = p.id AND m.kind = 'PHOTO'), '[]'::json) AS photos,
  COALESCE((SELECT json_agg(am.label ORDER BY am.label) FROM "PropertyAmenity" pa JOIN "Amenity" am ON am.id = pa."amenityId"
            WHERE pa."propertyId" = p.id), '[]'::json) AS amenities,
  COALESCE((SELECT json_agg(json_build_object('kind', n.kind, 'name', n.name, 'm', n."distanceM") ORDER BY n."distanceM")
            FROM "NearbyPlace" n WHERE n."propertyId" = p.id), '[]'::json) AS nearby
FROM "Property" p
JOIN "Location" loc ON loc.id = p."locationId"
JOIN "Agent" a ON a.id = p."agentId"
LEFT JOIN "Agency" ag ON ag.id = a."agencyId"`;

// Only listings that are live: active, published, not expired
const LIVE = `p.status = 'ACTIVE' AND p."publishedAt" IS NOT NULL AND (p."expiresAt" IS NULL OR p."expiresAt" > now())`;

const ORDER: Record<SearchFilters["sort"], string> = {
  featured: `featured DESC, p."publishedAt" DESC`,
  newest: `p."publishedAt" DESC`,
  "price-asc": `p.price ASC`,
  "price-desc": `p.price DESC`,
};

async function query(sql: string, params: unknown[]): Promise<PhListing[]> {
  const pool = db();
  if (!pool) throw new Error("Listings come from the database, but no database is configured (POSTGRES_URL / DATABASE_URL)");
  const { rows } = await pool.query<Row>(sql, params);
  return rows.map(toListing);
}

/** "BGC", "Metro Manila", "Cebu" → matching location ids (the tree below is covered by ancestorIds). */
async function locationIds(text: string): Promise<string[]> {
  const pool = db()!;
  const exact = await pool.query<{ id: string }>(
    `SELECT id FROM "Location" WHERE lower(name) = lower($1) OR lower("displayName") = lower($1)
       OR EXISTS (SELECT 1 FROM unnest(aliases) al WHERE lower(al) = lower($1))`,
    [text],
  );
  if (exact.rows.length) return exact.rows.map((r) => r.id);
  // Partial match: the broadest place wins (fewest ancestors)
  const like = text.replace(/[\\%_]/g, (c) => `\\${c}`);
  const partial = await pool.query<{ id: string }>(
    `SELECT id FROM "Location" WHERE name ILIKE '%' || $1 || '%' ORDER BY cardinality("ancestorIds"), name LIMIT 1`,
    [like],
  );
  return partial.rows.map((r) => r.id);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function searchListings(f: SearchFilters): Promise<PhListing[]> {
  if (SAMPLE_DATA) return withAgents(searchSamples(f));
  await connection();
  const where: string[] = [LIVE];
  const params: unknown[] = [];
  const add = (clause: (n: string) => string, value: unknown) => {
    params.push(value);
    where.push(clause(`$${params.length}`));
  };
  if (f.type) add((n) => `p."listingType" = ${n}::"ListingType"`, f.type);
  if (f.propertyType) add((n) => `p."propertyType" = ${n}::"PropertyType"`, f.propertyType);
  if (f.minPrice !== undefined) add((n) => `p.price >= ${n}`, f.minPrice);
  if (f.maxPrice !== undefined) add((n) => `p.price <= ${n}`, f.maxPrice);
  if (f.beds !== undefined) add((n) => (f.beds! >= 5 ? `p.bedrooms >= ${n}` : `p.bedrooms = ${n}`), f.beds >= 5 ? 5 : f.beds);
  if (f.foreignEligible) where.push(`p."foreignOwnershipEligible" AND p."listingType" <> 'RENT'`);
  if (f.location) {
    const ids = await locationIds(f.location);
    if (!ids.length) return [];
    add((n) => `(loc.id = ANY(${n}::text[]) OR loc."ancestorIds" && ${n}::text[])`, ids);
  }
  return query(`${SELECT} WHERE ${where.join(" AND ")} ORDER BY ${ORDER[f.sort]} LIMIT ${MAX_RESULTS}`, params);
}

export async function getListing(slug: string): Promise<PhListing | undefined> {
  if (SAMPLE_DATA) return withAgents(LISTINGS.filter((l) => l.slug === slug))[0];
  await connection();
  if (slug.length > 200) return undefined;
  return (await query(`${SELECT} WHERE ${LIVE} AND p.slug = $1`, [slug]))[0];
}

/** For the lead routes: the listing behind a listing id, live only. */
export async function getListingById(id: string): Promise<PhListing | undefined> {
  if (SAMPLE_DATA) return withAgents(LISTINGS.filter((l) => l.id === id))[0];
  await connection();
  if (id.length > 64) return undefined;
  return (await query(`${SELECT} WHERE ${LIVE} AND p.id = $1`, [id]))[0];
}

export async function latestListings(n = 6): Promise<PhListing[]> {
  if (SAMPLE_DATA) return withAgents(sampleLatest(n));
  await connection();
  return query(`${SELECT} WHERE ${LIVE} ORDER BY p."publishedAt" DESC LIMIT $1`, [n]);
}

export async function similarListings(l: PhListing, n = 3): Promise<PhListing[]> {
  if (SAMPLE_DATA) {
    return withAgents(LISTINGS.filter((x) => x.id !== l.id && (x.listingType === l.listingType || x.propertyType === l.propertyType)).slice(0, n));
  }
  await connection();
  return query(
    `${SELECT} WHERE ${LIVE} AND p.id <> $1 AND (p."listingType" = $2::"ListingType" OR p."propertyType" = $3::"PropertyType")
     ORDER BY (p."locationId" = (SELECT "locationId" FROM "Property" WHERE id = $1)) DESC, p."publishedAt" DESC LIMIT $4`,
    [l.id, l.listingType, l.propertyType, n],
  );
}

const withAgents = (ls: PhListing[]) => ls.map((l) => ({ ...l, agent: agentOf(l) }));

/** Slugs and last-update times of live listings, for the sitemap. */
export async function liveListingSlugs(limit = 5000): Promise<{ slug: string; updatedAt: Date }[]> {
  if (SAMPLE_DATA) return [];
  await connection();
  const pool = db();
  if (!pool) return [];
  const { rows } = await pool.query<{ slug: string; updatedAt: Date }>(
    `SELECT p.slug, p."updatedAt" FROM "Property" p WHERE ${LIVE} ORDER BY p."updatedAt" DESC LIMIT $1`,
    [limit],
  );
  return rows;
}
