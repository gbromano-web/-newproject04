-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE SCHEMA IF NOT EXISTS "extensions";
CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA "extensions";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('BUYER', 'AGENT', 'AGENCY_ADMIN', 'DEVELOPER_ADMIN', 'SYSTEM_ADMIN');

-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('SALE', 'RENT', 'PRE_SELLING', 'FORECLOSED');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('CONDOMINIUM', 'TOWNHOUSE', 'HOUSE_AND_LOT', 'LOT_ONLY', 'COMMERCIAL', 'AGRICULTURAL', 'WAREHOUSE');

-- CreateEnum
CREATE TYPE "CommercialSubtype" AS ENUM ('OFFICE', 'RETAIL', 'BUILDING', 'RESTAURANT', 'HOTEL_RESORT', 'INDUSTRIAL');

-- CreateEnum
CREATE TYPE "RentPeriod" AS ENUM ('MONTHLY', 'YEARLY', 'DAILY');

-- CreateEnum
CREATE TYPE "Furnishing" AS ENUM ('FULLY_FURNISHED', 'SEMI_FURNISHED', 'UNFURNISHED', 'BARE');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'EXPIRED', 'REJECTED', 'SOLD', 'RENTED');

-- CreateEnum
CREATE TYPE "LocationLevel" AS ENUM ('REGION', 'PROVINCE', 'CITY', 'MUNICIPALITY', 'BARANGAY', 'DISTRICT');

-- CreateEnum
CREATE TYPE "TitleType" AS ENUM ('TCT', 'CCT', 'OCT', 'TAX_DECLARATION', 'CONTRACT_TO_SELL');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PRE_SELLING', 'UNDER_CONSTRUCTION', 'READY_FOR_OCCUPANCY', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ForeclosureSaleMode" AS ENUM ('NEGOTIATED', 'PUBLIC_AUCTION', 'SEALED_BID');

