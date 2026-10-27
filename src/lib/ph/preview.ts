import { getAgent, LISTINGS } from "./listings";
import { openingMessage } from "./leads";

/**
 * Static client preview (GitHub Pages). Built with `npm run build:preview`:
 * no server, so lead routes are replaced by direct Viber/WhatsApp links and
 * the inquiry form confirms without sending. The real site is unaffected.
 */
export const STATIC_PREVIEW = process.env.NEXT_PUBLIC_STATIC_PREVIEW === "1";

/** Sub-path the preview is served from, e.g. "/-newproject04". Empty on the real site. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefix for plain <a>, <form> and <img> paths (next/link adds it on its own). */
export const withBase = (path: string) => `${BASE_PATH}${path}`;

/** Viber / WhatsApp button target: the logging route on the real site, the app directly in the preview. */
export function leadHref(channel: "viber" | "whatsapp", listingId: string) {
  if (!STATIC_PREVIEW) return `/api/ph/leads/${channel}?listing=${listingId}`;
  const listing = LISTINGS.find((l) => l.id === listingId);
  if (!listing) return withBase("/search");
  const agent = getAgent(listing.agentId);
  if (channel === "viber") return `viber://chat?number=${encodeURIComponent(agent.viber)}`;
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return `https://wa.me/${agent.whatsapp}?text=${encodeURIComponent(openingMessage(listing, origin))}`;
}
