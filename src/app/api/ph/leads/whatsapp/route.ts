import { NextResponse, type NextRequest } from "next/server";
import { getAgent } from "@/lib/ph/listings";
import { findListing, logLead, openingMessage } from "@/lib/ph/leads";

/** "Chat on WhatsApp". Logs the lead, then opens wa.me with a pre-filled message. */
export async function GET(req: NextRequest) {
  const listing = findListing(req.nextUrl.searchParams.get("listing"));
  if (!listing) return NextResponse.redirect(new URL("/search", req.url));
  const agent = getAgent(listing.agentId);
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
  logLead("WHATSAPP", listing, { ua: req.headers.get("user-agent") });
  return NextResponse.redirect(`https://wa.me/${agent.whatsapp}?text=${encodeURIComponent(openingMessage(listing, origin))}`, 302);
}
