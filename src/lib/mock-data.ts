// Demo data only. In production these records come from PostgreSQL (see
// prisma/schema.prisma) and search results come from the Typesense index.
import type { Agency, Agent, Property } from "./types";

const img = (name: string) => `/images/listings/${name}.svg`;

export const agencies: Agency[] = [
  { id: "ag1", name: "Creekside Properties", shortName: "CP", color: "#0e4a52", verified: true, reraOrn: "ORN 21457" },
  { id: "ag2", name: "Palm & Partners Real Estate", shortName: "PP", color: "#8a5a2b", verified: true, reraOrn: "ORN 18820" },
  { id: "ag3", name: "Desert Rose Homes", shortName: "DR", color: "#6b3f63", verified: false, reraOrn: "ORN 30114" },
];

export const agents: Agent[] = [
  { id: "a1", name: "Layla Haddad", initials: "LH", title: "Senior Leasing Consultant", agencyId: "ag1", phone: "+971 50 123 4567", whatsapp: "971501234567", languages: ["English", "Arabic", "French"], brn: "BRN 48213", superAgent: true, activeListings: 42 },
  { id: "a2", name: "Omar Siddiqui", initials: "OS", title: "Sales Director", agencyId: "ag2", phone: "+971 55 987 6543", whatsapp: "971559876543", languages: ["English", "Urdu", "Hindi"], brn: "BRN 39105", superAgent: true, activeListings: 31 },
  { id: "a3", name: "Elena Petrova", initials: "EP", title: "Property Consultant", agencyId: "ag3", phone: "+971 52 222 8890", whatsapp: "971522228890", languages: ["English", "Russian"], brn: "BRN 51077", superAgent: false, activeListings: 18 },
  { id: "a4", name: "Karim Mansour", initials: "KM", title: "Villa Specialist", agencyId: "ag1", phone: "+971 56 410 7722", whatsapp: "971564107722", languages: ["English", "Arabic"], brn: "BRN 44690", superAgent: false, activeListings: 24 },
];

const nearbyMarina: Property["nearby"] = [
  { name: "DMCC Metro Station", kind: "metro", km: 0.6 },
  { name: "Dubai Marina Mall", kind: "mall", km: 0.9 },
  { name: "JBR Beach", kind: "beach", km: 1.2 },
  { name: "Emirates International School", kind: "school", km: 4.1 },
  { name: "Mediclinic Dubai Mall", kind: "hospital", km: 3.4 },
];
const nearbyDowntown: Property["nearby"] = [
  { name: "Burj Khalifa / Dubai Mall Metro", kind: "metro", km: 0.5 },
  { name: "The Dubai Mall", kind: "mall", km: 0.7 },
  { name: "Mediclinic Dubai Mall", kind: "hospital", km: 0.8 },
  { name: "Raffles International School", kind: "school", km: 5.2 },
];
const nearbySuburb: Property["nearby"] = [
  { name: "GEMS Wellington Academy", kind: "school", km: 1.8 },
  { name: "King's College Hospital", kind: "hospital", km: 3.9 },
  { name: "Dubai Hills Mall", kind: "mall", km: 4.5 },
  { name: "Equiti Metro Station", kind: "metro", km: 8.2 },
];

