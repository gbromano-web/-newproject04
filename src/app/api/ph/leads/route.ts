import { NextResponse } from "next/server";
import { findListing, logLead } from "@/lib/ph/leads";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * "Send inquiry" and "Request sample computation".
 * Production: validate with Zod, rate-limit by hashed IP, insert into Lead
 * (with the computation snapshot) and notify the agent by email and push.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const listing = findListing(body?.listingId ?? null);
  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  if (!body?.name || !EMAIL.test(String(body.email ?? ""))) {
    return NextResponse.json({ error: "Enter your name and a valid email address." }, { status: 400 });
  }
  if (!body.consent) {
    return NextResponse.json({ error: "Agree to share your details with the agent to send this inquiry." }, { status: 400 });
  }
  const channel = body.computation ? "SAMPLE_COMPUTATION" : "INQUIRY";
  logLead(channel, listing, {
    name: String(body.name).slice(0, 120),
    email: String(body.email).slice(0, 200),
    mobile: body.mobile ? String(body.mobile).slice(0, 30) : null,
    message: body.message ? String(body.message).slice(0, 2000) : null,
    computation: body.computation ?? null,
    consentAt: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true, channel }, { status: 201 });
}
