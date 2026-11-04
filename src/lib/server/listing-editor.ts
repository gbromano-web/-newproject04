import "server-only";
import { effectivePlan, liveListingCount } from "./billing";
import { randomBytes } from "node:crypto";
import type { CountryCode } from "@/lib/markets";
import { db } from "./db";
import { photoFrom } from "./listings-repo";
import type { ListingImage } from "@/lib/ph/photos";

/**
 * Agents' own listing editor: validation of the listing form (per country),
 * and the database reads and writes behind it. Every function takes the agent
 * id from the verified session, never from the request, and every query is
 * scoped to it, so an agent can only ever read or change their own listings.
 * The database's CHECK constraints and listing trigger stay the last line of
 * defence (prisma/sql/postgis.sql); their errors are turned into plain messages here.
 */

export const LISTING_TYPES = ["SALE", "RENT", "PRE_SELLING", "FORECLOSED"] as const;
export const PROPERTY_TYPES = ["CONDOMINIUM", "TOWNHOUSE", "HOUSE_AND_LOT", "LOT_ONLY", "COMMERCIAL", "AGRICULTURAL", "WAREHOUSE"] as const;
export const RENT_PERIODS = ["MONTHLY", "YEARLY", "DAILY"] as const;
export const FURNISHING = ["FULLY_FURNISHED", "SEMI_FURNISHED", "UNFURNISHED", "BARE"] as const;
export const TITLE_TYPES = ["TCT", "CCT", "OCT", "TAX_DECLARATION", "CONTRACT_TO_SELL"] as const;
/** What an agent can set a listing to. ACTIVE means "publish". */
export const AGENT_STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "SOLD", "RENTED"] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

export const MAX_PHOTOS = 30;
const SQFT_PER_SQM = 10.7639;

export const countryOfLicence = (licenseType: string): CountryCode => (licenseType === "UAE_BROKER" ? "AE" : "PH");

export type ListingValues = {
  title: string;
  description: string;
  listingType: string;
  propertyType: string;
  price: string;
  rentPeriod: string;
  rentCheques: string;
  locationId: string;
  addressLine: string;
  bedrooms: string;
  bathrooms: string;
  parkingSlots: string;
  floorArea: string; // in the market's unit (sqm or sqft)
  lotArea: string;
  furnishing: string;
  titleType: string;
  foreignOwnershipEligible: boolean;
  turnoverQuarter: string;
  turnoverYear: string;
  foreclosingInstitution: string;
  adPermitNumber: string;
};

export const EMPTY_VALUES: ListingValues = {
  title: "", description: "", listingType: "SALE", propertyType: "CONDOMINIUM", price: "", rentPeriod: "", rentCheques: "",
  locationId: "", addressLine: "", bedrooms: "", bathrooms: "", parkingSlots: "", floorArea: "", lotArea: "", furnishing: "",
  titleType: "", foreignOwnershipEligible: false, turnoverQuarter: "", turnoverYear: "", foreclosingInstitution: "", adPermitNumber: "",
};

/** The checked values, ready for the database (areas in sqm). */
export type CleanListing = {
  title: string;
  description: string;
  listingType: string;
  propertyType: string;
  price: number;
  rentPeriod: string | null;
  rentCheques: number | null;
  locationId: string;
  addressLine: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parkingSlots: number | null;
  floorAreaSqm: number | null;
  lotAreaSqm: number | null;
  furnishing: string | null;
  titleType: string | null;
  foreignOwnershipEligible: boolean;
  turnoverQuarter: number | null;
  turnoverYear: number | null;
  foreclosingInstitution: string | null;
  adPermitNumber: string | null;
};

export type FieldError = { field: keyof ListingValues; error: string };

const text = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const multiline = (f: FormData, k: string, max: number) =>
  String(f.get(k) ?? "").replace(/\r\n/g, "\n").replace(/[^\S\n]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);

