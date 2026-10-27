import { getAgent, LISTINGS, type PhListing } from "./listings";
import { formatListingPrice } from "./format";

export type LeadChannel = "VIBER" | "WHATSAPP" | "INQUIRY" | "SAMPLE_COMPUTATION";

export function findListing(id: string | null): PhListing | undefined {
  return id ? LISTINGS.find((l) => l.id === id) : undefined;
}

/** Pre-filled first message, so the agent knows which listing the buyer means. */
export function openingMessage(l: PhListing, origin: string) {
  const agent = getAgent(l.agentId);
  return `Hi ${agent.name.split(" ")[0]}, I saw "${l.title}" (${formatListingPrice(l)}, ${l.locationLabel}) on SA Realty: ${origin}/property/${l.slug}. Is it still available?`;
}

/**
 * Production: insert a Lead row (channel, listingId, agentId, sessionId, UTM,
 * hashed IP) and notify the agent. The demo logs to the server console.
 */
export function logLead(channel: LeadChannel, l: PhListing, extra: Record<string, unknown> = {}) {
  console.log("[lead]", JSON.stringify({ channel, listingId: l.id, agentId: l.agentId, at: new Date().toISOString(), ...extra }));
}
