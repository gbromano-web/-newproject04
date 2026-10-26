export type Purpose = "rent" | "buy";
export type PropertyType = "apartment" | "villa" | "townhouse" | "penthouse";
export type RentFrequency = "yearly" | "monthly";

export interface Location {
  city: string;
  community: string;
  subCommunity?: string;
  lat: number;
  lng: number;
}

export interface Agency {
  id: string;
  name: string;
  shortName: string;
  color: string;
  verified: boolean;
  reraOrn: string;
}

export interface Agent {
  id: string;
  name: string;
  initials: string;
  title: string;
  agencyId: string;
  phone: string;
  whatsapp: string;
  languages: string[];
  brn: string;
  superAgent: boolean;
  activeListings: number;
}

export interface Property {
  id: string;
  slug: string;
  title: string;
  description: string;
  purpose: Purpose;
  type: PropertyType;
  price: number;
  rentFrequency?: RentFrequency;
  bedrooms: number; // 0 = studio
  bathrooms: number;
  areaSqft: number;
  furnished: boolean;
  location: Location;
  images: string[];
  floorPlan?: string;
  amenities: string[];
  agentId: string;
  permitNumber: string;
  verified: boolean;
  featured: boolean;
  completion: "ready" | "off-plan";
  listedAt: string;
  nearby: { name: string; kind: "school" | "hospital" | "metro" | "mall" | "beach"; km: number }[];
}