export const properties: Property[] = [
  {
    id: "p1", slug: "2-bed-marina-view-apartment-dubai-marina",
    title: "Full marina view 2-bed with study",
    description: "High-floor apartment facing the marina, with floor-to-ceiling windows, an enclosed kitchen and a separate study that works as a third bedroom. Chiller-free, vacant on transfer, and a short walk to the tram and DMCC metro.",
    purpose: "rent", type: "apartment", price: 185000, rentFrequency: "yearly",
    bedrooms: 2, bathrooms: 3, areaSqft: 1420, furnished: false,
    location: { city: "Dubai", community: "Dubai Marina", subCommunity: "Marina Promenade", lat: 25.0805, lng: 55.1403 },
    images: [img("tower-1"), img("interior-1"), img("interior-2"), img("tower-3")], floorPlan: img("floor-plan"),
    amenities: ["Balcony", "Central A/C", "Shared pool", "Covered parking", "Shared gym", "Security", "Study"],
    agentId: "a1", permitNumber: "7114562390", verified: true, featured: true, completion: "ready", listedAt: "2026-10-22",
    nearby: nearbyMarina,
  },
  {
    id: "p2", slug: "4-bed-villa-arabian-ranches-private-pool",
    title: "Upgraded 4-bed villa with private pool",
    description: "Single-row villa backing onto the park, with a landscaped garden, private pool and a maid's room with its own bathroom. The kitchen and bathrooms were renovated in 2025.",
    purpose: "buy", type: "villa", price: 6850000,
    bedrooms: 4, bathrooms: 5, areaSqft: 4210, furnished: false,
    location: { city: "Dubai", community: "Arabian Ranches", subCommunity: "Saheel", lat: 25.0526, lng: 55.2702 },
    images: [img("villa-1"), img("interior-3"), img("interior-4"), img("villa-2")], floorPlan: img("floor-plan"),
    amenities: ["Private pool", "Private garden", "Maid room", "Central A/C", "Covered parking", "Security", "Kids play area"],
    agentId: "a4", permitNumber: "7193345018", verified: true, featured: true, completion: "ready", listedAt: "2026-10-19",
    nearby: nearbySuburb,
  },
  {
    id: "p3", slug: "1-bed-burj-view-apartment-downtown-dubai",
    title: "Furnished 1-bed with Burj Khalifa view",
    description: "Fully furnished one-bedroom in a boulevard tower, with a balcony looking straight at the Burj Khalifa. Bills can be included on a monthly contract.",
    purpose: "rent", type: "apartment", price: 13500, rentFrequency: "monthly",
    bedrooms: 1, bathrooms: 2, areaSqft: 860, furnished: true,
    location: { city: "Dubai", community: "Downtown Dubai", subCommunity: "Boulevard Point", lat: 25.1972, lng: 55.2744 },
    images: [img("tower-2"), img("interior-2"), img("interior-1")], floorPlan: img("floor-plan"),
    amenities: ["Balcony", "Central A/C", "Shared pool", "Shared gym", "Concierge", "Covered parking"],
    agentId: "a1", permitNumber: "7120098411", verified: true, featured: false, completion: "ready", listedAt: "2026-10-24",
    nearby: nearbyDowntown,
  },
  {
    id: "p4", slug: "3-bed-townhouse-dubai-hills-estate",
    title: "Corner 3-bed townhouse near the park",
    description: "Corner-plot townhouse with a larger garden, three ensuite bedrooms and a maid's room. Walking distance to Dubai Hills Park and the community school.",
    purpose: "buy", type: "townhouse", price: 3950000,
    bedrooms: 3, bathrooms: 4, areaSqft: 2480, furnished: false,
    location: { city: "Dubai", community: "Dubai Hills Estate", subCommunity: "Maple", lat: 25.1033, lng: 55.244 },
    images: [img("townhouse-1"), img("interior-4"), img("interior-3")], floorPlan: img("floor-plan"),
    amenities: ["Private garden", "Maid room", "Central A/C", "Covered parking", "Shared pool", "Security"],
    agentId: "a2", permitNumber: "7166702245", verified: true, featured: true, completion: "ready", listedAt: "2026-10-15",
    nearby: nearbySuburb,
  },
  {
    id: "p5", slug: "studio-jumeirah-village-circle",
    title: "Bright studio with balcony in JVC",
    description: "Well-kept studio with a fitted kitchen and a large balcony. Four cheques accepted and available from November.",
    purpose: "rent", type: "apartment", price: 52000, rentFrequency: "yearly",
    bedrooms: 0, bathrooms: 1, areaSqft: 430, furnished: false,
    location: { city: "Dubai", community: "Jumeirah Village Circle", subCommunity: "District 12", lat: 25.0587, lng: 55.2066 },
    images: [img("tower-4"), img("interior-1")],
    amenities: ["Balcony", "Central A/C", "Shared pool", "Covered parking", "Shared gym"],
    agentId: "a3", permitNumber: "7108841127", verified: false, featured: false, completion: "ready", listedAt: "2026-10-25",
    nearby: nearbySuburb,
  },
  {
    id: "p6", slug: "5-bed-signature-villa-palm-jumeirah",
    title: "Beachfront 5-bed signature villa",
    description: "Frond villa with direct beach access, an infinity pool and skyline views across the water. Smart-home system throughout, with a separate staff wing.",
    purpose: "buy", type: "villa", price: 38500000,
    bedrooms: 5, bathrooms: 7, areaSqft: 7800, furnished: true,
    location: { city: "Dubai", community: "Palm Jumeirah", subCommunity: "Frond G", lat: 25.1124, lng: 55.139 },
    images: [img("villa-3"), img("interior-3"), img("interior-2"), img("villa-4")], floorPlan: img("floor-plan"),
    amenities: ["Private pool", "Private beach", "Maid room", "Central A/C", "Covered parking", "Security", "Smart home"],
    agentId: "a2", permitNumber: "7155019934", verified: true, featured: true, completion: "ready", listedAt: "2026-10-10",
    nearby: [
      { name: "Nakheel Mall", kind: "mall", km: 2.6 },
      { name: "Palm West Beach", kind: "beach", km: 0.1 },
      { name: "Kings' School Al Barsha", kind: "school", km: 8.4 },
      { name: "Mediclinic Parkview", kind: "hospital", km: 11.0 },
    ],
  },
  {
    id: "p7", slug: "2-bed-canal-view-business-bay",
    title: "Canal-view 2-bed, high floor",
    description: "Two-bedroom with an open kitchen and a long balcony over the Dubai Water Canal. Ideal for investors, with a strong short-let history.",
    purpose: "buy", type: "apartment", price: 2350000,
    bedrooms: 2, bathrooms: 2, areaSqft: 1190, furnished: true,
    location: { city: "Dubai", community: "Business Bay", subCommunity: "Executive Towers", lat: 25.185, lng: 55.265 },
    images: [img("tower-3"), img("interior-2")], floorPlan: img("floor-plan"),
    amenities: ["Balcony", "Central A/C", "Shared pool", "Shared gym", "Covered parking", "Security"],
    agentId: "a3", permitNumber: "7141107793", verified: true, featured: false, completion: "ready", listedAt: "2026-10-20",
    nearby: nearbyDowntown,
  },
  {
    id: "p8", slug: "3-bed-apartment-dubai-creek-harbour-off-plan",
    title: "Off-plan 3-bed with 60/40 payment plan",
    description: "Waterfront three-bedroom in a tower due for handover in Q4 2028. 60% paid during construction and 40% on handover.",
    purpose: "buy", type: "apartment", price: 3420000,
    bedrooms: 3, bathrooms: 4, areaSqft: 1720, furnished: false,
    location: { city: "Dubai", community: "Dubai Creek Harbour", subCommunity: "Creek Waters", lat: 25.201, lng: 55.346 },
    images: [img("tower-4"), img("interior-4")], floorPlan: img("floor-plan"),
    amenities: ["Balcony", "Central A/C", "Shared pool", "Shared gym", "Kids play area", "Security"],
    agentId: "a1", permitNumber: "7177734521", verified: true, featured: false, completion: "off-plan", listedAt: "2026-10-18",
    nearby: [
      { name: "Creek Metro Station (planned)", kind: "metro", km: 1.1 },
      { name: "Creek Marina Mall", kind: "mall", km: 0.4 },
      { name: "Aster Hospital", kind: "hospital", km: 6.0 },
    ],
  },
  {
    id: "p9", slug: "3-bed-townhouse-rent-damac-hills",
    title: "3-bed townhouse on the golf course",
    description: "Golf-facing townhouse with an open-plan ground floor and a terrace off the master bedroom. Pets allowed.",
    purpose: "rent", type: "townhouse", price: 165000, rentFrequency: "yearly",
    bedrooms: 3, bathrooms: 4, areaSqft: 2100, furnished: false,
    location: { city: "Dubai", community: "DAMAC Hills", subCommunity: "Golf Promenade", lat: 25.023, lng: 55.251 },
    images: [img("townhouse-2"), img("interior-3")],
    amenities: ["Private garden", "Maid room", "Central A/C", "Covered parking", "Pets allowed"],
    agentId: "a4", permitNumber: "7182209966", verified: true, featured: true, completion: "ready", listedAt: "2026-10-23",
    nearby: nearbySuburb,
  },
  {
    id: "p10", slug: "1-bed-jlt-lake-view",
    title: "Lake-view 1-bed next to the metro",
    description: "Renovated one-bedroom overlooking the lakes, two minutes from the DMCC metro. Upgraded flooring and kitchen.",
    purpose: "rent", type: "apartment", price: 88000, rentFrequency: "yearly",
    bedrooms: 1, bathrooms: 1, areaSqft: 780, furnished: false,
    location: { city: "Dubai", community: "Jumeirah Lake Towers", subCommunity: "Cluster D", lat: 25.0693, lng: 55.1442 },
    images: [img("tower-2"), img("interior-1")],
    amenities: ["Balcony", "Central A/C", "Shared pool", "Covered parking", "Security"],
    agentId: "a3", permitNumber: "7139914450", verified: false, featured: false, completion: "ready", listedAt: "2026-10-21",
    nearby: nearbyMarina,
  },
  {
    id: "p11", slug: "4-bed-penthouse-downtown-dubai",
    title: "Duplex penthouse with private terrace",
    description: "Four-bedroom duplex penthouse with a 1,600 sqft terrace, plunge pool and fountain views. Sold vacant.",
    purpose: "buy", type: "penthouse", price: 17900000,
    bedrooms: 4, bathrooms: 5, areaSqft: 5400, furnished: false,
    location: { city: "Dubai", community: "Downtown Dubai", subCommunity: "Opera District", lat: 25.1948, lng: 55.2712 },
    images: [img("tower-1"), img("interior-4"), img("interior-2")], floorPlan: img("floor-plan"),
    amenities: ["Private pool", "Balcony", "Maid room", "Central A/C", "Concierge", "Covered parking", "Security"],
    agentId: "a2", permitNumber: "7160055812", verified: true, featured: true, completion: "ready", listedAt: "2026-10-12",
    nearby: nearbyDowntown,
  },
  {
    id: "p12", slug: "2-bed-townhouse-town-square",
    title: "Family 2-bed townhouse by the park",
    description: "Affordable two-bedroom townhouse facing the central park, with a small garden and two parking spaces.",
    purpose: "rent", type: "townhouse", price: 98000, rentFrequency: "yearly",
    bedrooms: 2, bathrooms: 3, areaSqft: 1580, furnished: false,
    location: { city: "Dubai", community: "Town Square", subCommunity: "Hayat Townhouses", lat: 24.9935, lng: 55.29 },
    images: [img("townhouse-3"), img("interior-4")],
    amenities: ["Private garden", "Central A/C", "Covered parking", "Shared pool", "Kids play area"],
    agentId: "a4", permitNumber: "7101182234", verified: true, featured: false, completion: "ready", listedAt: "2026-10-17",
    nearby: nearbySuburb,
  },
];

