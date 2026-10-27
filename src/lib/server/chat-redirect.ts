import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { getAgent, type PhAgent, type PhListing } from "@/lib/ph/listings";
import { findListing } from "@/lib/ph/leads";
import { ipHash, isBot, log, rateLimit, requestId } from "./request";

// Redirect responses must never be cached or indexed: each click is a lead
const NO_STORE = { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" };

/**
 * Shared handler for "Chat on Viber / WhatsApp": records the lead (skipping
 * crawlers, link previews and repeat clicks), then sends the visitor to the app.
 */
export function chatRedirect(req: NextRequest, channel: "VIBER" | "WHATSAPP", target: (agent: PhAgent, listing: PhListing) => string) {
  const rid = requestId(req);
  try {
    const listing = findListing(req.nextUrl.searchParams.get("listing"));
    if (!listing) return NextResponse.redirect(new URL("/search", req.url), { status: 302, headers: NO_STORE });
    const agent = getAgent(listing.agentId);
    const ip = ipHash(req);
    // One lead per visitor, listing and channel every 30 minutes, so double taps are not counted twice
    const first = rateLimit(`chat:${channel}:${listing.id}:${ip}`, 1, 30 * 60_000).ok;
    if (!isBot(req) && first) {
      log("info", "lead.created", { requestId: rid, channel, listingId: listing.id, agentId: listing.agentId, ipHash: ip });
      // Production: await db.lead.create({ data: { channel, propertyId, agentId, ipHash, userAgent } })
    }
    // Plain Response: NextResponse.redirect normalises custom schemes such as viber://
    return new Response(null, { status: 302, headers: { Location: target(agent, listing), ...NO_STORE } });
  } catch (e) {
    log("error", "lead.chat_failed", { requestId: rid, channel, error: e instanceof Error ? e.message : String(e) });
    return NextResponse.redirect(new URL("/search", req.url), { status: 302, headers: NO_STORE });
  }
}