-- CreateEnum
CREATE TYPE "OccupancyStatus" AS ENUM ('VACANT', 'OCCUPIED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('PHOTO', 'FLOOR_PLAN', 'VIDEO', 'VIRTUAL_TOUR', 'BROCHURE_PDF', 'SITE_DEVELOPMENT_PLAN');

-- CreateEnum
CREATE TYPE "LicenseType" AS ENUM ('REAL_ESTATE_BROKER', 'REAL_ESTATE_SALESPERSON');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'EXPIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LeadChannel" AS ENUM ('VIBER', 'WHATSAPP', 'INQUIRY', 'SAMPLE_COMPUTATION', 'CALL', 'CALLBACK', 'SMS');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'SITE_VIEWING_SCHEDULED', 'RESERVED', 'WON', 'LOST', 'SPAM');

-- CreateEnum
CREATE TYPE "FinancingType" AS ENUM ('PAGIBIG', 'BANK', 'IN_HOUSE', 'CASH', 'SPOT_CASH');

-- CreateEnum
CREATE TYPE "BannerPlacement" AS ENUM ('HOME_HERO', 'DEVELOPER_SLIDER', 'SEARCH_TOP', 'PROPERTY_SIDEBAR');

-- CreateEnum
CREATE TYPE "AmenityCategory" AS ENUM ('UNIT', 'BUILDING', 'COMMUNITY', 'SECURITY', 'UTILITIES');

-- CreateEnum
CREATE TYPE "AlertFrequency" AS ENUM ('INSTANT', 'DAILY', 'WEEKLY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobile" TEXT,
    "name" TEXT,
    "avatarUrl" TEXT,
    "role" "Role" NOT NULL DEFAULT 'BUYER',
    "locale" TEXT NOT NULL DEFAULT 'en-PH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "psgcCode" TEXT,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "level" "LocationLevel" NOT NULL,
    "parentId" TEXT,
    "ancestorIds" TEXT[],
    "aliases" TEXT[],
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "boundary" geometry(MultiPolygon, 4326),
    "listingCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Developer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoKey" TEXT,
    "coverKey" TEXT,
    "description" TEXT,
    "website" TEXT,
    "secRegistration" TEXT,
    "verification" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedAt" TIMESTAMP(3),
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Developer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeveloperMember" (
    "developerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeveloperMember_pkey" PRIMARY KEY ("developerId","userId")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL,
    "locationId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "geo" geography(Point, 4326),
    "dhsudLicenseToSell" TEXT,
    "dhsudLtsIssuedAt" TIMESTAMP(3),
    "turnoverQuarter" INTEGER,
    "turnoverYear" INTEGER,
    "totalUnits" INTEGER,
    "towers" INTEGER,
    "priceFrom" DECIMAL(15,2),
    "priceTo" DECIMAL(15,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMedia" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoKey" TEXT,
    "brandColor" TEXT,
    "description" TEXT,
    "dhsudRegistrationNo" TEXT,
    "secOrDtiRegistration" TEXT,
    "officeAddress" TEXT,
    "locationId" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "verification" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedAt" TIMESTAMP(3),
    "promotionCredits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agencyId" TEXT,
    "licenseType" "LicenseType" NOT NULL,
    "prcLicenseNumber" TEXT,
    "prcLicenseValidUntil" TIMESTAMP(3),
    "dhsudAccreditationNumber" TEXT,
    "dhsudAccreditationValidUntil" TIMESTAMP(3),
    "supervisingBrokerId" TEXT,
    "licenseDocKey" TEXT,
    "verification" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "displayName" TEXT NOT NULL,
    "photoKey" TEXT,
    "title" TEXT,
    "bio" TEXT,
    "mobile" TEXT NOT NULL,
    "viberNumber" TEXT,
    "whatsappNumber" TEXT,
    "languages" TEXT[] DEFAULT ARRAY['English', 'Filipino']::TEXT[],
    "serviceAreaIds" TEXT[],
    "activeListingsCount" INTEGER NOT NULL DEFAULT 0,
    "medianReplyMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "listingType" "ListingType" NOT NULL,
    "propertyType" "PropertyType" NOT NULL,
    "commercialSubtype" "CommercialSubtype",
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "price" DECIMAL(15,2) NOT NULL,
    "rentPeriod" "RentPeriod",
    "pricePerSqm" DECIMAL(12,2),
    "priceNegotiable" BOOLEAN NOT NULL DEFAULT false,
    "associationDues" DECIMAL(10,2),
    "rentDepositMonths" INTEGER,
    "rentAdvanceMonths" INTEGER,
    "minLeaseMonths" INTEGER,
    "floorAreaSqm" DECIMAL(10,2),
    "lotAreaSqm" DECIMAL(12,2),
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "parkingSlots" INTEGER,
    "floorLevel" INTEGER,
    "unitType" TEXT,
    "furnishing" "Furnishing",
    "titleType" "TitleType",
    "foreignOwnershipEligible" BOOLEAN NOT NULL DEFAULT false,
    "locationId" TEXT NOT NULL,
    "addressLine" TEXT,
    "showExactPin" BOOLEAN NOT NULL DEFAULT true,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "geo" geography(Point, 4326),
    "projectId" TEXT,
    "turnoverQuarter" INTEGER,
    "turnoverYear" INTEGER,
    "reservationFee" DECIMAL(12,2),
    "downpaymentPercent" DECIMAL(5,2),
    "downpaymentTermMonths" INTEGER,
    "spotCashDiscountPercent" DECIMAL(5,2),
    "foreclosingInstitution" TEXT,
    "institutionPropertyCode" TEXT,
    "minimumBidPrice" DECIMAL(15,2),
    "saleMode" "ForeclosureSaleMode",
    "auctionDate" TIMESTAMP(3),
    "occupancy" "OccupancyStatus",
    "asIsWhereIs" BOOLEAN NOT NULL DEFAULT true,
    "agencyId" TEXT,
    "agentId" TEXT NOT NULL,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "featuredUntil" TIMESTAMP(3),
    "qualityScore" INTEGER NOT NULL DEFAULT 0,
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "leadsCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyMedia" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "blurDataUrl" TEXT,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Amenity" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" "AmenityCategory" NOT NULL,
    "icon" TEXT,

    CONSTRAINT "Amenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyAmenity" (
    "propertyId" TEXT NOT NULL,
    "amenityId" TEXT NOT NULL,

    CONSTRAINT "PropertyAmenity_pkey" PRIMARY KEY ("propertyId","amenityId")
);

-- CreateTable
CREATE TABLE "NearbyPlace" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "distanceM" INTEGER NOT NULL,
    "durationMin" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NearbyPlace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceChange" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "oldPrice" DECIMAL(15,2) NOT NULL,
    "newPrice" DECIMAL(15,2) NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeroBanner" (
    "id" TEXT NOT NULL,
    "placement" "BannerPlacement" NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "imageKey" TEXT NOT NULL,
    "mobileImageKey" TEXT,
    "altText" TEXT NOT NULL,
    "photoCredit" TEXT,
    "photoCreditUrl" TEXT,
    "ctaLabel" TEXT,
    "ctaUrl" TEXT,
    "developerId" TEXT,
    "projectId" TEXT,
    "locationId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeroBanner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT,
    "agentId" TEXT NOT NULL,
    "userId" TEXT,
    "channel" "LeadChannel" NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "name" TEXT,
    "email" TEXT,
    "mobile" TEXT,
    "message" TEXT,
    "preferredContactAt" TIMESTAMP(3),
    "financingType" "FinancingType",
    "downpaymentPercent" DECIMAL(5,2),
    "loanTermYears" INTEGER,
    "grossMonthlyIncome" DECIMAL(12,2),
    "computation" JSONB,
    "sessionId" TEXT,
    "sourcePage" TEXT,
    "bannerId" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "consentAt" TIMESTAMP(3),
    "firstReplyAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadEvent" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ipHash" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "frequency" "AlertFrequency" NOT NULL DEFAULT 'DAILY',
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("userId","propertyId")
);

-- CreateTable
CREATE TABLE "FinancingProgram" (
    "id" TEXT NOT NULL,
    "type" "FinancingType" NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "annualRatePercent" DECIMAL(6,3) NOT NULL,
    "rateFixingYears" INTEGER,
    "maxTermYears" INTEGER NOT NULL,
    "maxLoanAmount" DECIMAL(15,2),
    "maxLoanToValuePct" DECIMAL(5,2),
    "minDownpaymentPct" DECIMAL(5,2),
    "maxBorrowerAge" INTEGER,
    "incomeRatioPct" DECIMAL(5,2),
    "sourceUrl" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancingProgram_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_mobile_key" ON "User"("mobile");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Location_psgcCode_key" ON "Location"("psgcCode");

-- CreateIndex
CREATE UNIQUE INDEX "Location_slug_key" ON "Location"("slug");

-- CreateIndex
CREATE INDEX "Location_parentId_idx" ON "Location"("parentId");

-- CreateIndex
CREATE INDEX "Location_level_idx" ON "Location"("level");

-- CreateIndex
CREATE INDEX "Location_ancestorIds_idx" ON "Location" USING GIN ("ancestorIds");

-- CreateIndex
CREATE UNIQUE INDEX "Developer_slug_key" ON "Developer"("slug");

-- CreateIndex
CREATE INDEX "Developer_isFeatured_idx" ON "Developer"("isFeatured");

-- CreateIndex
CREATE INDEX "DeveloperMember_userId_idx" ON "DeveloperMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE INDEX "Project_developerId_idx" ON "Project"("developerId");

-- CreateIndex
CREATE INDEX "Project_locationId_status_idx" ON "Project"("locationId", "status");

-- CreateIndex
CREATE INDEX "ProjectMedia_projectId_kind_sortOrder_idx" ON "ProjectMedia"("projectId", "kind", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Agency_slug_key" ON "Agency"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_userId_key" ON "Agent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_prcLicenseNumber_key" ON "Agent"("prcLicenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_dhsudAccreditationNumber_key" ON "Agent"("dhsudAccreditationNumber");

-- CreateIndex
CREATE INDEX "Agent_agencyId_idx" ON "Agent"("agencyId");

-- CreateIndex
CREATE INDEX "Agent_verification_idx" ON "Agent"("verification");

-- CreateIndex
CREATE INDEX "Agent_supervisingBrokerId_idx" ON "Agent"("supervisingBrokerId");

-- CreateIndex
CREATE UNIQUE INDEX "Property_reference_key" ON "Property"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Property_slug_key" ON "Property"("slug");

-- CreateIndex
CREATE INDEX "Property_status_listingType_propertyType_idx" ON "Property"("status", "listingType", "propertyType");

-- CreateIndex
CREATE INDEX "Property_locationId_status_idx" ON "Property"("locationId", "status");

-- CreateIndex
CREATE INDEX "Property_price_idx" ON "Property"("price");

-- CreateIndex
CREATE INDEX "Property_pricePerSqm_idx" ON "Property"("pricePerSqm");

-- CreateIndex
CREATE INDEX "Property_floorAreaSqm_idx" ON "Property"("floorAreaSqm");

-- CreateIndex
CREATE INDEX "Property_bedrooms_idx" ON "Property"("bedrooms");

-- CreateIndex
CREATE INDEX "Property_turnoverYear_turnoverQuarter_idx" ON "Property"("turnoverYear", "turnoverQuarter");

-- CreateIndex
CREATE INDEX "Property_agentId_idx" ON "Property"("agentId");

-- CreateIndex
CREATE INDEX "Property_agencyId_status_idx" ON "Property"("agencyId", "status");

-- CreateIndex
CREATE INDEX "Property_projectId_idx" ON "Property"("projectId");

-- CreateIndex
CREATE INDEX "Property_isFeatured_publishedAt_idx" ON "Property"("isFeatured", "publishedAt");

-- CreateIndex
CREATE INDEX "PropertyMedia_propertyId_kind_sortOrder_idx" ON "PropertyMedia"("propertyId", "kind", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Amenity_key_key" ON "Amenity"("key");

-- CreateIndex
CREATE INDEX "PropertyAmenity_amenityId_idx" ON "PropertyAmenity"("amenityId");

-- CreateIndex
CREATE INDEX "NearbyPlace_propertyId_kind_idx" ON "NearbyPlace"("propertyId", "kind");

-- CreateIndex
CREATE INDEX "PriceChange_propertyId_changedAt_idx" ON "PriceChange"("propertyId", "changedAt");

-- CreateIndex
CREATE INDEX "HeroBanner_placement_isActive_sortOrder_idx" ON "HeroBanner"("placement", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "HeroBanner_developerId_idx" ON "HeroBanner"("developerId");

-- CreateIndex
CREATE INDEX "Lead_agentId_status_createdAt_idx" ON "Lead"("agentId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_propertyId_createdAt_idx" ON "Lead"("propertyId", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_channel_createdAt_idx" ON "Lead"("channel", "createdAt");

-- CreateIndex
CREATE INDEX "LeadEvent_leadId_createdAt_idx" ON "LeadEvent"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "RateLimit_windowStart_idx" ON "RateLimit"("windowStart");

-- CreateIndex
CREATE INDEX "SavedSearch_userId_idx" ON "SavedSearch"("userId");

-- CreateIndex
CREATE INDEX "Favorite_propertyId_idx" ON "Favorite"("propertyId");

-- CreateIndex
CREATE INDEX "FinancingProgram_type_isActive_idx" ON "FinancingProgram"("type", "isActive");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeveloperMember" ADD CONSTRAINT "DeveloperMember_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeveloperMember" ADD CONSTRAINT "DeveloperMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMedia" ADD CONSTRAINT "ProjectMedia_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_supervisingBrokerId_fkey" FOREIGN KEY ("supervisingBrokerId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyMedia" ADD CONSTRAINT "PropertyMedia_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyAmenity" ADD CONSTRAINT "PropertyAmenity_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyAmenity" ADD CONSTRAINT "PropertyAmenity_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "Amenity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NearbyPlace" ADD CONSTRAINT "NearbyPlace_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceChange" ADD CONSTRAINT "PriceChange_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeroBanner" ADD CONSTRAINT "HeroBanner_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeroBanner" ADD CONSTRAINT "HeroBanner_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeroBanner" ADD CONSTRAINT "HeroBanner_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadEvent" ADD CONSTRAINT "LeadEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

