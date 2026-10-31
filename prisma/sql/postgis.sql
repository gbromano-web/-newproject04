-- Run once after `prisma migrate deploy` (Supabase: SQL editor, or psql).
-- Adds PostGIS columns' triggers and indexes, plus CHECK constraints that
-- enforce Philippine listing rules at the database level.

-- Safe to re-run. Runs as one transaction: if any statement fails, nothing is applied.
-- On a large live table, add new CHECK constraints with NOT VALID first, then
-- VALIDATE CONSTRAINT separately, to avoid a long write lock.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- ─── Geo sync: keep geo columns in step with lat/lng ─────────────────────────
CREATE OR REPLACE FUNCTION set_geo_from_lat_lng() RETURNS trigger AS $$
BEGIN
  NEW.geo := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, extensions;

DROP TRIGGER IF EXISTS trg_property_geo ON "Property";
CREATE TRIGGER trg_property_geo
  BEFORE INSERT OR UPDATE OF lat, lng ON "Property"
  FOR EACH ROW EXECUTE FUNCTION set_geo_from_lat_lng();

DROP TRIGGER IF EXISTS trg_project_geo ON "Project";
CREATE TRIGGER trg_project_geo
  BEFORE INSERT OR UPDATE OF lat, lng ON "Project"
  FOR EACH ROW EXECUTE FUNCTION set_geo_from_lat_lng();

CREATE INDEX IF NOT EXISTS property_geo_gist      ON "Property" USING GIST (geo);
CREATE INDEX IF NOT EXISTS project_geo_gist       ON "Project"  USING GIST (geo);
CREATE INDEX IF NOT EXISTS location_boundary_gist ON "Location" USING GIST (boundary);

-- ─── Price per sqm, used for sorting and the "₱/sqm" label ───────────────────
CREATE OR REPLACE FUNCTION set_price_per_sqm() RETURNS trigger AS $$
DECLARE area numeric;
BEGIN
  -- Lots and agricultural land are priced by lot area; everything else by floor area
  area := CASE WHEN NEW."propertyType" IN ('LOT_ONLY', 'AGRICULTURAL')
               THEN NEW."lotAreaSqm" ELSE COALESCE(NEW."floorAreaSqm", NEW."lotAreaSqm") END;
  NEW."pricePerSqm" := CASE WHEN area > 0 AND NEW."listingType" <> 'RENT'
                            THEN round(NEW.price / area, 2) END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, extensions;

DROP TRIGGER IF EXISTS trg_property_price_per_sqm ON "Property";
CREATE TRIGGER trg_property_price_per_sqm
  BEFORE INSERT OR UPDATE OF price, "floorAreaSqm", "lotAreaSqm", "propertyType", "listingType" ON "Property"
  FOR EACH ROW EXECUTE FUNCTION set_price_per_sqm();

-- ─── Listing rules ───────────────────────────────────────────────────────────
ALTER TABLE "Property" DROP CONSTRAINT IF EXISTS property_rent_needs_period;
ALTER TABLE "Property" ADD CONSTRAINT property_rent_needs_period
  CHECK ("listingType" <> 'RENT' OR "rentPeriod" IS NOT NULL);

ALTER TABLE "Property" DROP CONSTRAINT IF EXISTS property_preselling_turnover;
ALTER TABLE "Property" ADD CONSTRAINT property_preselling_turnover
  CHECK ("listingType" <> 'PRE_SELLING'
         OR ("turnoverYear" IS NOT NULL AND "turnoverQuarter" BETWEEN 1 AND 4));

ALTER TABLE "Property" DROP CONSTRAINT IF EXISTS property_foreclosed_institution;
ALTER TABLE "Property" ADD CONSTRAINT property_foreclosed_institution
  CHECK ("listingType" <> 'FORECLOSED' OR "foreclosingInstitution" IS NOT NULL);

ALTER TABLE "Property" DROP CONSTRAINT IF EXISTS property_area_by_type;
ALTER TABLE "Property" ADD CONSTRAINT property_area_by_type
  CHECK (CASE
    WHEN "propertyType" IN ('LOT_ONLY', 'AGRICULTURAL') THEN COALESCE("lotAreaSqm", 0) > 0
    WHEN "propertyType" = 'HOUSE_AND_LOT'               THEN COALESCE("lotAreaSqm", 0) > 0 AND COALESCE("floorAreaSqm", 0) > 0
    ELSE COALESCE("floorAreaSqm", 0) > 0
  END);
-- (COALESCE matters: a CHECK that evaluates to NULL counts as passing.)

ALTER TABLE "Property" DROP CONSTRAINT IF EXISTS property_price_positive;
ALTER TABLE "Property" ADD CONSTRAINT property_price_positive CHECK (price > 0);

ALTER TABLE "Project" DROP CONSTRAINT IF EXISTS project_turnover_quarter;
ALTER TABLE "Project" ADD CONSTRAINT project_turnover_quarter
  CHECK ("turnoverQuarter" IS NULL OR "turnoverQuarter" BETWEEN 1 AND 4);

-- ─── Agent licensing (RESA, RA 9646) ─────────────────────────────────────────
-- Brokers need a PRC licence number; salespersons need DHSUD accreditation
-- and a supervising broker.
ALTER TABLE "Agent" DROP CONSTRAINT IF EXISTS agent_license_fields;
ALTER TABLE "Agent" ADD CONSTRAINT agent_license_fields
  CHECK (CASE "licenseType"
    WHEN 'REAL_ESTATE_BROKER'      THEN "prcLicenseNumber" IS NOT NULL
    WHEN 'REAL_ESTATE_SALESPERSON' THEN "dhsudAccreditationNumber" IS NOT NULL
                                        AND "supervisingBrokerId" IS NOT NULL
    ELSE FALSE -- a new licence type must be added here explicitly (NULL would pass the CHECK)
  END);

