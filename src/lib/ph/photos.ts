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
