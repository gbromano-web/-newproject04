import Link from "next/link";
import { BadgeCheck, Calculator, Clock, LogOut, Mail, MessageCircle, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons";
import { ListingPhoto } from "@/components/ph/listing-photo";
import { formatListingPrice } from "@/lib/ph/format";
import { LISTING_TYPE_LABEL } from "@/lib/ph/listings";
import { getSession } from "@/lib/server/agent-session";
import { agentDashboard } from "@/lib/server/dashboard-repo";
import { setLeadStatus, signOut } from "../agent/actions";

type Icon = React.ComponentType<{ className?: string }>;
const CHANNELS: Record<string, { label: string; icon: Icon; chip: string }> = {
  VIBER: { label: "Viber", icon: MessageCircle, chip: "bg-viber/10 text-viber" },
  WHATSAPP: { label: "WhatsApp", icon: WhatsAppIcon, chip: "bg-whatsapp/10 text-whatsapp" },
  INQUIRY: { label: "Inquiry", icon: Mail, chip: "bg-sea-50 text-sea-800" },
  SAMPLE_COMPUTATION: { label: "Sample computation", icon: Calculator, chip: "bg-mango-300/30 text-mango-700" },
  CALL: { label: "Call", icon: Phone, chip: "bg-mist text-ink-soft" },
  CALLBACK: { label: "Callback", icon: Phone, chip: "bg-mist text-ink-soft" },
  SMS: { label: "SMS", icon: MessageCircle, chip: "bg-mist text-ink-soft" },
};

const LEAD_STATUS: [string, string][] = [
  ["NEW", "New"], ["CONTACTED", "Contacted"], ["SITE_VIEWING_SCHEDULED", "Site viewing"], ["RESERVED", "Reserved"],
  ["WON", "Closed"], ["LOST", "Lost"], ["SPAM", "Spam"],
];

const LISTING_STATUS: Record<string, string> = {
  DRAFT: "Draft", PENDING_REVIEW: "In review", ACTIVE: "Live", PAUSED: "Paused", EXPIRED: "Expired", REJECTED: "Rejected", SOLD: "Sold", RENTED: "Rented",
};

const when = (d: Date) =>
  new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(d);

function SignOut() {
  return (
    <form action={signOut}>
      <button className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-sea-900 ring-1 ring-line hover:bg-white">
        <LogOut className="size-4" /> Sign out
      </button>
    </form>
  );
}

/** The signed-in agent's own listings and leads, straight from the database. */
export async function LiveDashboard() {
  const session = await getSession();
  // The proxy already sends visitors without a session to sign in; this is the second lock
  if (!session) return <Shell title="Please sign in again"><Link className="font-semibold text-sea-900 underline" href="/agent/sign-in">Sign in</Link></Shell>;

  if (!session.agent) {
    return (
      <Shell title="Your account is not linked to an agent profile yet" action={<SignOut />}>
        You are signed in as {session.email}. Once your PRC licence or DHSUD accreditation is checked, your agent profile is linked to this account and your listings and inquiries appear here.
      </Shell>
    );
  }

  const me = session.agent;
  const data = await agentDashboard(me.id);
  const live = data.listings.filter((l) => l.live).length;
  const week = Object.values(data.weekByChannel).reduce((a, b) => a + b, 0);
  const verified = me.verification === "VERIFIED";

  return (
    <div className="bg-mist/60">
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-sea-950 sm:text-[32px]">Mabuhay, {me.displayName.split(" ")[0]}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-ink-soft">
              {me.agency && <>{me.agency} · </>}
              {me.licenseNumber && <>Licence {me.licenseNumber} </>}
              {verified ? (
                <span className="inline-flex items-center gap-1"><BadgeCheck className="size-4 text-lagoon-600" /> verified</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-mango-700"><Clock className="size-4" /> verification pending: listings go live once it is checked</span>
              )}
            </p>
          </div>
          <SignOut />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Live listings", value: live, note: `${data.listings.length} in total` },
            { label: "Inquiries, last 7 days", value: week, note: Object.entries(data.weekByChannel).map(([c, n]) => `${CHANNELS[c]?.label ?? c} ${n}`).join(" · ") || "None yet" },
            { label: "Waiting for a reply", value: data.newLeads, note: "Fast replies win more clients" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-white p-5 ring-1 ring-line">
              <p className="text-sm text-ink-soft">{s.label}</p>
              <p className="price mt-2 text-3xl font-bold text-sea-950">{s.value}</p>
              <p className="mt-1 text-xs text-ink-soft">{s.note}</p>
            </div>
          ))}
        </div>

        <section className="rounded-2xl bg-white p-6 ring-1 ring-line">
          <h2 className="text-lg font-bold text-sea-950">Inquiries</h2>
          <p className="mt-1 text-xs text-ink-soft">Buyers shared these details with you only. Use them to reply about this property, and keep them private (Data Privacy Act).</p>
          {data.leads.length === 0 ? (
            <p className="mt-4 text-sm text-ink-soft">No inquiries yet. They appear here as soon as a buyer sends one.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {data.leads.map((lead) => {
                const ch = CHANNELS[lead.channel] ?? CHANNELS.INQUIRY;
                return (
                  <li key={lead.id} className="flex flex-wrap items-start gap-3 py-4">
                    <span className={`grid size-9 shrink-0 place-items-center rounded-full ${ch.chip}`} title={ch.label}><ch.icon className="size-4" /></span>
                    <div className="min-w-0 flex-1 basis-64">
                      <p className="text-sm font-semibold text-ink">
                        {lead.name ?? `${ch.label} chat`} <span className="font-normal text-ink-soft">· {when(lead.createdAt)}</span>
                      </p>
                      <p className="text-xs text-ink-soft">
                        {lead.listingSlug ? <Link className="hover:text-lagoon-700" href={`/property/${lead.listingSlug}`}>{lead.listingTitle}</Link> : "Listing removed"}
                      </p>
                      {(lead.email || lead.mobile) && (
                        <p className="mt-1 flex flex-wrap gap-x-4 text-sm">
                          {lead.email && <a className="font-medium text-sea-900 hover:text-lagoon-700" href={`mailto:${lead.email}`}>{lead.email}</a>}
                          {lead.mobile && <a className="font-medium text-sea-900 hover:text-lagoon-700" href={`tel:${lead.mobile.replace(/[^+\d]/g, "")}`}>{lead.mobile}</a>}
                        </p>
                      )}
                      {lead.message && <p className="mt-1.5 whitespace-pre-line break-words text-sm text-ink">{lead.message}</p>}
                      {!lead.name && <p className="mt-1 text-xs text-ink-soft">The buyer tapped {ch.label}; their message is in your {ch.label} app.</p>}
                    </div>
                    <form action={setLeadStatus} className="flex items-center gap-2">
                      <input type="hidden" name="leadId" value={lead.id} />
                      <select name="status" defaultValue={lead.status} aria-label="Lead status" className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink">
                        {LEAD_STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                      <button className="rounded-full bg-sea-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sea-800">Save</button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-line">
          <h2 className="p-6 pb-4 text-lg font-bold text-sea-950">Your listings</h2>
          {data.listings.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-ink-soft">No listings yet. Send your listings to the Go Search Property team to have them added.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-y border-line bg-mist text-left text-xs text-ink-soft">
                  <tr>
                    <th className="px-6 py-2.5 font-semibold">Listing</th>
                    <th className="px-3 py-2.5 font-semibold">Price</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                    <th className="px-6 py-2.5 text-right font-semibold">Inquiries</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.listings.map((l) => (
                    <tr key={l.id} className="hover:bg-mist/50">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-mist"><ListingPhoto photo={l.photo} sizes="64px" /></div>
                          <div className="min-w-0">
                            {l.live ? (
                              <Link href={`/property/${l.slug}`} className="line-clamp-1 font-semibold text-ink hover:text-lagoon-700">{l.title}</Link>
                            ) : (
                              <span className="line-clamp-1 font-semibold text-ink">{l.title}</span>
                            )}
                            <p className="text-xs text-ink-soft">{LISTING_TYPE_LABEL[l.listingType as keyof typeof LISTING_TYPE_LABEL] ?? l.listingType}, {l.location}</p>
                          </div>
                        </div>
                      </td>
                      <td className="price whitespace-nowrap px-3 py-3.5 font-semibold text-sea-950">{formatListingPrice(l)}</td>
                      <td className="px-3 py-3.5">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${l.live ? "bg-lagoon-50 text-lagoon-700" : "bg-mist text-ink-soft"}`}>
                          {l.live ? "Live" : l.status === "ACTIVE" ? "Expired" : LISTING_STATUS[l.status] ?? l.status}
                        </span>
                      </td>
                      <td className="price px-6 py-3.5 text-right font-semibold">{l.leads}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Shell({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-mist/60 px-4 py-16">
      <div className="mx-auto max-w-[560px] rounded-3xl bg-white p-8 ring-1 ring-line">
        <h1 className="text-xl font-bold text-sea-950">{title}</h1>
        <p className="mt-3 text-sm text-ink-soft">{children}</p>
        {action && <div className="mt-6">{action}</div>}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-8 sm:px-6" aria-busy="true">
      <div className="h-10 w-64 animate-pulse rounded-xl bg-mist" />
      <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-mist" />)}</div>
      <div className="h-80 animate-pulse rounded-2xl bg-mist" />
    </div>
  );
}