-- Audit log is append-only: block updates and deletes at the database level
CREATE OR REPLACE FUNCTION audit_log_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only';
END;
$$ LANGUAGE plpgsql SET search_path = public, extensions;

DROP TRIGGER IF EXISTS trg_audit_log_append_only ON "AuditLog";
CREATE TRIGGER trg_audit_log_append_only
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit_log_append_only();

-- ─── Data Privacy Act: erasure and retention ─────────────────────────────────
-- Erase a buyer's account: anonymise their leads (kept for the agent's
-- statistics), delete the user (favourites and saved searches cascade) and
-- record it in the audit log. Agents are offboarded separately: their
-- listings and received leads must be reassigned first.
--   SELECT erase_user('<user id>', '<admin user id>', '<request id>');
CREATE OR REPLACE FUNCTION erase_user(p_user_id text, p_actor text DEFAULT NULL, p_request_id text DEFAULT NULL)
RETURNS integer AS $$
DECLARE
  v_email text;
  v_agent text;
  v_listings integer;
  v_received integer;
  v_leads integer;
BEGIN
  SELECT email INTO v_email FROM "User" WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'erase_user: user % not found', p_user_id USING ERRCODE = 'no_data_found';
  END IF;

  SELECT id INTO v_agent FROM "Agent" WHERE "userId" = p_user_id;
  IF v_agent IS NOT NULL THEN
    SELECT count(*) INTO v_listings FROM "Property" WHERE "agentId" = v_agent;
    SELECT count(*) INTO v_received FROM "Lead" WHERE "agentId" = v_agent;
    IF v_listings > 0 OR v_received > 0 THEN
      RAISE EXCEPTION 'erase_user: user % is an agent with % listings and % leads; reassign them first', p_user_id, v_listings, v_received
        USING ERRCODE = 'foreign_key_violation';
    END IF;
  END IF;

  UPDATE "Lead"
     SET name = NULL, email = NULL, mobile = NULL, message = NULL, "userAgent" = NULL,
         "ipHash" = NULL, computation = NULL, "userId" = NULL, "updatedAt" = now()
   WHERE "userId" = p_user_id OR (v_email IS NOT NULL AND lower(email) = lower(v_email));
  GET DIAGNOSTICS v_leads = ROW_COUNT;

  DELETE FROM "User" WHERE id = p_user_id;

  -- No personal data in the log entry itself
  INSERT INTO "AuditLog" (id, "actorUserId", action, "entityType", "entityId", after, "requestId", "createdAt")
  VALUES (gen_random_uuid()::text, p_actor, 'user.erased', 'User', p_user_id,
          jsonb_build_object('leadsAnonymised', v_leads), p_request_id, now());
  RETURN v_leads;
END;
$$ LANGUAGE plpgsql SET search_path = public, extensions;

-- Retention: strip personal data from leads older than p_months (default 24)
-- and drop expired rate-limit rows. Schedule daily, e.g. on Supabase:
--   SELECT cron.schedule('lead-retention', '15 3 * * *', $c$SELECT purge_old_leads(24)$c$);
CREATE OR REPLACE FUNCTION purge_old_leads(p_months integer DEFAULT 24)
RETURNS integer AS $$
DECLARE
  v_leads integer;
  v_limits integer;
BEGIN
  IF p_months IS NULL OR p_months < 1 THEN
    RAISE EXCEPTION 'purge_old_leads: p_months must be at least 1';
  END IF;

  UPDATE "Lead"
     SET name = NULL, email = NULL, mobile = NULL, message = NULL, "userAgent" = NULL,
         "ipHash" = NULL, computation = NULL, "updatedAt" = now()
   WHERE "createdAt" < now() - make_interval(months => p_months)
     AND (name IS NOT NULL OR email IS NOT NULL OR mobile IS NOT NULL OR message IS NOT NULL
          OR "userAgent" IS NOT NULL OR "ipHash" IS NOT NULL OR computation IS NOT NULL);
  GET DIAGNOSTICS v_leads = ROW_COUNT;

  DELETE FROM "RateLimit" WHERE "windowStart" < now() - interval '1 day';
  GET DIAGNOSTICS v_limits = ROW_COUNT;

  IF v_leads > 0 THEN
    INSERT INTO "AuditLog" (id, action, "entityType", "entityId", after, "createdAt")
    VALUES (gen_random_uuid()::text, 'lead.retention_purge', 'Lead', 'batch',
            jsonb_build_object('leadsAnonymised', v_leads, 'months', p_months), now());
  END IF;
  RETURN v_leads;
END;
$$ LANGUAGE plpgsql SET search_path = public, extensions;

COMMIT;

-- ─── Example queries ─────────────────────────────────────────────────────────
-- Active condos for sale within 1.5 km of a point in BGC:
-- SELECT id, title FROM "Property"
-- WHERE status = 'ACTIVE' AND "listingType" = 'SALE' AND "propertyType" = 'CONDOMINIUM'
--   AND ST_DWithin(geo, ST_MakePoint(121.0509, 14.5509)::geography, 1500);
--
-- Everything inside Taguig, at any depth (district, barangay):
-- SELECT p.id FROM "Property" p JOIN "Location" l ON l.id = p."locationId"
-- WHERE l.id = :taguigId OR :taguigId = ANY (l."ancestorIds");
--
-- Map viewport (west, south, east, north):
-- SELECT id FROM "Property"
-- WHERE geo && ST_MakeEnvelope(120.98, 14.52, 121.08, 14.60, 4326)::geography;