export const communities = [
  { name: "Dubai Marina", city: "Dubai", image: img("tower-1") },
  { name: "Downtown Dubai", city: "Dubai", image: img("tower-2") },
  { name: "Dubai Hills Estate", city: "Dubai", image: img("townhouse-1") },
  { name: "Palm Jumeirah", city: "Dubai", image: img("villa-3") },
  { name: "Arabian Ranches", city: "Dubai", image: img("villa-1") },
  { name: "Jumeirah Village Circle", city: "Dubai", image: img("tower-4") },
];

/** Location suggestions for autocomplete: City > Community > Sub-community */
export const locationSuggestions = Array.from(
  new Map(
    properties.flatMap((p) => [
      [`${p.location.community}`, { label: p.location.community, parent: p.location.city, level: "Community" }],
      ...(p.location.subCommunity
        ? [[`${p.location.subCommunity}`, { label: p.location.subCommunity, parent: p.location.community, level: "Sub-community" }]]
        : []),
    ]) as [string, { label: string; parent: string; level: string }][],
  ).values(),
).concat([
  { label: "Dubai", parent: "UAE", level: "City" },
  { label: "Abu Dhabi", parent: "UAE", level: "City" },
  { label: "Sharjah", parent: "UAE", level: "City" },
]);

export const getAgent = (id: string) => agents.find((a) => a.id === id)!;
export const getAgency = (id: string) => agencies.find((a) => a.id === id)!;
export const getProperty = (slug: string) => properties.find((p) => p.slug === slug);

export function countInCommunity(name: string) {
  return properties.filter((p) => p.location.community === name).length;
}
