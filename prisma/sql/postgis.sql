-- Run once after `prisma migrate deploy` (Supabase: SQL editor, or psql).
-- Adds PostGIS columns' triggers and indexes, plus CHECK constraints that
-- enforce Philippine listing rules at the database level.

CREATE EXTENSION IF NOT EXISTS postgis;

-- ─── Geo sync: keep geo columns in step with lat/lng ─────────────────────────
CREATE OR REPLACE FUNCTION set_geo_from_lat_lng() RETURNS trigger AS $$
BEGIN
  NEW.geo := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
$$ LANGUAGE plpgsql;

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
  END);

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
