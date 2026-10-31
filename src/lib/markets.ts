// The two markets the site serves. Everything that differs between the
// Philippines and the UAE (currency, labels, licences, paths) is read from here,
// so pages and components stay shared.

import type { ListingType, PropertyType } from "./ph/listings";

export type CountryCode = "PH" | "AE";

export interface Market {
  code: CountryCode;
  name: string; // "Philippines", "UAE"
  inName: string; // "in the Philippines", "in the UAE"
  currency: "PHP" | "AED";
  locale: string;
  home: string;
  search: string;
  calculator: string;
  /** Transaction tabs offered in search, in order */
  listingTypes: ListingType[];
  listingTypeLabel: Record<ListingType, string>;
  /** Search tab labels ("Buy", "Rent", ...) */
  tabLabel: Record<ListingType, string>;
  propertyTypes: PropertyType[];
  propertyTypeLabel: Record<PropertyType, string>;
  propertyTypeNoun: Record<PropertyType, string>;
  /** Areas: the Philippines quotes square metres, the UAE square feet */
  areaUnit: "sqm" | "sqft";
  defaultRentPeriod: "MONTHLY" | "YEARLY";
  /** Badge for listings foreigners can buy outright */
  ownershipBadge: string;
  ownershipFilter: { title: string; body: string };
  saleSteps: number[];
  rentSteps: number[];
  locationPlaceholder: string;
  hasViber: boolean;
  privacyLaw: string;
}

const PH: Market = {
  code: "PH",
  name: "Philippines",
  inName: "in the Philippines",
  currency: "PHP",
  locale: "en-PH",
  home: "/",
  search: "/search",
  calculator: "/calculator",
  listingTypes: ["SALE", "RENT", "PRE_SELLING", "FORECLOSED"],
  listingTypeLabel: { SALE: "For sale", RENT: "For rent", PRE_SELLING: "Pre-selling", FORECLOSED: "Foreclosed" },
  tabLabel: { SALE: "Buy", RENT: "Rent", PRE_SELLING: "Pre-selling", FORECLOSED: "Foreclosed" },
  propertyTypes: ["CONDOMINIUM", "TOWNHOUSE", "HOUSE_AND_LOT", "LOT_ONLY", "COMMERCIAL", "AGRICULTURAL", "WAREHOUSE"],
  propertyTypeLabel: {
    CONDOMINIUM: "Condominium", TOWNHOUSE: "Townhouse", HOUSE_AND_LOT: "House and Lot", LOT_ONLY: "Lot Only",
    COMMERCIAL: "Commercial", AGRICULTURAL: "Agricultural", WAREHOUSE: "Warehouse",
  },
  propertyTypeNoun: {
    CONDOMINIUM: "Condominiums", TOWNHOUSE: "Townhouses", HOUSE_AND_LOT: "Houses and lots", LOT_ONLY: "Lots",
    COMMERCIAL: "Commercial properties", AGRICULTURAL: "Agricultural land", WAREHOUSE: "Warehouses",
  },
  areaUnit: "sqm",
  defaultRentPeriod: "MONTHLY",
  ownershipBadge: "Open to foreign buyers",
  ownershipFilter: {
    title: "Only condos open to foreign buyers",
    body: "Units the agent confirms are within the building's 40% foreign-ownership quota.",
  },
  saleSteps: [1_000_000, 2_000_000, 3_000_000, 5_000_000, 10_000_000, 20_000_000, 50_000_000, 100_000_000],
  rentSteps: [10_000, 15_000, 25_000, 40_000, 60_000, 100_000, 200_000],
  locationPlaceholder: "City, barangay, district or project",
  hasViber: true,
  privacyLaw: "the Data Privacy Act of 2012",
};

const AE: Market = {
  code: "AE",
  name: "UAE",
  inName: "in the UAE",
  currency: "AED",
  locale: "en-AE",
  home: "/uae",
  search: "/uae/search",
  calculator: "/uae/calculator",
  listingTypes: ["SALE", "RENT", "PRE_SELLING"],
  listingTypeLabel: { SALE: "For sale", RENT: "For rent", PRE_SELLING: "Off-plan", FORECLOSED: "Bank auction" },
  tabLabel: { SALE: "Buy", RENT: "Rent", PRE_SELLING: "Off-plan", FORECLOSED: "Auction" },
  propertyTypes: ["CONDOMINIUM", "TOWNHOUSE", "HOUSE_AND_LOT", "LOT_ONLY", "COMMERCIAL", "WAREHOUSE"],
  propertyTypeLabel: {
    CONDOMINIUM: "Apartment", TOWNHOUSE: "Townhouse", HOUSE_AND_LOT: "Villa", LOT_ONLY: "Land",
    COMMERCIAL: "Commercial", AGRICULTURAL: "Farm", WAREHOUSE: "Warehouse",
  },
  propertyTypeNoun: {
    CONDOMINIUM: "Apartments", TOWNHOUSE: "Townhouses", HOUSE_AND_LOT: "Villas", LOT_ONLY: "Plots",
    COMMERCIAL: "Commercial properties", AGRICULTURAL: "Farms", WAREHOUSE: "Warehouses",
  },
  areaUnit: "sqft",
  defaultRentPeriod: "YEARLY",
  ownershipBadge: "Freehold",
  ownershipFilter: {
    title: "Only freehold for all nationalities",
    body: "Properties in areas where foreigners can buy outright, as declared by the agent.",
  },
  saleSteps: [500_000, 1_000_000, 1_500_000, 2_000_000, 3_000_000, 5_000_000, 10_000_000, 20_000_000],
  rentSteps: [40_000, 60_000, 80_000, 100_000, 150_000, 250_000, 500_000],
  locationPlaceholder: "Emirate, community or building",
  hasViber: false,
  privacyLaw: "the UAE Personal Data Protection Law (Federal Decree-Law No. 45 of 2021)",
};

export const MARKETS: Record<CountryCode, Market> = { PH, AE };

export const marketOf = (code: CountryCode | undefined | null): Market => MARKETS[code ?? "PH"] ?? PH;

/** The market a path belongs to, when the path says so (/uae/...). */
export function marketFromPath(path: string): CountryCode | null {
  if (path === "/uae" || path.startsWith("/uae/")) return "AE";
  if (path === "/" || path.startsWith("/search") || path.startsWith("/calculator")) return "PH";
  return null;
}
