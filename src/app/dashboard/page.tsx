import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  BarChart3, Building2, CirclePlus, Eye, Inbox, LayoutDashboard, Mail, Megaphone, Phone, PhoneCall, Settings, Sparkles, Users,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons";
import { getAgency, getAgent, properties } from "@/lib/mock-data";
import { formatAED, priceSuffix } from "@/lib/search";

export const metadata: Metadata = { title: "Agent dashboard", robots: { index: false } };

// Demo: the signed-in agency is Creekside Properties (ag1).
const AGENCY_ID = "ag1";

type Channel = "whatsapp" | "call" | "email" | "callback";
const leads: { name: string; listing: string; channel: Channel; when: string; status: "New" | "Contacted" | "Viewing booked" }[] = [
  { name: "Ahmed R.", listing: "p1", channel: "whatsapp", when: "8 min ago", status: "New" },
  { name: "Sarah K.", listing: "p3", channel: "email", when: "42 min ago", status: "New" },
  { name: "Vikram S.", listing: "p9", channel: "call", when: "1 h ago", status: "Contacted" },
  { name: "Noura A.", listing: "p2", channel: "callback", when: "3 h ago", status: "Viewing booked" },
  { name: "James T.", listing: "p8", channel: "whatsapp", when: "5 h ago", status: "Contacted" },
  { name: "Mei L.", listing: "p1", channel: "whatsapp", when: "Yesterday", status: "Viewing booked" },
];

const week = [
  { d: "Tue", whatsapp: 14, call: 5, email: 4 },
  { d: "Wed", whatsapp: 18, call: 6, email: 3 },
  { d: "Thu", whatsapp: 11, call: 4, email: 5 },
  { d: "Fri", whatsapp: 9, call: 3, email: 2 },
  { d: "Sat", whatsapp: 21, call: 7, email: 6 },
  { d: "Sun", whatsapp: 24, call: 8, email: 5 },
  { d: "Mon", whatsapp: 19, call: 6, email: 4 },
];

const channelMeta: Record<Channel, { label: string; icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  whatsapp: { label: "WhatsApp", icon: WhatsAppIcon, cls: "text-whatsapp bg-green-50" },
  call: { label: "Call", icon: Phone, cls: "text-creek-700 bg-creek-50" },
  email: { label: "Email", icon: Mail, cls: "text-date-700 bg-amber-50" },
  callback: { label: "Callback", icon: PhoneCall, cls: "text-purple-700 bg-purple-50" },
};

const statusCls = { New: "bg-date-500/20 text-date-700", Contacted: "bg-mist text-ink-soft", "Viewing booked": "bg-creek-50 text-creek-700" };

