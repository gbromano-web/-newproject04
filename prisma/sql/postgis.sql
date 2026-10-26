-- Run once after `prisma migrate deploy`.
CREATE EXTENSION IF NOT EXISTS postgis;

-- Keep Property.geo in sync with lat/lng
CREATE OR REPLACE FUNCTION property_set_geo() RETURNS trigger AS $$
BEGIN
  NEW.geo := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_property_geo ON "Property";
CREATE TRIGGER trg_property_geo
  BEFORE INSERT OR UPDATE OF lat, lng ON "Property"
  FOR EACH ROW EXECUTE FUNCTION property_set_geo();

CREATE INDEX IF NOT EXISTS property_geo_gist ON "Property" USING GIST (geo);
CREATE INDEX IF NOT EXISTS location_boundary_gist ON "Location" USING GIST (boundary);

-- Example: live listings within 2 km of a metro station
-- SELECT id, title FROM "Property"
-- WHERE status = 'LIVE'
--   AND ST_DWithin(geo, ST_MakePoint(55.1442, 25.0693)::geography, 2000);

-- Example: listings inside the current map viewport (west, south, east, north)
-- SELECT id FROM "Property"
-- WHERE geo && ST_MakeEnvelope(55.10, 24.97, 55.36, 25.22, 4326)::geography;
