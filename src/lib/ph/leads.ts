import { agentOf, type PhListing } from "./listings";
import { formatListingPrice } from "./format";

export type LeadChannel = "VIBER" | "WHATSAPP" | "INQUIRY" | "SAMPLE_COMPUTATION";


/** Pre-filled first message, so the agent knows which listing the buyer means. */
export function openingMessage(l: PhListing, origin: string) {
  const agent = agentOf(l);
  return `Hi ${agent.name.split(" ")[0]}, I saw "${l.title}" (${formatListingPrice(l)}, ${l.locationLabel}) on Go Search Property: ${origin}/property/${l.slug}. Is it still available?`;
}
