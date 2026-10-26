"use client";

import { useState } from "react";
import { BadgeCheck, CheckCircle2, Mail, Phone, Star } from "lucide-react";
import type { Agency, Agent } from "@/lib/types";
import { WhatsAppIcon } from "./icons";

export function LeadWidget({ listingId, listingTitle, agent, agency }: { listingId: string; listingTitle: string; agent: Agent; agency: Agency }) {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...data, listingId, channel: "email" }),
    }).catch(() => null);
    setPending(false);
    setSent(true);
  }

  const input = "h-11 w-full rounded-lg border border-line px-3 text-sm focus:border-creek-500 focus:outline-none";

  return (
    <div id="enquire" className="rounded-xl border border-line bg-white p-5 shadow-[0_18px_40px_-24px_rgba(8,52,58,.35)]">
      <div className="flex items-center gap-3">
        <span className="grid size-14 place-items-center rounded-full bg-creek-100 font-display text-lg font-bold text-creek-700">{agent.initials}</span>
        <div className="min-w-0">
          <p className="flex items-center gap-1 font-bold">
            {agent.name}
            {agent.superAgent && <Star className="size-4 fill-date-500 text-date-500" aria-label="SuperAgent" />}
          </p>
          <p className="text-sm text-ink-soft">{agent.title}</p>
          <p className="flex items-center gap-1 text-sm font-medium" style={{ color: agency.color }}>
            {agency.name} {agency.verified && <BadgeCheck className="size-4" aria-label="Verified agency" />}
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs text-ink-soft">Licence {agent.brn.replace("BRN ", "")}. Speaks {agent.languages.join(", ")}.</p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <a href={`/api/leads/whatsapp?listing=${listingId}`} className="flex h-11 items-center justify-center gap-2 rounded-lg bg-whatsapp text-sm font-semibold text-white hover:brightness-110">
          <WhatsAppIcon className="size-5" /> WhatsApp
        </a>
        <a href={`tel:${agent.phone.replace(/\s/g, "")}`} className="flex h-11 items-center justify-center gap-2 rounded-lg bg-creek-700 text-sm font-semibold text-white hover:bg-creek-900">
          <Phone className="size-4" /> Call
        </a>
      </div>

      <div className="my-4 flex items-center gap-3 text-xs text-ink-soft">
        <span className="h-px flex-1 bg-line" /> or send an enquiry <span className="h-px flex-1 bg-line" />
      </div>

      {sent ? (
        <div className="flex gap-3 rounded-lg bg-creek-50 p-4 text-sm">
          <CheckCircle2 className="size-5 shrink-0 text-creek-500" />
          <p><span className="font-semibold">Enquiry sent to {agent.name.split(" ")[0]}.</span> Agents on SA Realty usually reply within 2 hours.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-2">
          <input name="name" required placeholder="Full name" className={input} aria-label="Full name" />
          <input name="email" type="email" required placeholder="Email" className={input} aria-label="Email" />
          <input name="phone" type="tel" placeholder="Phone (+971)" className={input} aria-label="Phone" />
          <textarea name="message" rows={3} defaultValue={`Hi, I'm interested in "${listingTitle}". Is it still available?`} className="w-full rounded-lg border border-line p-3 text-sm focus:border-creek-500 focus:outline-none" aria-label="Message" />
          <button disabled={pending} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border-2 border-creek-700 text-sm font-semibold text-creek-700 hover:bg-creek-50 disabled:opacity-60">
            <Mail className="size-4" /> {pending ? "Sending…" : "Send enquiry"}
          </button>
          <label className="flex items-center gap-2 pt-1 text-xs text-ink-soft">
            <input type="checkbox" name="callback" className="accent-creek-700" /> Request a callback instead
          </label>
        </form>
      )}
    </div>
  );
}
