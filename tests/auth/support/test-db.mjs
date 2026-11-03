// Throwaway Postgres for the auth test suite: the site's real schema and
// database rules (PostGIS columns stored as text, since PGlite has no PostGIS),
// plus the test accounts. Served over the Postgres protocol so the site
// connects exactly as it does to Supabase. In memory: every run starts clean.
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

// Test accounts. User.id = the auth user id in tests/auth/support/mock-auth.mjs
await db.exec(`
INSERT INTO "User"(id, email, role, "updatedAt") VALUES
  ('u_agent', 'agent@test.local', 'AGENT', now()),
  ('u_new', 'newagent@test.local', 'AGENT', now()),
  ('u_short', 'shortlived@test.local', 'AGENT', now()),
  ('u_unlinked', 'unlinked@test.local', 'BUYER', now());
INSERT INTO "Agency"(id, name, slug, "updatedAt") VALUES ('ag_test', 'Test Realty', 'test-realty', now());
INSERT INTO "Agent"(id, "userId", "agencyId", "licenseType", "prcLicenseNumber", "uaeRegulator", "uaeBrokerNumber", "uaeOfficeNumber", "displayName", mobile, verification, "updatedAt") VALUES
  ('a_agent', 'u_agent', 'ag_test', 'REAL_ESTATE_BROKER', '0099999', NULL, NULL, NULL, 'Maria Santos', '+639990000001', 'VERIFIED', now()),
  ('a_new', 'u_new', 'ag_test', 'UAE_BROKER', NULL, 'RERA BRN', '12345', '6789', 'Nadia Rahman', '+971500000001', 'VERIFIED', now()),
  ('a_short', 'u_short', 'ag_test', 'REAL_ESTATE_BROKER', '0088888', NULL, NULL, NULL, 'Sam Cruz', '+639990000002', 'VERIFIED', now());
INSERT INTO "Lead"(id, "agentId", channel, name, email, message, "updatedAt") VALUES
  ('l_agent', 'a_agent', 'INQUIRY', 'Ana Reyes', 'ana@example.com', 'Is parking included?', now()),
  ('l_new', 'a_new', 'INQUIRY', 'Omar Haddad', 'omar@example.com', 'Is the unit vacant?', now());
`);

const server = new PGLiteSocketServer({ db, port: PORT, host: "127.0.0.1", maxConnections: 20 });
await server.start();
console.log(`test db on ${PORT}`);
