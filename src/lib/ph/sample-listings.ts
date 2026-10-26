// Preview data shaped like the Prisma `Property` model (prisma/schema.prisma).
// Replaced by database queries once Supabase is connected.

export type ListingType = "SALE" | "RENT" | "PRE_SELLING" | "FORECLOSED";
export type PropertyType = "CONDOMINIUM" | "TOWNHOUSE" | "HOUSE_AND_LOT" | "LOT_ONLY" | "COMMERCIAL" | "AGRICULTURAL" | "WAREHOUSE";

export interface PhListing {
  id: string;
  title: string;
  listingType: ListingType;
  propertyType: PropertyType;
  price: number;
  rentPeriod?: "MONTHLY" | "YEARLY";
  floorAreaSqm?: number;
  lotAreaSqm?: number;
  bedrooms?: number;
  bathrooms?: number;
  furnishing?: string;
  locationLabel: string; // Location.displayName
  image: string;
  turnoverQuarter?: number;
  turnoverYear?: number;
  foreclosingInstitution?: string;
  agentVerified: boolean;
  agentName: string;
  agentLicense: string; // "PRC 0012345" or "DHSUD 2024-0815"
}

const img = (n: string) => `/images/listings/${n}.svg`;

export const PH_SAMPLE_LISTINGS: PhListing[] = [
  {
    id: "ph1", title: "Furnished 1BR with Burgos Circle view", listingType: "RENT", propertyType: "CONDOMINIUM",
    price: 45000, rentPeriod: "MONTHLY", floorAreaSqm: 52, bedrooms: 1, bathrooms: 1, furnishing: "Fully furnished",
    locationLabel: "Bonifacio Global City, Taguig", image: img("tower-1"),
    agentVerified: true, agentName: "Andrea Villanueva", agentLicense: "PRC 0031874",
  },
  {
    id: "ph2", title: "2BR corner unit, high floor", listingType: "PRE_SELLING", propertyType: "CONDOMINIUM",
    price: 18_600_000, floorAreaSqm: 78, bedrooms: 2, bathrooms: 2, turnoverQuarter: 4, turnoverYear: 2029,
    locationLabel: "Makati CBD, Makati", image: img("tower-3"),
    agentVerified: true, agentName: "Paolo Reyes", agentLicense: "PRC 0028115",
  },
  {
    id: "ph3", title: "4BR house and lot near the lakeside park", listingType: "SALE", propertyType: "HOUSE_AND_LOT",
    price: 12_500_000, floorAreaSqm: 180, lotAreaSqm: 150, bedrooms: 4, bathrooms: 3,
    locationLabel: "Nuvali, Santa Rosa", image: img("villa-2"),
    agentVerified: true, agentName: "Kristine Dela Cruz", agentLicense: "DHSUD 2025-11823",
  },
  {
    id: "ph4", title: "Foreclosed 2-storey townhouse, inner unit", listingType: "FORECLOSED", propertyType: "TOWNHOUSE",
    price: 2_150_000, floorAreaSqm: 64, lotAreaSqm: 45, bedrooms: 3, bathrooms: 1, foreclosingInstitution: "Pag-IBIG Fund",
    locationLabel: "Imus, Cavite", image: img("townhouse-2"),
    agentVerified: false, agentName: "Mark Santos", agentLicense: "PRC 0040562",
  },
  {
    id: "ph5", title: "Ridge-view residential lot", listingType: "SALE", propertyType: "LOT_ONLY",
    price: 4_800_000, lotAreaSqm: 300,
    locationLabel: "Tagaytay, Cavite", image: img("lot-1"),
    agentVerified: true, agentName: "Andrea Villanueva", agentLicense: "PRC 0031874",
  },
  {
    id: "ph6", title: "Studio walking distance to IT Park", listingType: "RENT", propertyType: "CONDOMINIUM",
    price: 22_000, rentPeriod: "MONTHLY", floorAreaSqm: 26, bedrooms: 0, bathrooms: 1, furnishing: "Semi-furnished",
    locationLabel: "Cebu IT Park, Cebu City", image: img("tower-4"),
    agentVerified: true, agentName: "Jose Lim", agentLicense: "DHSUD 2024-07714",
  },
];

export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  CONDOMINIUM: "Condominium",
  TOWNHOUSE: "Townhouse",
  HOUSE_AND_LOT: "House and Lot",
  LOT_ONLY: "Lot Only",
  COMMERCIAL: "Commercial",
  AGRICULTURAL: "Agricultural",
  WAREHOUSE: "Warehouse",
};

export const LISTING_TYPE_LABEL: Record<ListingType, string> = {
  SALE: "For sale",
  RENT: "For rent",
  PRE_SELLING: "Pre-selling",
  FORECLOSED: "Foreclosed",
};