export function readValues(f: FormData): ListingValues {
  return {
    title: text(f, "title", 200),
    description: multiline(f, "description", 6000),
    listingType: text(f, "listingType", 20),
    propertyType: text(f, "propertyType", 20),
    price: text(f, "price", 30),
    rentPeriod: text(f, "rentPeriod", 10),
    rentCheques: text(f, "rentCheques", 3),
    locationId: text(f, "locationId", 64),
    addressLine: text(f, "addressLine", 200),
    bedrooms: text(f, "bedrooms", 3),
    bathrooms: text(f, "bathrooms", 3),
    parkingSlots: text(f, "parkingSlots", 3),
    floorArea: text(f, "floorArea", 15),
    lotArea: text(f, "lotArea", 15),
    furnishing: text(f, "furnishing", 20),
    titleType: text(f, "titleType", 20),
    foreignOwnershipEligible: f.get("foreignOwnershipEligible") === "on",
    turnoverQuarter: text(f, "turnoverQuarter", 1),
    turnoverYear: text(f, "turnoverYear", 4),
    foreclosingInstitution: text(f, "foreclosingInstitution", 120),
    adPermitNumber: text(f, "adPermitNumber", 40),
  };
}

/** "12,500,000" or "12500000.50" → 12500000.5; anything else → NaN */
const amount = (s: string) => (/^\d{1,3}(,\d{3})*(\.\d{1,2})?$|^\d+(\.\d{1,2})?$/.test(s) ? Number(s.replace(/,/g, "")) : NaN);
const whole = (s: string, min: number, max: number) => {
  if (s === "") return null;
  const n = Number(s);
  return Number.isInteger(n) && n >= min && n <= max ? n : NaN;
};
const area = (s: string, country: CountryCode) => {
  if (s === "") return null;
  const n = amount(s);
  if (!Number.isFinite(n) || n <= 0 || n > 10_000_000) return NaN;
  return Math.round((country === "AE" ? n / SQFT_PER_SQM : n) * 100) / 100;
};
const oneOf = <T extends string>(list: readonly T[], v: string): T | null => ((list as readonly string[]).includes(v) ? (v as T) : null);

