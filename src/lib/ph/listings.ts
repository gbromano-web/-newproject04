// Sample listings and agents, shaped like the Prisma models in
// prisma/schema.prisma (Property, Agent, Agency). Replaced by database queries
// once Supabase is connected. All people, numbers and agencies are fictional;
// phone numbers use an obviously-demo 0000 block.

import type { ListingImage } from "./photos";

export type ListingType = "SALE" | "RENT" | "PRE_SELLING" | "FORECLOSED";
export type PropertyType = "CONDOMINIUM" | "TOWNHOUSE" | "HOUSE_AND_LOT" | "LOT_ONLY" | "COMMERCIAL" | "AGRICULTURAL" | "WAREHOUSE";
export type TitleType = "TCT" | "CCT" | "CONTRACT_TO_SELL";

export interface PhAgent {
  id: string;
  name: string;
  initials: string;
  licenseType: "REAL_ESTATE_BROKER" | "REAL_ESTATE_SALESPERSON";
  license: string; // "PRC 0031874" or "DHSUD 2025-11823"
  verified: boolean;
  agency: string;
  mobile: string; // E.164
  viber: string; // E.164
  whatsapp: string; // digits only, for wa.me
  languages: string[];
  replyTime: string;
}

export interface NearbyPlace {
  name: string;
  kind: "school" | "hospital" | "mall" | "transit" | "airport" | "beach" | "park" | "church";
  km: number;
}

export interface PhListing {
  id: string;
  slug: string;
  title: string;
  description: string;
  listingType: ListingType;
  propertyType: PropertyType;
  price: number;
  rentPeriod?: "MONTHLY" | "YEARLY" | "DAILY";
  floorAreaSqm?: number;
  lotAreaSqm?: number;
  bedrooms?: number;
  bathrooms?: number;
  parking?: number;
  furnishing?: "Fully furnished" | "Semi-furnished" | "Unfurnished" | "Bare";
  titleType?: TitleType;
  locationLabel: string; // Location.displayName
  city: string;
  province: string;
  lat: number;
  lng: number;
  photos: ListingImage[];
  amenities: string[];
  nearby: NearbyPlace[];
  foreignBuyerEligible?: boolean; // condos within the 40% foreign-ownership cap (agent-declared)
  // Pre-selling
  turnoverQuarter?: number;
  turnoverYear?: number;
  reservationFee?: number;
  downpaymentPercent?: number;
  downpaymentMonths?: number;
  // Foreclosed
  foreclosingInstitution?: string;
  minimumBid?: number;
  occupancy?: "Vacant" | "Occupied" | "Unknown";
  agentId: string;
  /** Filled in by the data layer so pages never look agents up separately */
  agent?: PhAgent;
  featured?: boolean;
  listedAt: string;
}

export const AGENTS: PhAgent[] = [
  { id: "a1", name: "Andrea Villanueva", initials: "AV", licenseType: "REAL_ESTATE_BROKER", license: "PRC 0031874", verified: true, agency: "Bayview Realty Partners", mobile: "+639170000101", viber: "+639170000101", whatsapp: "639170000101", languages: ["English", "Filipino", "Mandarin"], replyTime: "Usually replies within 1 hour" },
  { id: "a2", name: "Paolo Reyes", initials: "PR", licenseType: "REAL_ESTATE_BROKER", license: "PRC 0028115", verified: true, agency: "Metro Prime Properties", mobile: "+639170000102", viber: "+639170000102", whatsapp: "639170000102", languages: ["English", "Filipino", "Japanese"], replyTime: "Usually replies within 30 minutes" },
  { id: "a3", name: "Kristine Dela Cruz", initials: "KD", licenseType: "REAL_ESTATE_SALESPERSON", license: "DHSUD 2025-11823", verified: true, agency: "Metro Prime Properties", mobile: "+639170000103", viber: "+639170000103", whatsapp: "639170000103", languages: ["English", "Filipino", "Korean"], replyTime: "Usually replies within 2 hours" },
  { id: "a4", name: "Mark Santos", initials: "MS", licenseType: "REAL_ESTATE_BROKER", license: "PRC 0040562", verified: false, agency: "Southridge Homes", mobile: "+639170000104", viber: "+639170000104", whatsapp: "639170000104", languages: ["English", "Filipino"], replyTime: "Usually replies within a day" },
  { id: "a5", name: "Jose Lim", initials: "JL", licenseType: "REAL_ESTATE_SALESPERSON", license: "DHSUD 2024-07714", verified: true, agency: "Visayas Island Realty", mobile: "+639170000105", viber: "+639170000105", whatsapp: "639170000105", languages: ["English", "Cebuano", "Filipino", "Hokkien"], replyTime: "Usually replies within 1 hour" },
];

