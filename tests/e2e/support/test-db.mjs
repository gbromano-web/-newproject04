// Throwaway Postgres for the auth test suite: the site's real schema and
// database rules (PostGIS columns stored as text, since PGlite has no PostGIS),
// plus the test accounts. Served over the Postgres protocol so the site
// connects exactly as it does to Supabase. In memory: every run starts clean.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const PORT = Number(process.env.TEST_DB_PORT || 54330);
const prisma = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../prisma");

const withoutPostgis = (sql) =>
  sql
    .replace(/CREATE EXTENSION[^;]*;/g, "")
    .replace(/CREATE SCHEMA IF NOT EXISTS extensions;/g, "")
    .replace(/geography\(Point, 4326\)|geometry\(MultiPolygon, 4326\)/g, "text")
    .replace(/CREATE INDEX[^;]*USING GIST[^;]*;/g, "")
    // The lat/lng → geography trigger needs PostGIS functions
    .replace(/-- ─── Geo sync[\s\S]*?(?=-- ─── Price per sqm)/, "");

const db = await PGlite.create();
for (const dir of fs.readdirSync(path.join(prisma, "migrations")).filter((d) => /^\d+_/.test(d)).sort((a, b) => parseInt(a) - parseInt(b))) {
  await db.exec(withoutPostgis(fs.readFileSync(path.join(prisma, "migrations", dir, "migration.sql"), "utf8")));
}
await db.exec(withoutPostgis(fs.readFileSync(path.join(prisma, "sql", "postgis.sql"), "utf8")));

// Supabase Auth's users table, as far as the site reads it (agent applications for /admin)
await db.exec(`
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY, email text NOT NULL, email_confirmed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  raw_user_meta_data jsonb NOT NULL DEFAULT '{}'
);`);

// Test accounts. User.id = the auth user id in tests/e2e/support/mock-auth.mjs
await db.exec(`
INSERT INTO "User"(id, email, role, "updatedAt") VALUES
  ('u_agent', 'agent@test.local', 'AGENT', now()),
  ('u_new', 'newagent@test.local', 'AGENT', now()),
  ('u_short', 'shortlived@test.local', 'AGENT', now()),
  ('u_unlinked', 'unlinked@test.local', 'BUYER', now()),
  ('u_uae', 'uae@test.local', 'AGENT', now());
INSERT INTO "Agency"(id, name, slug, "updatedAt") VALUES ('ag_test', 'Test Realty', 'test-realty', now());
INSERT INTO "Agent"(id, "userId", "agencyId", "licenseType", "prcLicenseNumber", "uaeRegulator", "uaeBrokerNumber", "uaeOfficeNumber", "displayName", mobile, verification, "updatedAt") VALUES
  ('a_agent', 'u_agent', 'ag_test', 'REAL_ESTATE_BROKER', '0099999', NULL, NULL, NULL, 'Maria Santos', '+639990000001', 'VERIFIED', now()),
  ('a_new', 'u_new', 'ag_test', 'UAE_BROKER', NULL, 'RERA BRN', '12345', '6789', 'Nadia Rahman', '+971500000001', 'VERIFIED', now()),
  ('a_short', 'u_short', 'ag_test', 'REAL_ESTATE_BROKER', '0088888', NULL, NULL, NULL, 'Sam Cruz', '+639990000002', 'VERIFIED', now()),
  ('a_uae', 'u_uae', NULL, 'UAE_BROKER', NULL, 'RERA BRN', '54321', '9876', 'Omar Saeed', '+971500000009', 'VERIFIED', now());
INSERT INTO "Lead"(id, "agentId", channel, name, email, message, "updatedAt") VALUES
  ('l_agent', 'a_agent', 'INQUIRY', 'Ana Reyes', 'ana@example.com', 'Is parking included?', now()),
  ('l_new', 'a_new', 'INQUIRY', 'Omar Haddad', 'omar@example.com', 'Is the unit vacant?', now());
`);

// Reference data (locations, amenities) generated from prisma/seed.ts, as on Supabase
const root = path.resolve(prisma, "..");
const seedSql = execFileSync(process.execPath, [path.join(root, "node_modules/tsx/dist/cli.mjs"), "scripts/seed-sql.mts"], { cwd: root, encoding: "utf8", maxBuffer: 1 << 26 });
await db.exec(seedSql);

// One live listing in each country, for the site checks
await db.exec(`
INSERT INTO "Property"(id, reference, slug, title, description, "listingType", "propertyType", status, price, "floorAreaSqm", bedrooms, bathrooms,
  "locationId", lat, lng, "agentId", "publishedAt", "foreignOwnershipEligible", "adPermitNumber", "updatedAt")
SELECT 'p_ph', 'GSP-PH1', 'test-bgc-2br-condo', 'Test 2BR condo in BGC', 'Bright corner unit near High Street.', 'SALE', 'CONDOMINIUM', 'ACTIVE', 12500000, 68, 2, 2,
  id, 14.5509, 121.0509, 'a_agent', now() - interval '1 day', true, NULL, now()
FROM "Location" WHERE slug = 'national-capital-region/metro-manila/taguig/bonifacio-global-city';
INSERT INTO "Property"(id, reference, slug, title, description, "listingType", "propertyType", status, price, "floorAreaSqm", bedrooms, bathrooms,
  "locationId", lat, lng, "agentId", "publishedAt", "foreignOwnershipEligible", "adPermitNumber", "updatedAt")
SELECT 'p_ae', 'GSP-AE1', 'test-dubai-marina-2br', 'Test 2BR marina apartment', 'Full marina views, walk to JBR.', 'SALE', 'CONDOMINIUM', 'ACTIVE', 2450000, 116, 2, 3,
  id, 25.0805, 55.1403, 'a_new', now() - interval '2 day', true, '7100001234', now()
FROM "Location" WHERE slug = 'uae/dubai/dubai-marina';
`);

const server = new PGLiteSocketServer({ db, port: PORT, host: "127.0.0.1", maxConnections: 20 });
await server.start();
console.log(`test db on ${PORT}`);