/** Checks the form for one country. Returns the clean listing or the first problem (with its field). */
export function validate(v: ListingValues, country: CountryCode): { ok: CleanListing } | FieldError {
  const unit = country === "AE" ? "sqft" : "sqm";
  if (v.title.length < 10) return { field: "title", error: "Give the listing a title of at least 10 characters." };
  if (v.title.length > 120) return { field: "title", error: "Keep the title to 120 characters." };
  if (/<|>/.test(v.title)) return { field: "title", error: "The title can't contain < or >." };
  if (v.description.length < 30) return { field: "description", error: "Describe the property in at least 30 characters." };
  if (v.description.length > 5000) return { field: "description", error: "Keep the description to 5,000 characters." };
  const listingType = oneOf(LISTING_TYPES, v.listingType);
  if (!listingType) return { field: "listingType", error: "Choose what the listing is for." };
  const propertyType = oneOf(PROPERTY_TYPES, v.propertyType);
  if (!propertyType) return { field: "propertyType", error: "Choose the type of property." };
  const price = amount(v.price);
  if (!Number.isFinite(price) || price <= 0) return { field: "price", error: `Enter the price in ${country === "AE" ? "dirhams" : "pesos"}, digits only (commas are fine).` };
  if (price > 100_000_000_000) return { field: "price", error: "That price looks too high. Check the number of zeros." };
  if (!v.locationId) return { field: "locationId", error: "Choose where the property is." };

  let rentPeriod: string | null = null;
  let rentCheques: number | null = null;
  if (listingType === "RENT") {
    rentPeriod = oneOf(RENT_PERIODS, v.rentPeriod);
    if (!rentPeriod) return { field: "rentPeriod", error: "Choose how often rent is paid." };
    if (country === "AE") {
      rentCheques = whole(v.rentCheques, 1, 12);
      if (Number.isNaN(rentCheques)) return { field: "rentCheques", error: "Enter the number of cheques, from 1 to 12." };
    }
  }

  const bedrooms = whole(v.bedrooms, 0, 50);
  if (Number.isNaN(bedrooms)) return { field: "bedrooms", error: "Bedrooms: a whole number from 0 (studio) to 50." };
  const bathrooms = whole(v.bathrooms, 0, 50);
  if (Number.isNaN(bathrooms)) return { field: "bathrooms", error: "Bathrooms: a whole number up to 50." };
  const parkingSlots = whole(v.parkingSlots, 0, 100);
  if (Number.isNaN(parkingSlots)) return { field: "parkingSlots", error: "Parking: a whole number up to 100." };

  const floorAreaSqm = area(v.floorArea, country);
  if (Number.isNaN(floorAreaSqm)) return { field: "floorArea", error: `Enter the floor area in ${unit}, digits only.` };
  const lotAreaSqm = area(v.lotArea, country);
  if (Number.isNaN(lotAreaSqm)) return { field: "lotArea", error: `Enter the ${country === "AE" ? "plot" : "lot"} area in ${unit}, digits only.` };
  const lotOnly = propertyType === "LOT_ONLY" || propertyType === "AGRICULTURAL";
  if (lotOnly && !lotAreaSqm) return { field: "lotArea", error: `Enter the ${country === "AE" ? "plot" : "lot"} area.` };
  if (propertyType === "HOUSE_AND_LOT" && !lotAreaSqm) return { field: "lotArea", error: `Enter the ${country === "AE" ? "plot" : "lot"} area.` };
  if (!lotOnly && !floorAreaSqm) return { field: "floorArea", error: "Enter the floor area." };

  let turnoverQuarter: number | null = null;
  let turnoverYear: number | null = null;
  if (listingType === "PRE_SELLING") {
    const year = new Date().getFullYear();
    turnoverQuarter = whole(v.turnoverQuarter, 1, 4);
    if (!turnoverQuarter) return { field: "turnoverQuarter", error: "Choose the handover quarter." };
    turnoverYear = whole(v.turnoverYear, year, year + 15);
    if (!turnoverYear) return { field: "turnoverYear", error: `Enter the handover year (${year} to ${year + 15}).` };
  }
  let foreclosingInstitution: string | null = null;
  if (listingType === "FORECLOSED") {
    foreclosingInstitution = v.foreclosingInstitution || null;
    if (!foreclosingInstitution || foreclosingInstitution.length < 3) {
      return { field: "foreclosingInstitution", error: country === "AE" ? "Name the bank selling the property." : "Name the foreclosing institution (Pag-IBIG Fund or the bank)." };
    }
  }

  const furnishing = v.furnishing ? oneOf(FURNISHING, v.furnishing) : null;
  if (v.furnishing && !furnishing) return { field: "furnishing", error: "Choose the furnishing from the list." };
  const titleType = country === "PH" && v.titleType ? oneOf(TITLE_TYPES, v.titleType) : null;
  if (country === "PH" && v.titleType && !titleType) return { field: "titleType", error: "Choose the title type from the list." };
  const adPermitNumber = country === "AE" ? v.adPermitNumber.replace(/\s+/g, "") || null : null;
  if (adPermitNumber && !/^[A-Za-z0-9-]{4,40}$/.test(adPermitNumber)) return { field: "adPermitNumber", error: "Enter the permit number as shown on the permit (letters, digits and dashes)." };

  return {
    ok: {
      title: v.title,
      description: v.description,
      listingType,
      propertyType,
      price,
      rentPeriod,
      rentCheques,
      locationId: v.locationId,
      addressLine: v.addressLine || null,
      bedrooms: lotOnly ? null : bedrooms,
      bathrooms: lotOnly ? null : bathrooms,
      parkingSlots,
      floorAreaSqm: lotOnly ? null : floorAreaSqm,
      lotAreaSqm,
      furnishing: lotOnly ? null : furnishing,
      titleType,
      // Philippine foreign ownership applies to condos only, and not to rentals
      foreignOwnershipEligible: v.foreignOwnershipEligible && (country === "AE" || propertyType === "CONDOMINIUM") && listingType !== "RENT",
      turnoverQuarter,
      turnoverYear,
      foreclosingInstitution,
      adPermitNumber,
    },
  };
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export type LocationOption = { id: string; label: string; permit: string | null };

/** Places an agent can list in: their own country, every level with map coordinates. */
export async function locationOptions(country: CountryCode): Promise<LocationOption[]> {
  const pool = db();
  if (!pool) return [];
  const { rows } = await pool.query<LocationOption>(
    `SELECT l.id, l."displayName" AS label,
            (SELECT x."adPermitSystem" FROM "Location" x WHERE (x.id = l.id OR x.id = ANY (l."ancestorIds")) AND x."adPermitSystem" IS NOT NULL LIMIT 1) AS permit
       FROM "Location" l
      WHERE l.country = $1::"Country" AND l.lat IS NOT NULL AND l.lng IS NOT NULL
      ORDER BY l."displayName"`,
    [country],
  );
  return rows;
}

export type EditablePhoto = { id: string; key: string; caption: string | null; image: ListingImage };
export type EditableListing = {
  id: string;
  slug: string;
  status: string;
  live: boolean;
  publishedAt: Date | null;
  values: ListingValues;
  photos: EditablePhoto[];
};

const str = (n: unknown) => (n === null || n === undefined ? "" : String(n));
const areaOut = (sqm: unknown, country: CountryCode) =>
  sqm === null || sqm === undefined ? "" : country === "AE" ? String(Math.round(Number(sqm) * SQFT_PER_SQM)) : String(Number(sqm));

/** One of the agent's own listings, as form values. Undefined if it isn't theirs. */
export async function ownListing(agentId: string, id: string, country: CountryCode): Promise<EditableListing | undefined> {
  const pool = db();
  if (!pool || id.length > 64) return undefined;
  const { rows } = await pool.query(
    `SELECT p.*, p."listingType"::text AS lt, p."propertyType"::text AS pt, p.status::text AS st, p."rentPeriod"::text AS rp,
            p.furnishing::text AS fu, p."titleType"::text AS tt,
            (p.status = 'ACTIVE' AND p."publishedAt" IS NOT NULL AND (p."expiresAt" IS NULL OR p."expiresAt" > now())) AS live
       FROM "Property" p WHERE p.id = $1 AND p."agentId" = $2`,
    [id, agentId],
  );
  const r = rows[0];
  if (!r) return undefined;
  const photos = await listingPhotos(r.id, r.title);
  return {
    id: r.id,
    slug: r.slug,
    status: r.st,
    live: r.live,
    publishedAt: r.publishedAt,
    photos,
    values: {
      title: r.title,
      description: r.description,
      listingType: r.lt,
      propertyType: r.pt,
      price: str(r.price === null ? "" : Number(r.price)),
      rentPeriod: str(r.rp),
      rentCheques: str(r.rentCheques),
      locationId: r.locationId,
      addressLine: str(r.addressLine),
      bedrooms: str(r.bedrooms),
      bathrooms: str(r.bathrooms),
      parkingSlots: str(r.parkingSlots),
      floorArea: areaOut(r.floorAreaSqm, country),
      lotArea: areaOut(r.lotAreaSqm, country),
      furnishing: str(r.fu),
      titleType: str(r.tt),
      foreignOwnershipEligible: r.foreignOwnershipEligible,
      turnoverQuarter: str(r.turnoverQuarter),
      turnoverYear: str(r.turnoverYear),
      foreclosingInstitution: str(r.foreclosingInstitution),
      adPermitNumber: str(r.adPermitNumber),
    },
  };
}

export async function listingPhotos(propertyId: string, title: string): Promise<EditablePhoto[]> {
  const pool = db();
  if (!pool) return [];
  const { rows } = await pool.query<{ id: string; storageKey: string; caption: string | null }>(
    `SELECT id, "storageKey", caption FROM "PropertyMedia" WHERE "propertyId" = $1 AND kind = 'PHOTO' ORDER BY "sortOrder", "createdAt"`,
    [propertyId],
  );
  return rows.map((p) => ({ id: p.id, key: p.storageKey, caption: p.caption, image: photoFrom(p.storageKey, p.caption, title) as ListingImage }));
}

// ─── Writes ───────────────────────────────────────────────────────────────────

const slugify = (title: string) =>
  title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70)
    .replace(/-+$/, "") || "listing";

