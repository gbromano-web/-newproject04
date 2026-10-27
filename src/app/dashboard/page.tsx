import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3, BadgeCheck, Building2, Calculator, CirclePlus, Eye, Inbox, LayoutDashboard, Mail, Megaphone, MessageCircle, Settings, Sparkles, Users,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons";
import { ListingPhoto } from "@/components/ph/listing-photo";
import { formatListingPrice } from "@/lib/ph/format";
import { AGENTS, LISTINGS, LISTING_TYPE_LABEL } from "@/lib/ph/listings";

export const metadata: Metadata = { title: "Agent dashboard", robots: { index: false } };

// Demo: signed in as a broker at Metro Prime Properties. Lead figures are sample data.
const AGENCY = "Metro Prime Properties";
const ME = AGENTS.find((a) => a.id === "a2")!;

type Channel = "VIBER" | "WHATSAPP" | "INQUIRY" | "SAMPLE_COMPUTATION";
const CHANNELS: Record<Channel, { label: string; icon: React.ComponentType<{ className?: string }>; dot: string; chip: string }> = {
  VIBER: { label: "Viber", icon: MessageCircle, dot: "bg-viber", chip: "bg-viber/10 text-viber" },
  WHATSAPP: { label: "WhatsApp", icon: WhatsAppIcon, dot: "bg-whatsapp", chip: "bg-whatsapp/10 text-whatsapp" },
  INQUIRY: { label: "Inquiry", icon: Mail, dot: "bg-sea-700", chip: "bg-sea-50 text-sea-800" },
  SAMPLE_COMPUTATION: { label: "Sample computation", icon: Calculator, dot: "bg-mango-500", chip: "bg-mango-300/30 text-mango-700" },
};

const WEEK: { d: string; v: Record<Channel, number> }[] = [
  { d: "Tue", v: { VIBER: 14, WHATSAPP: 5, INQUIRY: 4, SAMPLE_COMPUTATION: 2 } },
  { d: "Wed", v: { VIBER: 17, WHATSAPP: 6, INQUIRY: 3, SAMPLE_COMPUTATION: 3 } },
  { d: "Thu", v: { VIBER: 12, WHATSAPP: 4, INQUIRY: 5, SAMPLE_COMPUTATION: 1 } },
  { d: "Fri", v: { VIBER: 10, WHATSAPP: 3, INQUIRY: 2, SAMPLE_COMPUTATION: 2 } },
  { d: "Sat", v: { VIBER: 22, WHATSAPP: 8, INQUIRY: 6, SAMPLE_COMPUTATION: 4 } },
  { d: "Sun", v: { VIBER: 25, WHATSAPP: 9, INQUIRY: 5, SAMPLE_COMPUTATION: 5 } },
  { d: "Mon", v: { VIBER: 19, WHATSAPP: 7, INQUIRY: 4, SAMPLE_COMPUTATION: 3 } },
];

const LEADS: { name: string; from: string; listing: string; channel: Channel; when: string; status: "New" | "Contacted" | "Site viewing" | "Reserved" }[] = [
  { name: "Miguel T.", from: "Dubai, UAE", listing: "ph7", channel: "VIBER", when: "6 min ago", status: "New" },
  { name: "Hana S.", from: "Tokyo, Japan", listing: "ph2", channel: "SAMPLE_COMPUTATION", when: "34 min ago", status: "New" },
  { name: "Carlo M.", from: "Quezon City", listing: "ph8", channel: "WHATSAPP", when: "1 h ago", status: "Contacted" },
  { name: "Grace L.", from: "Singapore", listing: "ph11", channel: "INQUIRY", when: "3 h ago", status: "Site viewing" },
  { name: "Daniel K.", from: "Seoul, Korea", listing: "ph3", channel: "VIBER", when: "Yesterday", status: "Contacted" },
  { name: "Rina D.", from: "Pasig", listing: "ph12", channel: "SAMPLE_COMPUTATION", when: "Yesterday", status: "Reserved" },
];

const STATUS_CHIP = { New: "bg-mango-300/35 text-mango-700", Contacted: "bg-mist text-ink-soft", "Site viewing": "bg-lagoon-50 text-lagoon-700", Reserved: "bg-sea-900 text-white" };

