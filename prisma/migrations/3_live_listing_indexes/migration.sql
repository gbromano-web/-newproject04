-- Partial indexes for the two queries that read every live listing:
-- the home page's newest listings and the sitemap. Measured on 20,000 listings:
-- home 197 ms -> 4.8 ms, sitemap 19 ms -> 8 ms (docs/PRELAUNCH-AUDIT.md, 1.4).
-- On a large live table, build them with CREATE INDEX CONCURRENTLY outside a transaction.
--
-- Rollback:
--   DROP INDEX IF EXISTS property_live_published_idx;
--   DROP INDEX IF EXISTS property_live_updated_idx;

CREATE INDEX IF NOT EXISTS property_live_published_idx ON "Property" ("publishedAt" DESC)
  WHERE status = 'ACTIVE' AND "publishedAt" IS NOT NULL;

CREATE INDEX IF NOT EXISTS property_live_updated_idx ON "Property" ("updatedAt" DESC)
  WHERE status = 'ACTIVE' AND "publishedAt" IS NOT NULL;