export class ListingError extends Error {
  constructor(public field: keyof ListingValues | null, message: string) {
    super(message);
  }
}

/** The database's last-line checks, in words an agent can act on. */
function explain(e: unknown, country: CountryCode): never {
  const err = e as { code?: string; constraint?: string; message?: string };
  if (err.code === "23514") {
    const c = err.constraint ?? "";
    if (c === "property_rent_needs_period") throw new ListingError("rentPeriod", "Choose how often rent is paid.");
    if (c === "property_area_by_type") throw new ListingError("floorArea", "Enter the floor area (and the lot area for houses and lots).");
    if (c === "property_preselling_turnover") throw new ListingError("turnoverYear", "Enter the handover quarter and year.");
    if (c === "property_foreclosed_institution") throw new ListingError("foreclosingInstitution", "Name the foreclosing institution.");
    if (c === "property_rent_cheques") throw new ListingError("rentCheques", "Enter the number of cheques, from 1 to 12.");
    if (c === "property_price_positive") throw new ListingError("price", "Enter a price above zero.");
    const m = err.message ?? "";
    if (m.includes("licensed in that country")) throw new ListingError("locationId", `Your licence is for ${country === "AE" ? "the UAE" : "the Philippines"}: choose a place there.`);
    const permit = m.match(/need a (.+?) number before they go live/);
    if (permit) throw new ListingError("adPermitNumber", `Listings here need a ${permit[1]} number before they go live. Add it, or save as a draft.`);
  }
  throw e;
}

