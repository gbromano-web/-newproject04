-- UAE market: country on locations, UAE broker licences, advertising permits
-- and rent cheques. Additive only; existing Philippine rows default to PH.
-- Run prisma/sql/postgis.sql afterwards for the listing rules that use the
-- new enum value (Postgres cannot use a new enum value in the same transaction).

-- CreateEnum
CREATE TYPE "Country" AS ENUM ('PH', 'AE');

-- AlterEnum
ALTER TYPE "LicenseType" ADD VALUE 'UAE_BROKER';

-- AlterTable
ALTER TABLE "Location" ADD COLUMN "country" "Country" NOT NULL DEFAULT 'PH',
ADD COLUMN "adPermitSystem" TEXT;

-- AlterTable
ALTER TABLE "Agent" ADD COLUMN "uaeRegulator" TEXT,
ADD COLUMN "uaeBrokerNumber" TEXT,
ADD COLUMN "uaeOfficeNumber" TEXT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN "adPermitNumber" TEXT,
ADD COLUMN "rentCheques" INTEGER;

-- CreateIndex
CREATE INDEX "Location_country_level_idx" ON "Location"("country", "level");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_uaeRegulator_uaeBrokerNumber_key" ON "Agent"("uaeRegulator", "uaeBrokerNumber");

-- CreateIndex
CREATE INDEX "Property_adPermitNumber_idx" ON "Property"("adPermitNumber");
