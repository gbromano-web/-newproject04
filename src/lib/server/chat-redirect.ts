import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { agentOf, type PhAgent, type PhListing } from "@/lib/ph/listings";
import { SAMPLE_DATA } from "@/lib/ph/preview";
import { getListingById } from "./listings-repo";
import { saveLead } from "./leads";
import { ipHash, isBot, log, rateLimit, requestId } from "./request";

// Redirect responses must never be cached or indexed: each click is a lead
const NO_STORE = { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" };

/**
 * Shared handler for "Chat on Viber / WhatsApp": records the lead (skipping
 * crawlers, link previews and repeat clicks), then sends the visitor to the app.
 */
export async function chatRedirect(req: NextRequest, channel: "VIBER" | "WHATSAPP", target: (agent: PhAgent, listing: PhListing) => string) {
  const rid = requestId(req);
  // Sample agents' numbers are made up but dialable: never send anyone there
  if (SAMPLE_DATA) return NextResponse.redirect(new URL("/search", req.url), { status: 302, headers: NO_STORE });
  try {
    const id = req.nextUrl.searchParams.get("listing");
    const listing = id ? await getListingById(id) : undefined;
    if (!listing) return NextResponse.redirect(new URL("/search", req.url), { status: 302, headers: NO_STORE });
    const agent = agentOf(listing);
    const ip = ipHash(req);
    // One lead per visitor, listing and channel every 30 minutes, so double taps are not counted twice
    const first = (await rateLimit(`chat:${channel}:${listing.id}:${ip}`, 1, 30 * 60_000)).ok;
    if (!isBot(req) && first) {
      // Saving must not block the hand-off to the chat app: on failure, log and still redirect
      await saveLead({ channel, propertyId: listing.id, agentId: listing.agentId, ipHash: ip, userAgent: req.headers.get("user-agent") })
        .then((r) => log("info", "lead.created", { requestId: rid, channel, listingId: listing.id, agentId: listing.agentId, ipHash: ip, stored: r.stored }))
        .catch((e) => log("error", "lead.save_failed", { requestId: rid, channel, listingId: listing.id, error: e instanceof Error ? e.message : String(e) }));
    }
    // Plain Response: NextResponse.redirect normalises custom schemes such as viber://
    return new Response(null, { status: 302, headers: { Location: target(agent, listing), ...NO_STORE } });
  } catch (e) {
    log("error", "lead.chat_failed", { requestId: rid, channel, error: e instanceof Error ? e.message : String(e) });
    return NextResponse.redirect(new URL("/search", req.url), { status: 302, headers: NO_STORE });
  }
}