type Actor = { agentId: string; userId: string; country: CountryCode; ipHash: string; verified?: boolean };

/** Creates a draft listing for the agent. Returns its id. */
export async function createListing(a: Actor, l: CleanListing): Promise<string> {
  const pool = db();
  if (!pool) throw new Error("no database");
  const loc = await pool.query<{ lat: number; lng: number }>(
    `SELECT lat, lng FROM "Location" WHERE id = $1 AND country = $2::"Country" AND lat IS NOT NULL`,
    [l.locationId, a.country],
  );
  if (!loc.rows[0]) throw new ListingError("locationId", "Choose where the property is, from the list.");
  for (let attempt = 0; attempt < 3; attempt++) {
    const id = `l_${randomBytes(10).toString("hex")}`;
    const slug = `${slugify(l.title)}-${randomBytes(3).toString("hex")}`;
    const reference = `GSP-${a.country}-${randomBytes(4).toString("hex").toUpperCase()}`;
    try {
      await pool.query(
        `INSERT INTO "Property" (id, reference, slug, title, description, "listingType", "propertyType", status, price, "rentPeriod",
           "rentCheques", "adPermitNumber", "floorAreaSqm", "lotAreaSqm", bedrooms, bathrooms, "parkingSlots", furnishing, "titleType",
           "foreignOwnershipEligible", "locationId", "addressLine", "showExactPin", lat, lng, "turnoverQuarter", "turnoverYear",
           "foreclosingInstitution", "agentId", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6::"ListingType", $7::"PropertyType", 'DRAFT', $8, $9::"RentPeriod", $10, $11, $12, $13, $14, $15, $16,
           $17::"Furnishing", $18::"TitleType", $19, $20, $21, false, $22, $23, $24, $25, $26, $27, now())`,
        [id, reference, slug, l.title, l.description, l.listingType, l.propertyType, l.price, l.rentPeriod, l.rentCheques, l.adPermitNumber,
          l.floorAreaSqm, l.lotAreaSqm, l.bedrooms, l.bathrooms, l.parkingSlots, l.furnishing, l.titleType, l.foreignOwnershipEligible,
          l.locationId, l.addressLine, loc.rows[0].lat, loc.rows[0].lng, l.turnoverQuarter, l.turnoverYear, l.foreclosingInstitution, a.agentId],
      );
      await audit(a, "listing.created", id, null, { status: "DRAFT" });
      return id;
    } catch (e) {
      if ((e as { code?: string }).code === "23505") continue; // slug or reference collision: try new random parts
      explain(e, a.country);
    }
  }
  throw new Error("could not create a unique listing reference");
}

