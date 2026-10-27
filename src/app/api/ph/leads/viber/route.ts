import { NextResponse, type NextRequest } from "next/server";
import { getAgent } from "@/lib/ph/listings";
import { findListing, logLead } from "@/lib/ph/leads";

/**
 * "Chat on Viber". Logs the lead, then opens Viber with the agent's chat.
 * viber://chat needs the number with "+" encoded as %2B.
 */
export async function GET(req: NextRequest) {
  const listing = findListing(req.nextUrl.searchParams.get("listing"));
  if (!listing) return NextResponse.redirect(new URL("/search", req.url));
  const agent = getAgent(listing.agentId);
  logLead("VIBER", listing, { ua: req.headers.get("user-agent") });
  // Plain Response: NextResponse.redirect normalises custom schemes to "viber://chat/?..."
  return new Response(null, { status: 302, headers: { Location: `viber://chat?number=${encodeURIComponent(agent.viber)}` } });
}
