/**
 * Seeds reference data: locations, amenities and unsponsored hero backgrounds.
 *
 * Intentionally left empty:
 *   - Developer / Project: added only once a partnership is signed, because
 *     their names and logos appear in the promotional slider.
 *   - DEVELOPER_SLIDER banners: depend on the developers above.
 *   - FinancingProgram: Pag-IBIG and bank rates change; admins enter them from
 *     the published source (sourceUrl) instead of shipping stale numbers.
 *
 * Run: npx prisma db seed   (idempotent; safe to re-run)
 */
import { PrismaClient } from "@prisma/client";
import { allLocations } from "../src/lib/ph/locations";

type Category = "UNIT" | "BUILDING" | "COMMUNITY" | "SECURITY" | "UTILITIES";

export const AMENITIES: { key: string; label: string; category: Category; icon: string }[] = [
  { key: "balcony", label: "Balcony", category: "UNIT", icon: "fence" },
  { key: "maids-room", label: "Maid's room", category: "UNIT", icon: "bed-single" },
  { key: "aircon-ready", label: "Aircon-ready", category: "UNIT", icon: "air-vent" },
  { key: "fiber-ready", label: "Fiber internet-ready", category: "UNIT", icon: "wifi" },
  { key: "swimming-pool", label: "Swimming pool", category: "BUILDING", icon: "waves" },
  { key: "gym", label: "Gym", category: "BUILDING", icon: "dumbbell" },
  { key: "function-room", label: "Function room", category: "BUILDING", icon: "party-popper" },
  { key: "elevator", label: "Elevator", category: "BUILDING", icon: "arrow-up-down" },
  { key: "covered-parking", label: "Covered parking", category: "BUILDING", icon: "car" },
  { key: "clubhouse", label: "Clubhouse", category: "COMMUNITY", icon: "house" },
  { key: "playground", label: "Playground", category: "COMMUNITY", icon: "baby" },
  { key: "jogging-path", label: "Jogging path", category: "COMMUNITY", icon: "footprints" },
  { key: "basketball-court", label: "Basketball court", category: "COMMUNITY", icon: "circle-dot" },
  { key: "chapel", label: "Chapel", category: "COMMUNITY", icon: "church" },
  { key: "gated-community", label: "Gated community", category: "SECURITY", icon: "shield" },
  { key: "security-24-7", label: "24/7 security", category: "SECURITY", icon: "shield-check" },
  { key: "cctv", label: "CCTV", category: "SECURITY", icon: "cctv" },
  { key: "fire-sprinklers", label: "Fire sprinkler system", category: "SECURITY", icon: "flame-kindling" },
  { key: "backup-generator", label: "Backup generator", category: "UTILITIES", icon: "zap" },
  { key: "water-reservoir", label: "Water reservoir / cistern", category: "UTILITIES", icon: "droplets" },
  { key: "flood-free-claimed", label: "Flood-free (per seller)", category: "UTILITIES", icon: "cloud-rain" },
];

// Unsponsored scenery for the homepage hero: free Unsplash License photos
// (see src/lib/ph/photos.ts). Upload them to the `banners/` folder of the
// public bucket under these keys.
export const HERO_BACKGROUNDS = [
  { imageKey: "banners/hero-el-nido.jpg", altText: "Limestone cliffs around a turquoise cove in El Nido, Palawan", photoCredit: "Jared Rice on Unsplash", photoCreditUrl: "https://unsplash.com/photos/Tm0XygW6gN8", locationKey: null },
  { imageKey: "banners/hero-bgc.jpg", altText: "Aerial view of high-rise buildings in Bonifacio Global City, Taguig", photoCredit: "OJ Serrano on Unsplash", photoCreditUrl: "https://unsplash.com/photos/iacKpANQHNA", locationKey: null },
  { imageKey: "banners/hero-batad.jpg", altText: "Batad rice terraces and village in Banaue, Ifugao", photoCredit: "Omri D. Cohen on Unsplash", photoCreditUrl: "https://unsplash.com/photos/pozDysoeJ9Y", locationKey: null },
  { imageKey: "banners/hero-mayon.jpg", altText: "Mayon Volcano behind the Cagsawa Ruins bell tower in Legazpi, Albay", photoCredit: "Camille San Vicente on Unsplash", photoCreditUrl: "https://unsplash.com/photos/Z5xHpUH9o8Y", locationKey: null },
  { imageKey: "banners/hero-chocolate-hills.jpg", altText: "Rolling Chocolate Hills in Bohol", photoCredit: "Zed Benson on Unsplash", photoCreditUrl: "https://unsplash.com/photos/tyMVaFXcksU", locationKey: "central-visayas/bohol" },
] as const;

/** Minimal surface used here, so the seed can be exercised without a database. */
export interface SeedClient {
  location: { upsert(args: unknown): Promise<{ id: string }> };
  amenity: { upsert(args: unknown): Promise<unknown> };
  heroBanner: { findFirst(args: unknown): Promise<{ id: string } | null>; create(args: unknown): Promise<unknown> };
}

export async function seed(db: SeedClient) {
  // Locations: parent-first so parents exist before children reference them
  const idByKey = new Map<string, string>();
  for (const loc of allLocations()) {
    const data = {
      country: loc.country,
      // Set on the emirate itself; places inside inherit it through ancestorIds
      adPermitSystem: loc.parentKey === null ? loc.adPermit : null,
      name: loc.name,
      displayName: loc.displayName,
      level: loc.level,
      parentId: loc.parentKey ? idByKey.get(loc.parentKey)! : null,
      ancestorIds: loc.ancestorKeys.map((k) => idByKey.get(k)!),
      aliases: loc.aliases,
      isPopular: loc.isPopular,
      lat: loc.lat,
      lng: loc.lng,
    };
    const row = await db.location.upsert({ where: { slug: loc.key }, create: { slug: loc.key, ...data }, update: data });
    idByKey.set(loc.key, row.id);
  }

  for (const a of AMENITIES) {
    await db.amenity.upsert({ where: { key: a.key }, create: a, update: { label: a.label, category: a.category, icon: a.icon } });
  }

  for (const [i, b] of HERO_BACKGROUNDS.entries()) {
    const exists = await db.heroBanner.findFirst({ where: { placement: "HOME_HERO", imageKey: b.imageKey } });
    if (exists) continue;
    await db.heroBanner.create({
      data: {
        placement: "HOME_HERO",
        imageKey: b.imageKey,
        altText: b.altText,
        photoCredit: b.photoCredit,
        photoCreditUrl: b.photoCreditUrl,
        sortOrder: i,
        locationId: b.locationKey ? idByKey.get(b.locationKey) ?? null : null,
      },
    });
  }

  return { locations: idByKey.size, amenities: AMENITIES.length, heroBackgrounds: HERO_BACKGROUNDS.length };
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const counts = await seed(prisma as unknown as SeedClient);
    console.log("Seeded", counts);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith("seed.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
