import { NextResponse } from "next/server";
import { properties } from "@/lib/mock-data";

/**
 * Receives "Send enquiry" and callback requests from the property page.
 * Production: validate with zod, rate-limit by IP, insert into `Lead`
 * (see prisma/schema.prisma), then notify the agent by email/push.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.listingId || !body?.email) {
    return NextResponse.json({ error: "listingId and email are required" }, { status: 400 });
  }
  const listing = properties.find((p) => p.id === body.listingId);
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  const lead = {
    listingId: listing.id,
    agentId: listing.agentId,
    channel: body.callback ? "callback" : "email",
    name: String(body.name ?? ""),
    email: String(body.email),
    phone: body.phone ? String(body.phone) : null,
    message: String(body.message ?? ""),
  };
  console.log("[lead]", lead);
  return NextResponse.json({ ok: true }, { status: 201 });
}
