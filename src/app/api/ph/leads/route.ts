import { NextResponse } from "next/server";
import { getListingById } from "@/lib/server/listings-repo";
import { SAMPLE_DATA } from "@/lib/ph/preview";
import { saveLead } from "@/lib/server/leads";
import { ipHash, log, rateLimit, requestId } from "@/lib/server/request";

const EMAIL = /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]{2,}$/;
const MOBILE = /^\+?[0-9 ()-]{7,20}$/;
const MAX_BODY_BYTES = 16 * 1024;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const inRange = (v: unknown, min: number, max: number) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

/** Only the calculator fields the agent needs, with sane ranges. Anything else is dropped. */
function parseComputation(c: unknown) {
  if (c === null || c === undefined) return null;
  if (typeof c !== "object") return undefined;
  const x = c as Record<string, unknown>;
  const ok =
    (x.financingType === "PAGIBIG" || x.financingType === "BANK") &&
    inRange(x.price, 1, 10_000_000_000) &&
    inRange(x.downpaymentPercent, 0, 100) &&
    inRange(x.fixingYears, 1, 30) &&
    inRange(x.termYears, 1, 30) &&
    inRange(x.monthly, 0, 1_000_000_000) &&
    inRange(x.rate, 0, 30);
  if (!ok) return undefined;
  const { financingType, price, downpaymentPercent, fixingYears, termYears, monthly, rate } = x;
  return { financingType, price, downpaymentPercent, fixingYears, termYears, monthly, rate };
}

const error = (rid: string, status: number, message: string, headers: Record<string, string> = {}) =>
  NextResponse.json({ error: message, requestId: rid }, { status, headers: { "cache-control": "no-store", ...headers } });

/**
 * "Send inquiry" and "Request sample computation".
 * Stored in the Lead table (with consentAt, ipHash and the computation snapshot)
 * before the buyer is told it was sent. Agent notifications belong in a queue
 * after the insert, so a failed email never loses a lead.
 */
export async function POST(req: Request) {
  const rid = requestId(req);
  // Sample listings have no real agents to receive inquiries
  if (SAMPLE_DATA) return error(rid, 503, "Inquiries open when real listings go live.");
  try {
    // JSON only: a cross-site HTML form cannot send this content type without a CORS preflight, which this route never allows
    if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return error(rid, 415, "Send the inquiry as JSON.");
    }
    const declared = Number(req.headers.get("content-length") ?? 0);
    if (declared > MAX_BODY_BYTES) return error(rid, 413, "Inquiry is too long.");
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return error(rid, 413, "Inquiry is too long.");

    const ip = ipHash(req);
    const limit = await rateLimit(`lead:${ip}`, 5, 10 * 60_000); // 5 inquiries per 10 minutes per visitor
    if (!limit.ok) {
      log("warn", "lead.rate_limited", { requestId: rid, ipHash: ip });
      return error(rid, 429, "Too many inquiries. Please wait a few minutes and try again.", { "retry-after": String(limit.retryAfter) });
    }

    let body: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
      body = parsed as Record<string, unknown>;
    } catch {
      return error(rid, 400, "The inquiry could not be read.");
    }

    // Honeypot: a hidden field people never fill in. Pretend success so bots do not adapt.
    if (str(body.company, 200)) {
      log("info", "lead.honeypot", { requestId: rid, ipHash: ip });
      return NextResponse.json({ ok: true, requestId: rid }, { status: 201 });
    }

    const listing = typeof body.listingId === "string" ? await getListingById(body.listingId) : undefined;
    if (!listing) return error(rid, 404, "Listing not found.");

    const name = str(body.name, 120);
    const email = str(body.email, 254).toLowerCase();
    const mobile = str(body.mobile, 30);
    const message = str(body.message, 2000);
    if (!name || !EMAIL.test(email)) return error(rid, 400, "Enter your name and a valid email address.");
    if (mobile && !MOBILE.test(mobile)) return error(rid, 400, "Enter a valid mobile number, or leave it blank.");
    // Explicit opt-in only: "false", "0" or any other truthy value is not consent
    if (body.consent !== true) return error(rid, 400, "Agree to share your details with the agent to send this inquiry.");
    const computation = parseComputation(body.computation);
    if (computation === undefined) return error(rid, 400, "The sample computation details are not valid.");

    const channel = computation ? "SAMPLE_COMPUTATION" : "INQUIRY";
    let saved: { stored: boolean; id?: string };
    try {
      saved = await saveLead({
        channel, propertyId: listing.id, agentId: listing.agentId, ipHash: ip, userAgent: req.headers.get("user-agent"),
        name, email, mobile: mobile || null, message: message || null, consentAt: new Date(),
        computation: computation as Parameters<typeof saveLead>[0]["computation"],
      });
    } catch (e) {
      // Never say "sent" for an inquiry that was not stored
      log("error", "lead.save_failed", { requestId: rid, channel, listingId: listing.id, error: e instanceof Error ? e.message : String(e) });
      return error(rid, 503, "Inquiries are temporarily unavailable. Please try again in a few minutes, or use Viber or WhatsApp.");
    }

    // Log the event, not the person: no name, email, phone or message in logs
    log("info", "lead.created", { requestId: rid, channel, listingId: listing.id, agentId: listing.agentId, leadId: saved.id, stored: saved.stored, hasMobile: !!mobile, hasComputation: !!computation });
    return NextResponse.json({ ok: true, channel, requestId: rid }, { status: 201, headers: { "cache-control": "no-store" } });
  } catch (e) {
    log("error", "lead.failed", { requestId: rid, error: e instanceof Error ? e.message : String(e), stack: e instanceof Error ? e.stack : undefined });
    return error(rid, 500, "Your inquiry could not be sent. Please try again.");
  }
}
