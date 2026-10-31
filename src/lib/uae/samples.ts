// Sample UAE listings and brokers for the client preview (sample mode only).
// All people, broker numbers, permit numbers and agencies are fictional;
// phone numbers use an obviously-demo 0000 block. Photos are generic
// interiors and exteriors, not the actual properties.

import type { NearbyPlace, PhAgent, PhListing } from "../ph/listings";

export const UAE_AGENTS: PhAgent[] = [
  { id: "u1", name: "Layla Haddad", initials: "LH", licenseType: "UAE_BROKER", license: "RERA BRN 00000", office: "RERA ORN 00000", verified: true, agency: "Marina Crest Real Estate", mobile: "+971500000101", viber: "+971500000101", whatsapp: "971500000101", languages: ["English", "Arabic", "French"], replyTime: "Usually replies within 1 hour" },
  { id: "u2", name: "Rohan Mehta", initials: "RM", licenseType: "UAE_BROKER", license: "ADREC 00000", office: "ADREC office 00000", verified: true, agency: "Capital Shores Properties", mobile: "+971500000102", viber: "+971500000102", whatsapp: "971500000102", languages: ["English", "Hindi", "Arabic"], replyTime: "Usually replies within 30 minutes" },
  { id: "u3", name: "Maricel Santos", initials: "MS", licenseType: "UAE_BROKER", license: "RAK RERA 00001", office: "RAK RERA office 00001", verified: true, agency: "Northern Emirates Homes", mobile: "+971500000103", viber: "+971500000103", whatsapp: "971500000103", languages: ["English", "Filipino", "Arabic"], replyTime: "Usually replies within 2 hours" },
];

const NEAR_MARINA: NearbyPlace[] = [
  { name: "Dubai Marina Mall", kind: "mall", km: 0.5 },
  { name: "DMCC Metro Station", kind: "transit", km: 1.2 },
  { name: "JBR Beach", kind: "beach", km: 0.9 },
  { name: "Mediclinic Dubai Mall", kind: "hospital", km: 22 },
];
const NEAR_DOWNTOWN: NearbyPlace[] = [
  { name: "The Dubai Mall", kind: "mall", km: 0.6 },
  { name: "Burj Khalifa/Dubai Mall Metro Station", kind: "transit", km: 0.9 },
  { name: "Dubai International Airport", kind: "airport", km: 13 },
];
const NEAR_REEM: NearbyPlace[] = [
  { name: "The Galleria Al Maryah Island", kind: "mall", km: 1.8 },
  { name: "Cleveland Clinic Abu Dhabi", kind: "hospital", km: 2.5 },
  { name: "Zayed International Airport", kind: "airport", km: 30 },
];