export default function DashboardPage() {
  const agency = getAgency(AGENCY_ID);
  const listings = properties.filter((p) => getAgent(p.agentId).agencyId === AGENCY_ID);
  const totalLeads = week.reduce((s, d) => s + d.whatsapp + d.call + d.email, 0);
  const waShare = Math.round((week.reduce((s, d) => s + d.whatsapp, 0) / totalLeads) * 100);
  const max = Math.max(...week.map((d) => d.whatsapp + d.call + d.email));

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
    <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <div className="sticky top-20 space-y-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg font-bold text-white" style={{ background: agency.color }}>{agency.shortName}</span>
            <div>
              <p className="text-sm font-bold leading-tight">{agency.name}</p>
              <p className="text-xs text-ink-soft">{agency.reraOrn}</p>
            </div>
          </div>
          <nav className="space-y-1">
            {nav.map(({ icon: Icon, label, active, badge }) => (
              <a key={label} href="#" className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${active ? "bg-creek-700 text-white" : "text-ink-soft hover:bg-mist"}`}>
                <Icon className="size-4" /> {label}
                {badge && <span className="ml-auto rounded-full bg-date-500 px-1.5 text-xs font-bold text-creek-900">{badge}</span>}
              </a>
            ))}
          </nav>
          <div className="rounded-xl bg-creek-50 p-4 text-sm">
            <p className="font-semibold">Promotion credits</p>
            <p className="mt-1 text-ink-soft">340 of 500 left this month</p>
            <div className="mt-2 h-2 rounded-full bg-white"><div className="h-2 w-[68%] rounded-full bg-creek-500" /></div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Good afternoon, Layla</h1>
            <p className="text-ink-soft">You have 2 new leads waiting for a reply.</p>
          </div>
          <button className="flex items-center gap-2 rounded-full bg-creek-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-creek-900">
            <CirclePlus className="size-4" /> Create listing
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Active listings", value: listings.length, note: "1 awaiting permit check" },
            { label: "Leads, last 7 days", value: totalLeads, note: "Up 18% on the week before" },
            { label: "Leads via WhatsApp", value: `${waShare}%`, note: "Your fastest-growing channel" },
            { label: "Median reply time", value: "14 min", note: "SuperAgent target: under 30 min" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-line p-4">
              <p className="text-sm text-ink-soft">{s.label}</p>
              <p className="mt-1 font-display text-3xl font-bold">{s.value}</p>
              <p className="mt-1 text-xs text-ink-soft">{s.note}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <section className="rounded-xl border border-line p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold">Leads by channel</h2>
              <ul className="flex gap-4 text-xs text-ink-soft">
                <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-whatsapp" />WhatsApp</li>
                <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-creek-500" />Call</li>
                <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-date-500" />Email</li>
              </ul>
            </div>
            <div className="mt-6 flex h-80 items-end gap-3">
              {week.map((d) => {
                const total = d.whatsapp + d.call + d.email;
                return (
                  <div key={d.d} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-xs font-semibold">{total}</span>
                    <div className="flex w-full max-w-10 flex-col-reverse overflow-hidden rounded-md" style={{ height: `${(total / max) * 270}px` }}>
                      <div className="bg-whatsapp" style={{ flex: d.whatsapp }} />
                      <div className="bg-creek-500" style={{ flex: d.call }} />
                      <div className="bg-date-500" style={{ flex: d.email }} />
                    </div>
                    <span className="text-xs text-ink-soft">{d.d}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-line p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Latest leads</h2>
              <a href="#" className="text-sm font-semibold text-creek-700 hover:underline">Open inbox</a>
            </div>
            <ul className="mt-3 divide-y divide-line">
              {leads.map((l, i) => {
                const m = channelMeta[l.channel];
                const listing = properties.find((p) => p.id === l.listing)!;
                return (
                  <li key={i} className="flex items-center gap-3 py-2.5">
                    <span className={`grid size-8 shrink-0 place-items-center rounded-full ${m.cls}`} title={m.label}><m.icon className="size-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{l.name}</p>
                      <p className="truncate text-xs text-ink-soft">{listing.title}</p>
                    </div>
                    <div className="text-right">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${statusCls[l.status]}`}>{l.status}</span>
                      <p className="mt-0.5 text-xs text-ink-soft">{l.when}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <section className="rounded-xl border border-line">
          <div className="flex items-center justify-between p-5 pb-3">
            <h2 className="text-lg font-bold">Your listings</h2>
            <div className="flex gap-1 rounded-full bg-mist p-1 text-xs font-semibold">
              <span className="rounded-full bg-white px-3 py-1 shadow-sm">Live ({listings.length})</span>
              <span className="px-3 py-1 text-ink-soft">Drafts (2)</span>
              <span className="px-3 py-1 text-ink-soft">Expired (1)</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-y border-line bg-mist text-left text-xs text-ink-soft">
                <tr>
                  <th className="px-5 py-2 font-semibold">Listing</th>
                  <th className="px-3 py-2 font-semibold">Price</th>
                  <th className="px-3 py-2 font-semibold">Quality score</th>
                  <th className="px-3 py-2 font-semibold"><Eye className="inline size-3.5" /> Views</th>
                  <th className="px-3 py-2 font-semibold">Leads</th>
                  <th className="px-5 py-2 text-right font-semibold">Promotion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {listings.map((p, i) => {
                  const score = [92, 78, 88, 64, 95, 81][i % 6];
                  return (
                    <tr key={p.id}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-11 w-16 shrink-0 overflow-hidden rounded-md">
                            <Image src={p.images[0]} alt="" fill sizes="64px" className="object-cover" />
                          </div>
                          <div className="min-w-0">
                            <Link href={`/property/${p.slug}`} className="line-clamp-1 font-semibold hover:text-creek-700">{p.title}</Link>
                            <p className="text-xs text-ink-soft">{p.location.community}, permit {p.permitNumber}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-semibold">AED {formatAED(p.price)}<span className="font-normal text-ink-soft">{priceSuffix(p)}</span></td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-mist"><div className={`h-1.5 rounded-full ${score >= 80 ? "bg-creek-500" : "bg-date-500"}`} style={{ width: `${score}%` }} /></div>
                          <span className="text-xs font-semibold">{score}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">{formatAED(420 + i * 377)}</td>
                      <td className="px-3 py-3 font-semibold">{9 + i * 4}</td>
                      <td className="px-5 py-3 text-right">
                        {p.featured ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-date-500 px-2 py-1 text-xs font-bold text-creek-900"><Sparkles className="size-3.5" />Featured, 6 days left</span>
                        ) : (
                          <button className="rounded-md border border-creek-700 px-3 py-1 text-xs font-semibold text-creek-700 hover:bg-creek-50">Feature for 50 credits</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
