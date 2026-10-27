// Offline checks for the PH formatting helpers and the seed logic.
// Run: npm run check:ph
import assert from "node:assert/strict";
import { formatBedrooms, formatPeso, formatPricePerSqm, formatRent, formatSqm, formatTurnover } from "../src/lib/ph/format";
import { flattenLocations, slugify } from "../src/lib/ph/locations";
import { seed, type SeedClient } from "../prisma/seed";
import { convertPeso } from "../src/lib/ph/currency";
import { estimate, monthlyAmortization } from "../src/lib/ph/financing";
import { LISTINGS, AGENTS, getAgent } from "../src/lib/ph/listings";
import { PHOTOS } from "../src/lib/ph/photos";
import { PH_MAP_VIEWS, project } from "../src/lib/ph/map-geometry";

// Peso formatting
assert.equal(formatRent(35_000, "MONTHLY"), "₱35,000/mo");
assert.equal(formatPeso(4_800_000), "₱4.8M");
assert.equal(formatPeso(4_850_000), "₱4.85M");
assert.equal(formatPeso(120_000_000), "₱120M");
assert.equal(formatPeso(1_250_000_000), "₱1.25B");
assert.equal(formatPeso(850_000), "₱850,000");
assert.equal(formatPeso(4_800_000, { compact: false }), "₱4,800,000");
assert.equal(formatPeso("6200000.00"), "₱6.2M"); // Prisma Decimal serialises as a string
assert.equal(formatPricePerSqm(137_777.78), "₱137,778/sqm");
assert.equal(formatSqm(32.5), "32.5 sqm");
assert.equal(formatSqm(1250), "1,250 sqm");
assert.equal(formatTurnover(4, 2029), "Q4 2029");
assert.equal(formatBedrooms(0), "Studio");
assert.equal(formatBedrooms(2), "2 BR");

// Currency estimates
assert.equal(convertPeso(18_600_000, "USD"), "≈ US$293K");
assert.equal(convertPeso(45_000, "USD"), "≈ US$710");
assert.equal(convertPeso(18_600_000, "JPY"), "≈ ¥46M");
assert.equal(convertPeso(18_600_000, "KRW"), "≈ ₩388M");
assert.equal(convertPeso(4_800_000, "SGD"), "≈ S$96.7K");
assert.equal(convertPeso(4_800_000, "PHP"), null);

// Amortization: ₱1M over 20 years at 6% is a textbook ₱7,164.31/month
assert.equal(monthlyAmortization(1_000_000, 6, 20).toFixed(2), "7164.31");
const pag = estimate(18_600_000, 20, "PAGIBIG", 3, 30);
assert.equal(pag.cappedLoan, 6_000_000, "Pag-IBIG caps the loan at ₱6M");
assert.equal(pag.overCap, 18_600_000 * 0.8 - 6_000_000);
const bank = estimate(12_500_000, 20, "BANK", 5, 30);
assert.equal(bank.rate, 7.375);
assert.equal(bank.monthly.toFixed(0), monthlyAmortization(10_000_000, 7.375, 20).toFixed(0), "bank term capped at 20 years");

// Listings data integrity
assert.equal(new Set(LISTINGS.map((l) => l.slug)).size, LISTINGS.length, "unique slugs");
for (const l of LISTINGS) {
  assert.ok(getAgent(l.agentId), `${l.id} has an agent`);
  assert.ok(l.photos.length > 0 && l.photos.every((p) => PHOTOS[p]?.fallback), `${l.id} photos have fallbacks`);
  if (l.listingType === "RENT") assert.ok(l.rentPeriod, `${l.id} rent period`);
  if (l.listingType === "PRE_SELLING") assert.ok(l.turnoverYear && l.turnoverQuarter, `${l.id} turnover`);
  if (l.listingType === "FORECLOSED") assert.ok(l.foreclosingInstitution, `${l.id} institution`);
  if (l.propertyType === "LOT_ONLY") assert.ok(l.lotAreaSqm, `${l.id} lot area`);
  if (l.foreignBuyerEligible) assert.equal(l.propertyType, "CONDOMINIUM", "only condos can be foreign-owned");
  const { x, y } = project(PH_MAP_VIEWS.philippines, l.lat, l.lng);
  assert.ok(x > 0 && x < 640 && y > 0 && y < 900, `${l.id} pin inside the map`);
}
assert.ok(AGENTS.every((a) => a.mobile.startsWith("+63")), "PH mobile numbers");

// Location tree
assert.equal(slugify("Parañaque"), "paranaque");
const flat = flattenLocations();
const bgc = flat.find((l) => l.name === "Bonifacio Global City")!;
assert.equal(bgc.key, "national-capital-region/metro-manila/taguig/bonifacio-global-city");
assert.equal(bgc.displayName, "Bonifacio Global City, Taguig");
assert.deepEqual(bgc.ancestorKeys, ["national-capital-region", "national-capital-region/metro-manila", "national-capital-region/metro-manila/taguig"]);
assert.ok(bgc.aliases.includes("BGC"));
assert.equal(new Set(flat.map((l) => l.key)).size, flat.length, "location keys must be unique");
for (const l of flat) {
  if (l.parentKey) assert.ok(flat.findIndex((p) => p.key === l.parentKey) < flat.indexOf(l), `${l.key} listed before its parent`);
}

// Seed against an in-memory fake client
const store = { locations: new Map<string, { id: string; parentId: string | null; ancestorIds: string[] }>(), amenities: 0, banners: [] as unknown[] };
const fake: SeedClient = {
  location: {
    async upsert(args: unknown) {
      const { where, create } = args as { where: { slug: string }; create: { parentId: string | null; ancestorIds: string[] } };
      const existing = store.locations.get(where.slug);
      const row = { id: existing?.id ?? `id_${store.locations.size}`, parentId: create.parentId, ancestorIds: create.ancestorIds };
      store.locations.set(where.slug, row);
      return row;
    },
  },
  amenity: { async upsert() { store.amenities++; return {}; } },
  heroBanner: {
    async findFirst(args: unknown) {
      const { where } = args as { where: { imageKey: string } };
      return store.banners.some((b) => (b as { imageKey: string }).imageKey === where.imageKey) ? { id: "x" } : null;
    },
    async create(args: unknown) { store.banners.push((args as { data: unknown }).data); return {}; },
  },
};

const first = await seed(fake);
await seed(fake); // idempotent
assert.equal(store.locations.size, first.locations);
assert.equal(store.banners.length, 5, "hero backgrounds must not duplicate on re-seed");
const taguig = store.locations.get("national-capital-region/metro-manila/taguig")!;
const bgcRow = store.locations.get(bgc.key)!;
assert.equal(bgcRow.parentId, taguig.id);
assert.equal(bgcRow.ancestorIds.length, 3);
assert.ok(bgcRow.ancestorIds.every(Boolean), "ancestor ids resolved");
const boholBanner = store.banners.find((b) => (b as { imageKey: string }).imageKey.includes("chocolate-hills")) as { locationId: string | null; photoCredit: string };
assert.ok(boholBanner.locationId, "Chocolate Hills banner targets Bohol");
assert.ok(boholBanner.photoCredit.includes("Unsplash"), "banner carries photo credit");

console.log(`All PH data checks passed (${flat.length} locations, ${first.amenities} amenities, ${first.heroBackgrounds} hero backgrounds).`);