export const UAE_LISTINGS: PhListing[] = [
  {
    id: "ae1", country: "AE", slug: "2br-marina-view-apartment-dubai-marina", title: "2BR marina-view apartment",
    description: "Bright two-bedroom apartment on a high floor with full marina views, a balcony and a fitted kitchen. Walk to the tram, JBR beach and Marina Walk. Vacant on transfer.",
    listingType: "SALE", propertyType: "CONDOMINIUM", price: 2_450_000,
    floorAreaSqm: 116, bedrooms: 2, bathrooms: 3, parking: 1, furnishing: "Unfurnished",
    locationLabel: "Dubai Marina, Dubai", city: "Dubai Marina", province: "Dubai", lat: 25.0805, lng: 55.1403,
    photos: ["condoLiving", "bedroomWhite", "kitchenLiving"], amenities: ["Swimming pool", "Gym", "Balcony", "24-hour security", "Covered parking"],
    nearby: NEAR_MARINA, foreignBuyerEligible: true, adPermit: "0000000001", adPermitLabel: "DLD Trakheesi permit",
    agentId: "u1", featured: true, listedAt: "2026-10-27",
  },
  {
    id: "ae2", country: "AE", slug: "1br-furnished-rent-downtown-dubai", title: "Furnished 1BR near Dubai Mall",
    description: "Fully furnished one-bedroom apartment with Burj Khalifa views, two minutes' walk to Dubai Mall. Chiller included. Yearly lease, payable in up to four cheques.",
    listingType: "RENT", propertyType: "CONDOMINIUM", price: 135_000, rentPeriod: "YEARLY", rentCheques: 4,
    floorAreaSqm: 74, bedrooms: 1, bathrooms: 2, parking: 1, furnishing: "Fully furnished",
    locationLabel: "Downtown Dubai, Dubai", city: "Downtown Dubai", province: "Dubai", lat: 25.1972, lng: 55.2744,
    photos: ["condoLounge", "bedroomDesk", "kitchenLiving"], amenities: ["Chiller included", "Swimming pool", "Gym", "Concierge"],
    nearby: NEAR_DOWNTOWN, adPermit: "0000000002", adPermitLabel: "DLD Trakheesi permit",
    agentId: "u1", listedAt: "2026-10-25",
  },
  {
    id: "ae3", country: "AE", slug: "4br-villa-dubai-hills-estate", title: "4BR family villa with garden",
    description: "Four-bedroom villa on a quiet street, with a private garden, maid's room and a two-car driveway. Close to Dubai Hills Mall, schools and the park.",
    listingType: "SALE", propertyType: "HOUSE_AND_LOT", price: 7_900_000,
    floorAreaSqm: 330, lotAreaSqm: 520, bedrooms: 4, bathrooms: 5, parking: 2, furnishing: "Unfurnished",
    locationLabel: "Dubai Hills Estate, Dubai", city: "Dubai Hills Estate", province: "Dubai", lat: 25.112, lng: 55.245,
    photos: ["housePool", "houseGarden", "kitchenLiving"], amenities: ["Private garden", "Maid's room", "Community pool", "Park access"],
    nearby: [{ name: "Dubai Hills Mall", kind: "mall", km: 1.4 }, { name: "King's College Hospital Dubai", kind: "hospital", km: 2.0 }, { name: "Dubai Hills Park", kind: "park", km: 0.8 }],
    foreignBuyerEligible: true, adPermit: "0000000003", adPermitLabel: "DLD Trakheesi permit",
    agentId: "u1", listedAt: "2026-10-22",
  },
  {
    id: "ae4", country: "AE", slug: "offplan-2br-saadiyat-island", title: "Off-plan 2BR by the beach",
    description: "Two-bedroom apartment in a new beachfront development on Saadiyat Island. Payment plan with 10% on booking and the balance in instalments to handover.",
    listingType: "PRE_SELLING", propertyType: "CONDOMINIUM", price: 3_100_000,
    floorAreaSqm: 128, bedrooms: 2, bathrooms: 3, parking: 1,
    locationLabel: "Saadiyat Island, Abu Dhabi", city: "Saadiyat Island", province: "Abu Dhabi", lat: 24.542, lng: 54.433,
    photos: ["condoTower", "condoLounge", "bedroomWhite"], amenities: ["Beach access", "Infinity pool", "Gym", "Children's play area"],
    nearby: [{ name: "Louvre Abu Dhabi", kind: "park", km: 3.5 }, { name: "Saadiyat Beach", kind: "beach", km: 0.3 }, { name: "Zayed International Airport", kind: "airport", km: 35 }],
    foreignBuyerEligible: true, turnoverQuarter: 4, turnoverYear: 2028, reservationFee: 310_000, downpaymentPercent: 40, downpaymentMonths: 24,
    adPermit: "0000000004", adPermitLabel: "ADREC Madhmoun permit",
    agentId: "u2", featured: true, listedAt: "2026-10-26",
  },
  {
    id: "ae5", country: "AE", slug: "studio-rent-al-reem-island", title: "Studio with sea view",
    description: "Well-kept studio on Al Reem Island with a sea view, a fitted kitchen and building pool. Yearly lease in up to two cheques.",
    listingType: "RENT", propertyType: "CONDOMINIUM", price: 55_000, rentPeriod: "YEARLY", rentCheques: 2,
    floorAreaSqm: 45, bedrooms: 0, bathrooms: 1, parking: 1, furnishing: "Semi-furnished",
    locationLabel: "Al Reem Island, Abu Dhabi", city: "Al Reem Island", province: "Abu Dhabi", lat: 24.498, lng: 54.406,
    photos: ["bedroomDesk", "condoLiving"], amenities: ["Swimming pool", "Gym", "Covered parking"],
    nearby: NEAR_REEM, adPermit: "0000000005", adPermitLabel: "ADREC Madhmoun permit",
    agentId: "u2", listedAt: "2026-10-20",
  },
  {
    id: "ae6", country: "AE", slug: "3br-townhouse-al-hamra-village", title: "3BR townhouse by the golf course",
    description: "Three-bedroom townhouse in Al Hamra Village with golf course views, a private terrace and access to the beach club. Freehold for all nationalities.",
    listingType: "SALE", propertyType: "TOWNHOUSE", price: 2_200_000,
    floorAreaSqm: 210, lotAreaSqm: 250, bedrooms: 3, bathrooms: 4, parking: 2, furnishing: "Unfurnished",
    locationLabel: "Al Hamra Village, Ras Al Khaimah", city: "Al Hamra Village", province: "Ras Al Khaimah", lat: 25.693, lng: 55.782,
    photos: ["townhouses", "houseGarden", "kitchenLiving"], amenities: ["Golf course views", "Private terrace", "Beach club", "Community pool"],
    nearby: [{ name: "Al Hamra Mall", kind: "mall", km: 1.0 }, { name: "Al Hamra Beach", kind: "beach", km: 1.5 }, { name: "Ras Al Khaimah International Airport", kind: "airport", km: 30 }],
    foreignBuyerEligible: true, adPermit: "0000000006", adPermitLabel: "RAK RERA advertising permit",
    agentId: "u3", listedAt: "2026-10-18",
  },
];
