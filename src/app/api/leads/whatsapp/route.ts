import { NextResponse, type NextRequest } from "next/server";
import { getAgent, properties } from "@/lib/mock-data";

/**
 * WhatsApp click tracking. Every WhatsApp button links here instead of wa.me
 * directly, so the click is logged as a lead (channel = WHATSAPP) and
 * attributed to the listing and agent before the user is redirected.
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("listing");
  const listing = properties.find((p) => p.id === id);
  if (!listing) return NextResponse.redirect(new URL("/", req.url));

  const agent = getAgent(listing.agentId);
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
  const text = `Hi ${agent.name.split(" ")[0]}, I saw "${listing.title}" on SA Realty (${origin}/property/${listing.slug}). Is it still available?`;

  // Production: insert Lead { channel: WHATSAPP, listingId, agentId, sessionId, utm } here.
  console.log("[lead:whatsapp]", { listingId: listing.id, agentId: agent.id, ua: req.headers.get("user-agent") });

  return NextResponse.redirect(`https://wa.me/${agent.whatsapp}?text=${encodeURIComponent(text)}`, 302);
}
