// Professional photography for the hero slides and destination cards.
//
// All photos are free for commercial use under the Unsplash License
// (https://unsplash.com/license). Attribution is not required, but we credit
// photographers on the slide caption as good practice. Each entry was checked
// on its Unsplash page for location and licence; several photos tagged
// "Banaue" on Unsplash are actually Bali or China, so locations matter.
//
// Production: copy these into Supabase Storage and store the keys on
// HeroBanner.imageKey so the site does not depend on Unsplash's CDN.

export interface Photo {
  src: string; // images.unsplash.com base URL without query params
  alt: string;
  photographer: string;
  profileUrl: string;
  pageUrl: string;
  /** CSS object-position, to keep the subject in frame when cropped */
  position?: string;
}

const UTM = "utm_source=sa_realty&utm_medium=referral";

function unsplash(id: string, photoPage: string, photographer: string, username: string, alt: string, position?: string): Photo {
  return {
    src: `https://images.unsplash.com/${id}`,
    alt,
    photographer,
    profileUrl: `https://unsplash.com/@${username}?${UTM}`,
    pageUrl: `https://unsplash.com/photos/${photoPage}?${UTM}`,
    position,
  };
}

export const PHOTOS = {
  elNido: unsplash(
    "photo-1771533680002-5210c217a16f", "Tm0XygW6gN8", "Jared Rice", "jareddrice",
    "Limestone cliffs around a turquoise cove in El Nido, Palawan",
  ),
  elNidoLagoon: unsplash(
    "photo-1746260948442-4c5ba23d9a7b", "Vb2eRgWU7rc", "Roman Lezhnin", "i_am_5_percent",
    "Turquoise water framed by lush cliffs in El Nido, Palawan",
  ),
  bgc: unsplash(
    "photo-1596564309076-01c1868b07a4", "iacKpANQHNA", "OJ Serrano", "senyor_oj",
    "Aerial view of high-rise buildings in Bonifacio Global City, Taguig",
  ),
  batad: unsplash(
    "photo-1714746093223-083b10d1d9d5", "pozDysoeJ9Y", "Omri D. Cohen", "omridcohen",
    "Batad rice terraces and village in Banaue, Ifugao",
  ),
  mayon: unsplash(
    "photo-1555590858-be28a58c2688", "Z5xHpUH9o8Y", "Camille San Vicente", "camillesanvicente",
    "Mayon Volcano behind the Cagsawa Ruins bell tower in Legazpi, Albay",
  ),
  chocolateHills: unsplash(
    "photo-1546068996-8da61faeceaa", "tyMVaFXcksU", "Zed Benson", "zedbenson",
    "Rolling Chocolate Hills in Bohol",
  ),

  // Sample listing photos (stand-ins until agents upload their own)
  condoLiving: unsplash(
    "photo-1758565811176-ccd94357a844", "12WFO8yWrsw", "Caroline Badran", "___atmos",
    "Living room with floor-to-ceiling windows and a city view",
  ),
  condoLounge: unsplash(
    "photo-1758448511322-8bfc73daf606", "yxO8YG082v8", "Aalo Lens", "aalolens",
    "Modern lounge with a sofa and wide city views",
  ),
  condoTower: unsplash(
    "photo-1564644597667-c82bd44452f5", "iDgXYorA_Ro", "cheng feng", "chengfengrecord",
    "Residential high-rise against a clear blue sky",
  ),
  housePool: unsplash(
    "photo-1711114378455-b1f479d94a19", "Tw1dYTSPSpI", "Zoshua Colah", "zoshuacolah",
    "House with a tropical outdoor swimming pool",
  ),
  townhouses: unsplash(
    "photo-1760473537243-72168ffd273c", "Ph06_YFjRu0", "Roger Starnes Sr", "rstar50",
    "Row of new townhouses",
  ),
  taalView: unsplash(
    "photo-1589182175047-646fdcdb5d14", "qDVOuo3kA3M", "Lance Lozano", "lartdelance",
    "Green ridge overlooking Taal Lake",
  ),
} satisfies Record<string, Photo>;

export type PhotoKey = keyof typeof PHOTOS;

const WIDTHS = [640, 960, 1280, 1600, 1920, 2400];

/** Unsplash serves resized, format-negotiated images through URL params. */
export function photoUrl(p: Photo, width: number, quality = 72) {
  return `${p.src}?w=${width}&q=${quality}&auto=format&fit=crop`;
}

export function photoSrcSet(p: Photo, quality?: number) {
  return WIDTHS.map((w) => `${photoUrl(p, w, quality)} ${w}w`).join(", ");
}