const NEAR_BGC: NearbyPlace[] = [
  { name: "Bonifacio High Street", kind: "mall", km: 0.6 },
  { name: "St. Luke's Medical Center, Global City", kind: "hospital", km: 1.1 },
  { name: "International School Manila", kind: "school", km: 1.9 },
  { name: "BGC Bus, Market! Market! terminal", kind: "transit", km: 1.4 },
];
const NEAR_MAKATI: NearbyPlace[] = [
  { name: "Greenbelt and Glorietta", kind: "mall", km: 0.7 },
  { name: "Makati Medical Center", kind: "hospital", km: 1.2 },
  { name: "Ayala MRT-3 Station", kind: "transit", km: 1.0 },
  { name: "Ninoy Aquino International Airport", kind: "airport", km: 7.5 },
];
const NEAR_ORTIGAS: NearbyPlace[] = [
  { name: "SM Megamall", kind: "mall", km: 0.5 },
  { name: "The Medical City", kind: "hospital", km: 1.6 },
  { name: "Ortigas MRT-3 Station", kind: "transit", km: 0.8 },
  { name: "Asian Development Bank", kind: "park", km: 0.9 },
];
const NEAR_SOUTH: NearbyPlace[] = [
  { name: "Ayala Malls Solenad", kind: "mall", km: 1.5 },
  { name: "Xavier School Nuvali", kind: "school", km: 2.2 },
  { name: "The Medical City South Luzon", kind: "hospital", km: 6.0 },
  { name: "South Luzon Expressway exit", kind: "transit", km: 4.5 },
];
const NEAR_CEBU: NearbyPlace[] = [
  { name: "Ayala Center Cebu", kind: "mall", km: 2.1 },
  { name: "Chong Hua Hospital", kind: "hospital", km: 3.0 },
  { name: "University of San Carlos, Talamban", kind: "school", km: 3.5 },
  { name: "Mactan-Cebu International Airport", kind: "airport", km: 12.0 },
];