/** Saves changes to one of the agent's own listings. Returns false if it isn't theirs. */
export async function updateListing(a: Actor, id: string, l: CleanListing): Promise<boolean> {
  const pool = db();
  if (!pool) throw new Error("no database");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const old = await client.query<{ price: string; locationId: string }>(
      `SELECT price, "locationId" FROM "Property" WHERE id = $1 AND "agentId" = $2 FOR UPDATE`,
      [id, a.agentId],
    );
    if (!old.rows[0]) {
      await client.query("ROLLBACK");
      return false;
    }
    const loc = await client.query<{ lat: number; lng: number }>(
      `SELECT lat, lng FROM "Location" WHERE id = $1 AND country = $2::"Country" AND lat IS NOT NULL`,
      [l.locationId, a.country],
    );
    if (!loc.rows[0]) throw new ListingError("locationId", "Choose where the property is, from the list.");
    const moved = old.rows[0].locationId !== l.locationId;
    await client.query(
      `UPDATE "Property" SET title = $3, description = $4, "listingType" = $5::"ListingType", "propertyType" = $6::"PropertyType",
         price = $7, "rentPeriod" = $8::"RentPeriod", "rentCheques" = $9, "adPermitNumber" = $10, "floorAreaSqm" = $11, "lotAreaSqm" = $12,
         bedrooms = $13, bathrooms = $14, "parkingSlots" = $15, furnishing = $16::"Furnishing", "titleType" = $17::"TitleType",
         "foreignOwnershipEligible" = $18, "locationId" = $19, "addressLine" = $20,
         lat = CASE WHEN $21 THEN $22 ELSE lat END, lng = CASE WHEN $21 THEN $23 ELSE lng END,
         "turnoverQuarter" = $24, "turnoverYear" = $25, "foreclosingInstitution" = $26, "updatedAt" = now()
       WHERE id = $1 AND "agentId" = $2`,
      [id, a.agentId, l.title, l.description, l.listingType, l.propertyType, l.price, l.rentPeriod, l.rentCheques, l.adPermitNumber,
        l.floorAreaSqm, l.lotAreaSqm, l.bedrooms, l.bathrooms, l.parkingSlots, l.furnishing, l.titleType, l.foreignOwnershipEligible,
        l.locationId, l.addressLine, moved, loc.rows[0].lat, loc.rows[0].lng, l.turnoverQuarter, l.turnoverYear, l.foreclosingInstitution],
    );
    if (Number(old.rows[0].price) !== l.price) {
      await client.query(
        `INSERT INTO "PriceChange" (id, "propertyId", "oldPrice", "newPrice") VALUES ($1, $2, $3, $4)`,
        [`pc_${randomBytes(10).toString("hex")}`, id, old.rows[0].price, l.price],
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    if (e instanceof ListingError) throw e;
    explain(e, a.country);
  } finally {
    client.release();
  }
  await audit(a, "listing.updated", id, null, null);
  return true;
}

/** Publish, pause, mark sold or rented, or back to draft. */
export async function setStatus(a: Actor, id: string, status: AgentStatus): Promise<"ok" | "missing" | "no_photos" | { limit: number; plan: string }> {
  const pool = db();
  if (!pool) throw new Error("no database");
  const cur = await pool.query<{ status: string; photos: number }>(
    `SELECT status::text AS status, (SELECT count(*)::int FROM "PropertyMedia" m WHERE m."propertyId" = p.id AND m.kind = 'PHOTO') AS photos
       FROM "Property" p WHERE id = $1 AND "agentId" = $2`,
    [id, a.agentId],
  );
  const row = cur.rows[0];
  if (!row) return "missing";
  if (status === "ACTIVE" && row.photos === 0) return "no_photos";
  if (status === "ACTIVE" && row.status !== "ACTIVE") {
    // Each plan has a number of live listings (src/lib/plans.ts)
    const { plan } = await effectivePlan(a.agentId, a.country, a.verified ?? false);
    if ((await liveListingCount(a.agentId, id)) >= plan.listings) return { limit: plan.listings, plan: plan.name };
  }
  try {
    await pool.query(
      `UPDATE "Property" SET status = $3::"ListingStatus",
         "publishedAt" = CASE WHEN $3 = 'ACTIVE' THEN COALESCE("publishedAt", now()) ELSE "publishedAt" END, "updatedAt" = now()
       WHERE id = $1 AND "agentId" = $2`,
      [id, a.agentId, status],
    );
  } catch (e) {
    explain(e, a.country);
  }
  await audit(a, "listing.status_changed", id, { status: row.status }, { status });
  return "ok";
}

export async function addPhoto(a: Actor, propertyId: string, key: string, width: number, height: number): Promise<void> {
  const pool = db()!;
  await pool.query(
    `INSERT INTO "PropertyMedia" (id, "propertyId", kind, "storageKey", width, height, "sortOrder")
     SELECT $1, p.id, 'PHOTO', $3, $4, $5, COALESCE((SELECT max("sortOrder") + 1 FROM "PropertyMedia" WHERE "propertyId" = p.id), 0)
       FROM "Property" p WHERE p.id = $2 AND p."agentId" = $6`,
    [`m_${randomBytes(10).toString("hex")}`, propertyId, key, width, height, a.agentId],
  );
  await pool.query(`UPDATE "Property" SET "updatedAt" = now() WHERE id = $1 AND "agentId" = $2`, [propertyId, a.agentId]);
}

export async function photoCount(agentId: string, propertyId: string): Promise<number | null> {
  const { rows } = await db()!.query<{ n: number | null }>(
    `SELECT (SELECT count(*)::int FROM "PropertyMedia" m WHERE m."propertyId" = p.id AND m.kind = 'PHOTO') AS n
       FROM "Property" p WHERE p.id = $1 AND p."agentId" = $2`,
    [propertyId, agentId],
  );
  return rows[0] ? rows[0].n ?? 0 : null;
}

/** Removes one photo row (of the agent's own listing) and returns its storage key, so the file can be deleted too. */
export async function removePhotoRow(a: Actor, photoId: string): Promise<{ key: string; propertyId: string } | null> {
  const { rows } = await db()!.query<{ storageKey: string; propertyId: string }>(
    `DELETE FROM "PropertyMedia" m USING "Property" p
      WHERE m.id = $1 AND m."propertyId" = p.id AND p."agentId" = $2 AND m.kind = 'PHOTO'
      RETURNING m."storageKey", m."propertyId"`,
    [photoId, a.agentId],
  );
  return rows[0] ? { key: rows[0].storageKey, propertyId: rows[0].propertyId } : null;
}

/** Moves a photo one place earlier or later, or to the front (the cover). */
export async function movePhoto(a: Actor, photoId: string, to: "up" | "down" | "cover"): Promise<string | null> {
  const pool = db()!;
  const { rows } = await pool.query<{ id: string; propertyId: string }>(
    `SELECT m.id, m."propertyId" FROM "PropertyMedia" m JOIN "Property" p ON p.id = m."propertyId"
      WHERE m."propertyId" = (SELECT "propertyId" FROM "PropertyMedia" WHERE id = $1) AND p."agentId" = $2 AND m.kind = 'PHOTO'
      ORDER BY m."sortOrder", m."createdAt"`,
    [photoId, a.agentId],
  );
  const i = rows.findIndex((r) => r.id === photoId);
  if (i < 0) return null;
  const order = rows.map((r) => r.id);
  const j = to === "cover" ? 0 : to === "up" ? Math.max(0, i - 1) : Math.min(order.length - 1, i + 1);
  order.splice(j, 0, ...order.splice(i, 1));
  await pool.query(
    `UPDATE "PropertyMedia" m SET "sortOrder" = o.n - 1 FROM unnest($1::text[]) WITH ORDINALITY AS o(id, n) WHERE m.id = o.id`,
    [order],
  );
  return rows[0].propertyId;
}

export async function setCaption(a: Actor, photoId: string, caption: string): Promise<string | null> {
  const { rows } = await db()!.query<{ propertyId: string }>(
    `UPDATE "PropertyMedia" m SET caption = NULLIF($3, '') FROM "Property" p
      WHERE m.id = $1 AND m."propertyId" = p.id AND p."agentId" = $2 RETURNING m."propertyId"`,
    [photoId, a.agentId, caption],
  );
  return rows[0]?.propertyId ?? null;
}

/** Whether the listing is live right now (so a change must refresh the cached home pages). */
export async function isLive(id: string): Promise<boolean> {
  const { rows } = await db()!.query<{ live: boolean }>(
    `SELECT (status = 'ACTIVE' AND "publishedAt" IS NOT NULL) AS live FROM "Property" WHERE id = $1`,
    [id],
  );
  return rows[0]?.live ?? false;
}

async function audit(a: Actor, action: string, id: string, before: object | null, after: object | null) {
  await db()!
    .query(
      `INSERT INTO "AuditLog" (id, "actorUserId", action, "entityType", "entityId", before, after, "ipHash", "createdAt")
       VALUES (gen_random_uuid()::text, $1, $2, 'Property', $3, $4, $5, $6, now())`,
      [a.userId, action, id, before, after, a.ipHash],
    )
    .catch(() => {});
}
