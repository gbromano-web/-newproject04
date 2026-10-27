import type { NextRequest } from "next/server";
import { openingMessage } from "@/lib/ph/leads";
import { chatRedirect } from "@/lib/server/chat-redirect";

/** "Chat on WhatsApp": opens wa.me with a pre-filled message naming the listing. */
export function GET(req: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
  return chatRedirect(req, "WHATSAPP", (agent, listing) => `https://wa.me/${agent.whatsapp}?text=${encodeURIComponent(openingMessage(listing, origin))}`);
}
