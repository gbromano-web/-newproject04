/**
 * Prints the reference-data seed (locations, amenities, hero backgrounds) as
 * idempotent SQL, for databases you reach without the Prisma client
 * (e.g. the Supabase SQL editor). Same data and logic as prisma/seed.ts.
 *   npx tsx scripts/seed-sql.mts > seed.sql
 */
import { createHash } from "node:crypto";
import { seed, type SeedClient } from "../prisma/seed";

const id = (prefix: string, key: string) => `${prefix}_${createHash("sha256").update(key).digest("hex").slice(0, 20)}`;
const lit = (v: unknown): string => {
  if (v === null || v === undefined) return "NULL";
  if (Array.isArray(v)) return v.length ? `ARRAY[${v.map(lit).join(", ")}]::text[]` : "ARRAY[]::text[]";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
};
// Rows are collected per table and written as one INSERT each (compact, one round trip)
const rows: Record<string, { conflict: string; update: string[]; cols: string[]; values: string[] }> = {};
function add(table: string, conflict: string, row: Record<string, unknown>, updateKeys: string[], raw: Record<string, string> = {}) {
  const t = (rows[table] ??= { conflict, update: updateKeys, cols: Object.keys(row), values: [] });
  t.values.push(`(${Object.entries(row).map(([k, v]) => raw[k] ?? lit(v)).join(", ")})`);
}

const client: SeedClient = {
  location: {
    async upsert(a: unknown) {
      const { create } = a as { create: Record<string, unknown> & { slug: string; level: string } };
      const row = { id: id("loc", create.slug), ...create };
      add("Location", "slug", row, Object.keys(row).filter((k) => k !== "id" && k !== "slug"));
      return { id: row.id };
    },
  },
  amenity: {
    async upsert(a: unknown) {
      const { create } = a as { create: Record<string, unknown> & { key: string } };
      const row = { id: id("amn", create.key), ...create };
      add("Amenity", "key", row, Object.keys(row).filter((k) => k !== "id" && k !== "key"));
      return {};
    },
  },
  heroBanner: {
    async findFirst() {
      return null; // existence is checked in SQL below
    },
    async create(a: unknown) {
      const { data } = a as { data: Record<string, unknown> & { imageKey: string } };
      const row = { id: id("hero", data.imageKey), ...data, updatedAt: "now()" };
      add("HeroBanner", "id", row, [], { updatedAt: "now()" });
      return {};
    },
  },
};

const counts = await seed(client);
console.log(`-- Reference data: ${JSON.stringify(counts)}`);
for (const [table, t] of Object.entries(rows)) {
  const action = t.update.length ? `DO UPDATE SET ${t.update.map((k) => `"${k}" = EXCLUDED."${k}"`).join(", ")}` : "DO NOTHING";
  console.log(`INSERT INTO "${table}" (${t.cols.map((c) => `"${c}"`).join(", ")}) VALUES\n${t.values.join(",\n")}\nON CONFLICT ("${t.conflict}") ${action};`);
}
