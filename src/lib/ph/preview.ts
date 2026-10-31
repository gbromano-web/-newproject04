/**
 * Static client preview (GitHub Pages). Built with `npm run build:preview`:
 * no server, so chat and call buttons are switched off, the inquiry form says
 * it was not sent, and a banner marks the data as samples. The real site is unaffected.
 */
export const STATIC_PREVIEW = process.env.NEXT_PUBLIC_STATIC_PREVIEW === "1";

/**
 * True while listings and agents come from the built-in samples in
 * src/lib/ph/listings.ts. Set NEXT_PUBLIC_LISTINGS_SOURCE=database on the
 * server to read live listings from Supabase instead (the static preview
 * always uses the samples).
 * While true, every build shows the sample banner, switches off chat and call
 * to the made-up numbers, does not send inquiries, and asks search engines
 * not to index.
 */
export const SAMPLE_DATA = STATIC_PREVIEW || process.env.NEXT_PUBLIC_LISTINGS_SOURCE !== "database";

/** Demo behaviour: the static preview, or any build still on sample data. */
export const DEMO = STATIC_PREVIEW || SAMPLE_DATA;

/** Sub-path the preview is served from, e.g. "/-newproject04". Empty on the real site. */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefix for plain <a>, <form> and <img> paths (next/link adds it on its own). */
export const withBase = (path: string) => `${BASE_PATH}${path}`;

/** Shown on chat and call buttons in the preview, where they are switched off. */
export const PREVIEW_CONTACT_NOTE = "Sample agent: contact is switched off until real listings go live";

/**
 * Viber / WhatsApp button target: the logging route on the real site.
 * In the public preview there is no target: the sample agents' numbers are
 * made up but dialable, so chat and call stay off to avoid messaging strangers.
 */
export function leadHref(channel: "viber" | "whatsapp", listingId: string): string | undefined {
  if (DEMO) return undefined;
  return `/api/ph/leads/${channel}?listing=${encodeURIComponent(listingId)}`;
}

/** Spread onto a chat or call link (after its own props) to switch it off in the preview. */
export const offProps = DEMO ? ({ "aria-disabled": true, title: PREVIEW_CONTACT_NOTE } as const) : {};
/** Append to that link's className. */
export const offClass = DEMO ? " pointer-events-none opacity-50" : "";
