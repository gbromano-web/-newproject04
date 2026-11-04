import "server-only";
import sharp from "sharp";

/**
 * Every listing photo is checked and re-encoded on the server before it is
 * stored, whatever the browser sent:
 *
 * - The first bytes must be a real JPEG, PNG or WebP (a renamed file, an SVG,
 *   HTML or a script is refused, whatever its name or declared type).
 * - It must decode as an image, within a pixel limit (no decompression bombs).
 * - It is turned upright (EXIF orientation), shrunk to at most 2048 px on the
 *   long side and saved as WebP. Re-encoding drops all metadata: GPS position,
 *   camera serial, owner name, embedded thumbnails.
 */

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // the browser shrinks photos first, so real uploads are far smaller
const MAX_INPUT_PIXELS = 60_000_000;
const MIN_LONG_SIDE = 600;
const MAX_SIDE = 2048;

export type PhotoProblem = "too_large" | "not_image" | "too_small" | "unreadable";

export const PHOTO_PROBLEM: Record<PhotoProblem, string> = {
  too_large: "That photo is over 4 MB even after shrinking. Try a smaller one.",
  not_image: "That file isn't a JPEG, PNG or WebP photo.",
  too_small: `That photo is too small. Use one at least ${MIN_LONG_SIDE} pixels wide or tall.`,
  unreadable: "That photo couldn't be read. It may be damaged; try exporting it again.",
};

function sniff(b: Buffer): "jpeg" | "png" | "webp" | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

export async function processPhoto(input: Buffer): Promise<{ ok: { data: Buffer; width: number; height: number } } | { problem: PhotoProblem }> {
  if (input.length > MAX_UPLOAD_BYTES) return { problem: "too_large" };
  const kind = sniff(input);
  if (!kind) return { problem: "not_image" };
  try {
    const image = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" });
    const meta = await image.metadata();
    if (meta.format !== kind) return { problem: "not_image" }; // the bytes must decode as what they claim to be
    if (!meta.width || !meta.height) return { problem: "unreadable" };
    const long = Math.max(meta.width, meta.height);
    if (long < MIN_LONG_SIDE) return { problem: "too_small" };
    const { data, info } = await image
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    return { ok: { data, width: info.width, height: info.height } };
  } catch {
    return { problem: "unreadable" };
  }
}
