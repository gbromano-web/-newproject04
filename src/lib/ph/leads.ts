import { getAgent, LISTINGS, type PhListing } from "./listings";
import { formatListingPrice } from "./format";

export type LeadChannel = "VIBER" | "WHATSAPP" | "INQUIRY" | "SAMPLE_COMPUTATION";

export function findListing(id: string | null): PhListing | undefined {
  // Listing IDs are short; refuse anything else before searching
  return id && id.length <= 64 ? LISTINGS.find((l) => l.id === id) : undefined;
}

/** Pre-filled first message, so the agent knows which listing the buyer means. */
export function openingMessage(l: PhListing, origin: string) {
  const agent = getAgent(l.agentId);
  return `Hi ${agent.name.split(" ")[0]}, I saw "${l.title}" (${formatListingPrice(l)}, ${l.locationLabel}) on SA Realty: ${origin}/property/${l.slug}. Is it still available?`;
}