export default function DashboardPage() {
  const agencyAgents = AGENTS.filter((a) => a.agency === AGENCY).map((a) => a.id);
  const listings = LISTINGS.filter((l) => agencyAgents.includes(l.agentId));
  const totals = WEEK.reduce((acc, w) => {
    (Object.keys(w.v) as Channel[]).forEach((c) => (acc[c] = (acc[c] ?? 0) + w.v[c]));
    return acc;
  }, {} as Record<Channel, number>);
  const total = Object.values(totals).reduce((a, b) => a + b, 0);
  const max = Math.max(...WEEK.map((w) => Object.values(w.v).reduce((a, b) => a + b, 0)));
  const overseas = LEADS.filter((l) => /,/.test(l.from)).length;

  const nav = [
    { icon: LayoutDashboard, label: "Overview", active: true },
    { icon: Building2, label: "Listings" },
    { icon: Inbox, label: "Leads", badge: 2 },
    { icon: Megaphone, label: "Promotions" },
    { icon: Users, label: "Team" },
    { icon: BarChart3, label: "Reports" },
    { icon: Settings, label: "Settings" },
  ];

  return (
    <div className="bg-mist/60">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-[92px] space-y-6">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-sea-900 font-bold text-white">MP</span>
              <div>
                <p className="text-sm font-semibold leading-tight text-sea-950">{AGENCY}</p>
                <p className="text-xs text-ink-soft">DHSUD-registered brokerage</p>
              </div>
            </div>
            <nav className="space-y-1">
              {nav.map(({ icon: Icon, label, active, badge }) => (
                <a key={label} href="#" className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-white text-sea-950 shadow-sm ring-1 ring-line" : "text-ink-soft hover:bg-white hover:text-sea-950"}`}>
                  <Icon className="size-4" /> {label}
                  {badge && <span className="ml-auto rounded-full bg-mango-500 px-1.5 text-xs font-bold text-sea-950">{badge}</span>}
                </a>
              ))}
            </nav>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
              <p className="text-sm font-semibold text-sea-950">Promotion credits</p>
              <p className="mt-1 text-xs text-ink-soft">340 of 500 left this month</p>
              <div className="mt-3 h-1.5 rounded-full bg-mist"><div className="h-1.5 w-[68%] rounded-full bg-sea-900" /></div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-sea-950 sm:text-[32px]">Mabuhay, {ME.name.split(" ")[0]}</h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
                {ME.license} <BadgeCheck className="size-4 text-lagoon-600" /> verified. Two new leads are waiting for a reply.
              </p>
            </div>
            <button className="flex items-center gap-2 rounded-full bg-sea-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sea-800">
              <CirclePlus className="size-4" /> Create listing
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Active listings", value: String(listings.length), note: "All with licence numbers shown" },
              { label: "Leads, last 7 days", value: String(total), note: "Up 18% on the week before" },
              { label: "Leads from overseas", value: `${Math.round((overseas / LEADS.length) * 100)}%`, note: "Japan, Singapore, Korea, UAE" },
              { label: "Median reply time", value: "22 min", note: "Fast replies rank listings higher" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-white p-5 ring-1 ring-line">
                <p className="text-sm text-ink-soft">{s.label}</p>
                <p className="price mt-2 text-3xl font-bold text-sea-950">{s.value}</p>
                <p className="mt-1 text-xs text-ink-soft">{s.note}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <section className="rounded-2xl bg-white p-6 ring-1 ring-line">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-sea-950">Leads by channel</h2>
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
                  {(Object.keys(CHANNELS) as Channel[]).map((c) => (
                    <li key={c} className="flex items-center gap-1.5"><span className={`size-2.5 rounded-sm ${CHANNELS[c].dot}`} />{CHANNELS[c].label} <span className="font-semibold text-ink">{totals[c]}</span></li>
                  ))}
                </ul>
              </div>
              <div className="mt-8 flex h-[360px] items-end gap-3 sm:gap-5">
                {WEEK.map((w) => {
                  const sum = Object.values(w.v).reduce((a, b) => a + b, 0);
                  return (
                    <div key={w.d} className="flex flex-1 flex-col items-center gap-2">
                      <span className="text-xs font-semibold text-ink">{sum}</span>
                      <div className="flex w-full max-w-11 flex-col-reverse gap-[2px] overflow-hidden rounded-lg" style={{ height: `${(sum / max) * 300}px` }}>
                        {(Object.keys(CHANNELS) as Channel[]).map((c) => <div key={c} className={CHANNELS[c].dot} style={{ flex: w.v[c] }} />)}
                      </div>
                      <span className="text-xs text-ink-soft">{w.d}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 ring-1 ring-line">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-sea-950">Latest leads</h2>
                <a href="#" className="text-sm font-semibold text-sea-900 hover:text-lagoon-700">Open inbox</a>
              </div>
              <ul className="mt-3 divide-y divide-line">
                {LEADS.map((lead) => {
                  const ch = CHANNELS[lead.channel];
                  const listing = LISTINGS.find((l) => l.id === lead.listing)!;
                  return (
                    <li key={lead.name} className="flex items-center gap-3 py-3">
                      <span className={`grid size-9 shrink-0 place-items-center rounded-full ${ch.chip}`} title={ch.label}><ch.icon className="size-4" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink">{lead.name} <span className="font-normal text-ink-soft">from {lead.from}</span></p>
                        <p className="truncate text-xs text-ink-soft">{listing.title}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CHIP[lead.status]}`}>{lead.status}</span>
                        <p className="mt-1 text-xs text-ink-soft">{lead.when}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-line">
            <div className="flex flex-wrap items-center justify-between gap-3 p-6 pb-4">
              <h2 className="text-lg font-bold text-sea-950">Your listings</h2>
              <div className="flex gap-1 rounded-full bg-mist p-1 text-xs font-semibold">
                <span className="rounded-full bg-white px-3 py-1 text-sea-950 shadow-sm">Live ({listings.length})</span>
                <span className="px-3 py-1 text-ink-soft">Drafts (2)</span>
                <span className="px-3 py-1 text-ink-soft">Expired (1)</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="border-y border-line bg-mist text-left text-xs text-ink-soft">
                  <tr>
                    <th className="px-6 py-2.5 font-semibold">Listing</th>
                    <th className="px-3 py-2.5 font-semibold">Price</th>
                    <th className="px-3 py-2.5 font-semibold">Quality</th>
                    <th className="px-3 py-2.5 font-semibold"><Eye className="inline size-3.5" /> Views</th>
                    <th className="px-3 py-2.5 font-semibold">Leads</th>
                    <th className="px-6 py-2.5 text-right font-semibold">Promotion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {listings.map((l, i) => {
                    const score = [94, 81, 88, 72, 96, 85][i % 6];
                    return (
                      <tr key={l.id} className="hover:bg-mist/50">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-mist"><ListingPhoto photo={l.photos[0]} sizes="64px" /></div>
                            <div className="min-w-0">
                              <Link href={`/property/${l.slug}`} className="line-clamp-1 font-semibold text-ink hover:text-lagoon-700">{l.title}</Link>
                              <p className="text-xs text-ink-soft">{LISTING_TYPE_LABEL[l.listingType]}, {l.locationLabel}</p>
                            </div>
                          </div>
                        </td>
                        <td className="price whitespace-nowrap px-3 py-3.5 font-semibold text-sea-950">{formatListingPrice(l)}</td>
                        <td className="px-3 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-mist"><div className={`h-1.5 rounded-full ${score >= 85 ? "bg-lagoon-500" : "bg-mango-500"}`} style={{ width: `${score}%` }} /></div>
                            <span className="text-xs font-semibold">{score}</span>
                          </div>
                        </td>
                        <td className="price px-3 py-3.5">{(640 + i * 413).toLocaleString("en-PH")}</td>
                        <td className="price px-3 py-3.5 font-semibold">{11 + i * 5}</td>
                        <td className="px-6 py-3.5 text-right">
                          {l.featured ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-mango-300/35 px-2.5 py-1 text-xs font-semibold text-mango-700"><Sparkles className="size-3.5" />Featured, 6 days left</span>
                          ) : (
                            <button className="rounded-full px-3 py-1.5 text-xs font-semibold text-sea-900 ring-1 ring-line hover:bg-mist">Feature for 50 credits</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <p className="text-xs text-ink-soft">Sample data for demonstration.</p>
        </div>
      </div>
    </div>
  );
}