const L: PhListing[] = [
  {
    id: "ph1", slug: "furnished-1br-burgos-circle-bgc", title: "Furnished 1BR with Burgos Circle view",
    description: "Corner one-bedroom on a high floor overlooking Burgos Circle, fully furnished and ready to move in. Floor-to-ceiling windows, a separate kitchen and a parking slot. Walking distance to High Street, offices and international schools. Minimum one-year lease, one month advance and two months deposit.",
    listingType: "RENT", propertyType: "CONDOMINIUM", price: 45_000, rentPeriod: "MONTHLY",
    floorAreaSqm: 52, bedrooms: 1, bathrooms: 1, parking: 1, furnishing: "Fully furnished",
    locationLabel: "Bonifacio Global City, Taguig", city: "Taguig", province: "Metro Manila", lat: 14.5509, lng: 121.0509,
    photos: ["condoLiving", "bedroomWhite", "kitchenLiving"],
    amenities: ["Swimming pool", "Gym", "24/7 security", "Concierge", "Function room", "Backup generator", "Fiber internet-ready"],
    nearby: NEAR_BGC, agentId: "a1", featured: true, listedAt: "2026-10-24",
  },
  {
    id: "ph2", slug: "preselling-2br-corner-makati-cbd", title: "2BR corner unit, high floor",
    description: "Pre-selling two-bedroom corner unit in a new residential tower in the Makati CBD, with views toward Ayala Avenue. A 20% downpayment spread over 36 months after reservation, with the balance due on turnover through bank or Pag-IBIG financing. Within the building's foreign-ownership quota.",
    listingType: "PRE_SELLING", propertyType: "CONDOMINIUM", price: 18_600_000,
    floorAreaSqm: 78, bedrooms: 2, bathrooms: 2, parking: 1, furnishing: "Bare", titleType: "CONTRACT_TO_SELL",
    locationLabel: "Makati CBD, Makati", city: "Makati", province: "Metro Manila", lat: 14.5547, lng: 121.0244,
    photos: ["condoTower", "condoLounge", "bedroomDesk"],
    amenities: ["Infinity pool", "Gym", "Sky lounge", "24/7 security", "Backup generator", "EV charging"],
    nearby: NEAR_MAKATI, foreignBuyerEligible: true,
    turnoverQuarter: 4, turnoverYear: 2029, reservationFee: 50_000, downpaymentPercent: 20, downpaymentMonths: 36,
    agentId: "a2", featured: true, listedAt: "2026-10-22",
  },
  {
    id: "ph3", slug: "4br-house-and-lot-nuvali", title: "4BR house and lot near the lakeside park",
    description: "Modern two-storey home on a corner lot in a gated Nuvali village, a few minutes from the lakeside park and Solenad. Open-plan living and dining that opens to a garden pool, a maid's room, and a two-car garage. Clean TCT, ready for bank or Pag-IBIG financing.",
    listingType: "SALE", propertyType: "HOUSE_AND_LOT", price: 12_500_000,
    floorAreaSqm: 180, lotAreaSqm: 150, bedrooms: 4, bathrooms: 3, parking: 2, furnishing: "Semi-furnished", titleType: "TCT",
    locationLabel: "Nuvali, Santa Rosa", city: "Santa Rosa", province: "Laguna", lat: 14.241, lng: 121.056,
    photos: ["housePool", "houseGarden", "kitchenLiving"],
    amenities: ["Private pool", "Garden", "Maid's room", "Gated community", "Clubhouse", "Jogging path"],
    nearby: NEAR_SOUTH, agentId: "a3", listedAt: "2026-10-19",
  },
  {
    id: "ph4", slug: "foreclosed-townhouse-imus-cavite", title: "Foreclosed 2-storey townhouse, inner unit",
    description: "Pag-IBIG acquired asset sold through negotiated sale, as-is-where-is. Three bedrooms over two floors in an established Imus subdivision close to schools and the Aguinaldo Highway. Occupancy status should be confirmed on site before bidding.",
    listingType: "FORECLOSED", propertyType: "TOWNHOUSE", price: 2_150_000,
    floorAreaSqm: 64, lotAreaSqm: 45, bedrooms: 3, bathrooms: 1, parking: 0, furnishing: "Unfurnished", titleType: "TCT",
    locationLabel: "Imus, Cavite", city: "Imus", province: "Cavite", lat: 14.4297, lng: 120.9367,
    photos: ["townhouses"],
    amenities: ["Gated community", "Playground", "Basketball court"],
    nearby: [
      { name: "District Imus mall", kind: "mall", km: 2.4 },
      { name: "Imus Doctors Hospital", kind: "hospital", km: 3.1 },
      { name: "Cavite Expressway entry", kind: "transit", km: 5.0 },
    ],
    foreclosingInstitution: "Pag-IBIG Fund", minimumBid: 2_150_000, occupancy: "Unknown",
    agentId: "a4", listedAt: "2026-10-17",
  },
  {
    id: "ph5", slug: "ridge-view-lot-tagaytay", title: "Ridge-view residential lot",
    description: "Elevated 300 sqm residential lot with an open view toward Taal Lake, inside a gated community off the Tagaytay ridge. Cool climate, paved roads and underground utilities. Clean title, ideal for a weekend home.",
    listingType: "SALE", propertyType: "LOT_ONLY", price: 4_800_000,
    lotAreaSqm: 300, titleType: "TCT",
    locationLabel: "Tagaytay, Cavite", city: "Tagaytay", province: "Cavite", lat: 14.1153, lng: 120.9621,
    photos: ["taalView"],
    amenities: ["Gated community", "Clubhouse", "Underground utilities", "Lake view"],
    nearby: [
      { name: "Sky Ranch Tagaytay", kind: "park", km: 3.2 },
      { name: "Tagaytay Medical Center", kind: "hospital", km: 4.0 },
      { name: "Our Lady of Lourdes Parish", kind: "church", km: 2.5 },
    ],
    agentId: "a1", listedAt: "2026-10-21",
  },
  {
    id: "ph6", slug: "studio-cebu-it-park", title: "Studio walking distance to IT Park",
    description: "Semi-furnished studio with a balcony in a mid-rise beside Cebu IT Park. Includes air-conditioning, a bed and a kitchenette. Popular with professionals working in the park. Six-month minimum.",
    listingType: "RENT", propertyType: "CONDOMINIUM", price: 22_000, rentPeriod: "MONTHLY",
    floorAreaSqm: 26, bedrooms: 0, bathrooms: 1, parking: 0, furnishing: "Semi-furnished",
    locationLabel: "Cebu IT Park, Cebu City", city: "Cebu City", province: "Cebu", lat: 10.3297, lng: 123.9054,
    photos: ["condoLounge", "bedroomDesk"],
    amenities: ["Swimming pool", "Gym", "24/7 security", "Fiber internet-ready"],
    nearby: NEAR_CEBU, agentId: "a5", listedAt: "2026-10-25",
  },
  {
    id: "ph7", slug: "3br-rockwell-makati", title: "3BR family residence in Rockwell",
    description: "Generous three-bedroom unit in a landmark Rockwell tower with a private lift lobby, a family room and two parking slots. Quiet, walkable estate beside Power Plant Mall. Within the building's foreign-ownership quota.",
    listingType: "SALE", propertyType: "CONDOMINIUM", price: 42_500_000,
    floorAreaSqm: 168, bedrooms: 3, bathrooms: 3, parking: 2, furnishing: "Semi-furnished", titleType: "CCT",
    locationLabel: "Rockwell Center, Makati", city: "Makati", province: "Metro Manila", lat: 14.5649, lng: 121.0367,
    photos: ["condoLiving", "kitchenLiving", "bedroomWhite"],
    amenities: ["Lap pool", "Gym", "Private lift lobby", "Concierge", "24/7 security", "Backup generator"],
    nearby: [
      { name: "Power Plant Mall", kind: "mall", km: 0.3 },
      { name: "Makati Medical Center", kind: "hospital", km: 2.4 },
      { name: "Ateneo Professional Schools", kind: "school", km: 0.4 },
      { name: "Guadalupe MRT-3 Station", kind: "transit", km: 1.6 },
    ],
    foreignBuyerEligible: true, agentId: "a2", featured: true, listedAt: "2026-10-20",
  },
  {
    id: "ph8", slug: "1br-ortigas-center-rent", title: "Bright 1BR near SM Megamall",
    description: "Newly renovated one-bedroom with a full kitchen and a work nook, steps from SM Megamall and the Ortigas MRT station. Water and association dues included in the rent.",
    listingType: "RENT", propertyType: "CONDOMINIUM", price: 28_000, rentPeriod: "MONTHLY",
    floorAreaSqm: 35, bedrooms: 1, bathrooms: 1, parking: 0, furnishing: "Fully furnished",
    locationLabel: "Ortigas Center, Pasig", city: "Pasig", province: "Metro Manila", lat: 14.5869, lng: 121.0614,
    photos: ["kitchenLiving", "bedroomDesk"],
    amenities: ["Swimming pool", "Gym", "24/7 security", "Fiber internet-ready"],
    nearby: NEAR_ORTIGAS, agentId: "a3", listedAt: "2026-10-23",
  },
  {
    id: "ph9", slug: "beachfront-lot-el-nido", title: "Beachfront lot with direct sea access",
    description: "Titled 2,400 sqm beachfront lot on a quiet cove north of El Nido town, with about 40 metres of sand frontage and a view of the limestone islands. Road access and power nearby. Suited to a private villa or a boutique resort.",
    listingType: "SALE", propertyType: "LOT_ONLY", price: 38_000_000,
    lotAreaSqm: 2400, titleType: "TCT",
    locationLabel: "El Nido, Palawan", city: "El Nido", province: "Palawan", lat: 11.1956, lng: 119.4075,
    photos: ["elNido", "elNidoLagoon"],
    amenities: ["Beach frontage", "Road access", "Power nearby", "Sea view"],
    nearby: [
      { name: "El Nido town proper", kind: "mall", km: 6.0 },
      { name: "Lio Airport", kind: "airport", km: 4.5 },
      { name: "Nacpan Beach", kind: "beach", km: 9.0 },
    ],
    agentId: "a5", featured: true, listedAt: "2026-10-18",
  },
  {
    id: "ph10", slug: "4br-villa-panglao-bohol", title: "4BR garden villa near Alona Beach",
    description: "Contemporary villa on a 420 sqm lot, ten minutes from Alona Beach and Panglao International Airport. Four en-suite bedrooms, a pool deck and a covered lanai. Ideal as a retirement home or a vacation rental.",
    listingType: "SALE", propertyType: "HOUSE_AND_LOT", price: 24_800_000,
    floorAreaSqm: 260, lotAreaSqm: 420, bedrooms: 4, bathrooms: 4, parking: 2, furnishing: "Fully furnished", titleType: "TCT",
    locationLabel: "Panglao, Bohol", city: "Panglao", province: "Bohol", lat: 9.579, lng: 123.744,
    photos: ["houseGarden", "housePool"],
    amenities: ["Private pool", "Garden", "Lanai", "Solar panels", "Water reservoir"],
    nearby: [
      { name: "Alona Beach", kind: "beach", km: 3.0 },
      { name: "Bohol-Panglao International Airport", kind: "airport", km: 4.0 },
      { name: "Panglao Church", kind: "church", km: 5.5 },
    ],
    agentId: "a5", listedAt: "2026-10-16",
  },
  {
    id: "ph11", slug: "preselling-1br-clark", title: "1BR in a new Clark residential tower",
    description: "Pre-selling one-bedroom in Clark, close to the international airport and New Clark City links. Low monthly downpayment over 30 months, with the balance on turnover. Within the building's foreign-ownership quota.",
    listingType: "PRE_SELLING", propertyType: "CONDOMINIUM", price: 6_900_000,
    floorAreaSqm: 42, bedrooms: 1, bathrooms: 1, parking: 0, furnishing: "Bare", titleType: "CONTRACT_TO_SELL",
    locationLabel: "Clark Freeport Zone, Mabalacat", city: "Mabalacat", province: "Pampanga", lat: 15.186, lng: 120.547,
    photos: ["condoTower", "bedroomWhite"],
    amenities: ["Swimming pool", "Gym", "Co-working lounge", "24/7 security"],
    nearby: [
      { name: "Clark International Airport", kind: "airport", km: 3.5 },
      { name: "SM City Clark", kind: "mall", km: 4.2 },
      { name: "The Medical City Clark", kind: "hospital", km: 2.8 },
    ],
    foreignBuyerEligible: true, turnoverQuarter: 2, turnoverYear: 2028, reservationFee: 25_000, downpaymentPercent: 15, downpaymentMonths: 30,
    agentId: "a2", listedAt: "2026-10-15",
  },
  {
    id: "ph12", slug: "5br-house-ayala-alabang", title: "5BR modern home in a gated village",
    description: "Architect-designed five-bedroom home on a 600 sqm lot in an exclusive Alabang village. Double-height living room, a chef's kitchen, a pool and a guest suite on the ground floor. Clean TCT.",
    listingType: "SALE", propertyType: "HOUSE_AND_LOT", price: 68_000_000,
    floorAreaSqm: 520, lotAreaSqm: 600, bedrooms: 5, bathrooms: 5, parking: 4, furnishing: "Semi-furnished", titleType: "TCT",
    locationLabel: "Alabang, Muntinlupa", city: "Muntinlupa", province: "Metro Manila", lat: 14.4195, lng: 121.042,
    photos: ["houseGarden", "kitchenLiving", "housePool"],
    amenities: ["Private pool", "Garden", "Maid's room", "Gated community", "Solar panels", "Backup generator"],
    nearby: [
      { name: "Alabang Town Center", kind: "mall", km: 1.8 },
      { name: "Asian Hospital and Medical Center", kind: "hospital", km: 3.0 },
      { name: "De La Salle Santiago Zobel School", kind: "school", km: 1.5 },
    ],
    agentId: "a3", listedAt: "2026-10-12",
  },
  {
    id: "ph13", slug: "3br-house-rent-baguio", title: "3BR pine-view house for lease",
    description: "Cosy three-bedroom house among the pines, ten minutes from Session Road. Fireplace, a garden and a two-car carport. Available for long-term lease, furnished.",
    listingType: "RENT", propertyType: "HOUSE_AND_LOT", price: 55_000, rentPeriod: "MONTHLY",
    floorAreaSqm: 150, lotAreaSqm: 200, bedrooms: 3, bathrooms: 2, parking: 2, furnishing: "Fully furnished",
    locationLabel: "Baguio, Benguet", city: "Baguio", province: "Benguet", lat: 16.4023, lng: 120.596,
    photos: ["houseGarden", "bedroomWhite"],
    amenities: ["Garden", "Fireplace", "Carport", "Water reservoir"],
    nearby: [
      { name: "Session Road", kind: "mall", km: 2.5 },
      { name: "Baguio General Hospital", kind: "hospital", km: 3.0 },
      { name: "Burnham Park", kind: "park", km: 2.8 },
    ],
    agentId: "a1", listedAt: "2026-10-14",
  },
];

export const LISTINGS = L;

export const getAgent = (id: string) => AGENTS.find((a) => a.id === id)!;
/** The listing's agent: embedded by the data layer, or looked up among the samples. */
export const agentOf = (l: PhListing): PhAgent => l.agent ?? getAgent(l.agentId);

/** Homepage "New on Go Search Property": newest six */
export const latestListings = (n = 6) => [...L].sort((a, b) => b.listedAt.localeCompare(a.listedAt)).slice(0, n);

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

export const TITLE_TYPE_LABEL: Record<TitleType, string> = {
  TCT: "Transfer Certificate of Title (TCT)",
  CCT: "Condominium Certificate of Title (CCT)",
  CONTRACT_TO_SELL: "Contract to Sell (title on turnover)",
};
