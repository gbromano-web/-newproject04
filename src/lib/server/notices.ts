import "server-only";
import { db } from "./db";
import { adminEmails, lines, sendEmail, siteUrl } from "./email";

/** The emails the site sends. Each is a no-op until email is configured (email.ts). */

async function agentContact(agentId: string): Promise<{ email: string; name: string } | null> {
  const { rows } = await db()!.query<{ email: string; name: string }>(
    `SELECT u.email, a."displayName" AS name FROM "Agent" a JOIN "User" u ON u.id = a."userId" WHERE a.id = $1`,
    [agentId],
  );
  return rows[0] ?? null;
}

/** A buyer's inquiry, to the listing's agent. Replying goes straight to the buyer. */
export async function leadAlert(l: {
  agentId: string; listingTitle: string; listingSlug: string; buyerName: string; buyerEmail: string; buyerMobile: string | null;
  message: string | null; withComputation: boolean;
}): Promise<void> {
  const agent = await agentContact(l.agentId).catch(() => null);
  if (!agent) return;
  await sendEmail({
    to: agent.email,
    replyTo: l.buyerEmail,
    tag: "lead_alert",
    subject: `New inquiry: ${l.listingTitle}`,
    text: lines(
      `Hi ${agent.name.split(" ")[0]},`,
      "",
      `${l.buyerName} sent an inquiry about ${l.listingTitle}${l.withComputation ? " and asked for a sample computation" : ""}.`,
      "",
      `Email: ${l.buyerEmail}`,
      l.buyerMobile && `Mobile: ${l.buyerMobile}`,
      l.message && `Message: ${l.message}`,
      "",
      `Listing: ${siteUrl()}/property/${l.listingSlug}`,
      `All your leads: ${siteUrl()}/dashboard`,
      "",
      "Reply to this email to answer them directly. They agreed to share these details with you for this inquiry only.",
    ),
  });
}

/** A new sign-up waiting for review, to the people in ADMIN_EMAILS. */
export async function applicationAlert(a: { name: string; country: string; licence: string }): Promise<void> {
  const to = adminEmails();
  if (!to.length) return;
  await sendEmail({
    to,
    tag: "application_alert",
    subject: `New agent application: ${a.name} (${a.country === "AE" ? "UAE" : "Philippines"})`,
    text: lines(
      `${a.name} applied as an agent.`,
      `Licence: ${a.licence}`,
      "",
      `Review it: ${siteUrl()}/admin/agents`,
      "Check the licence with the regulator before approving.",
    ),
  });
}

/** Approved: the agent can now list. */
export async function approvedNotice(to: string, name: string, country: string): Promise<void> {
  await sendEmail({
    to,
    tag: "agent_approved",
    subject: "Your Go Search Property agent account is active",
    text: lines(
      `Hi ${name.split(" ")[0]},`,
      "",
      "We've checked your licence and your agent account is now active.",
      "",
      `Sign in and add your first listing: ${siteUrl()}/agent/sign-in`,
      `Plans: ${siteUrl()}${country === "AE" ? "/uae/pricing" : "/pricing"}`,
      "",
      "Welcome aboard.",
    ),
  });
}

/** Not approved, with the reason the admin gave. */
export async function rejectedNotice(to: string, name: string, reason: string): Promise<void> {
  await sendEmail({
    to,
    tag: "agent_rejected",
    subject: "About your Go Search Property application",
    text: lines(
      `Hi ${name.split(" ")[0]},`,
      "",
      "Thank you for applying. We couldn't approve your agent account at this time.",
      `Reason: ${reason}`,
      "",
      "If something can be corrected, reply to this email and we'll look again.",
    ),
  });
}
