"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, CheckCircle2, Clock, Languages, MessageCircle, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons";
import type { PhAgent } from "@/lib/ph/listings";
import { leadHref, offClass, offProps, PREVIEW_CONTACT_NOTE, STATIC_PREVIEW } from "@/lib/ph/preview";
import { COMPUTATION_EVENT, type ComputationRequest } from "./amortization-calculator";

const LICENSE_LABEL = { REAL_ESTATE_BROKER: "Licensed real estate broker", REAL_ESTATE_SALESPERSON: "Accredited real estate salesperson" } as const;

/**
 * Sticky agent card: Viber (primary in the Philippines), WhatsApp, call, and
 * an inquiry form. When the buyer presses "Request sample computation" in the
 * calculator, the form switches to a computation request with those figures.
 */
export function ContactCard({ agent, listingId, listingTitle }: { agent: PhAgent; listingId: string; listingTitle: string }) {
  const [computation, setComputation] = useState<ComputationRequest | null>(null);
  const [message, setMessage] = useState(`Hi ${agent.name.split(" ")[0]}, I'm interested in "${listingTitle}". Is it still available?`);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const onRequest = (e: Event) => {
      const d = (e as CustomEvent<ComputationRequest>).detail;
      setComputation(d);
      setStatus("idle");
      setMessage(
        `Hi ${agent.name.split(" ")[0]}, please send me a sample computation for "${listingTitle}" with ${d.financingType === "PAGIBIG" ? "Pag-IBIG" : "bank"} financing: ${d.downpaymentPercent}% downpayment, ${d.termYears}-year term, rate fixed for ${d.fixingYears} ${d.fixingYears === 1 ? "year" : "years"}.`,
      );
    };
    window.addEventListener(COMPUTATION_EVENT, onRequest);
    return () => window.removeEventListener(COMPUTATION_EVENT, onRequest);
  }, [agent.name, listingTitle]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    // Client preview has no server: confirm without sending
    if (STATIC_PREVIEW) return setStatus("sent");
    const res = await fetch("/api/ph/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...data, consent: data.consent === "on", listingId, computation }),
    }).catch(() => null);
    if (res?.ok) return setStatus("sent");
    const body = await res?.json().catch(() => null);
    setError(body?.error ?? "Your inquiry could not be sent. Check your connection and try again.");
    setStatus("error");
  }

  const input = "h-11 w-full rounded-xl bg-mist px-3.5 text-sm text-ink placeholder:text-ink-soft/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-lagoon-500";

  return (
    <div id="inquire" className="scroll-mt-24 rounded-3xl bg-white p-6 shadow-[0_30px_70px_-35px_rgba(7,29,43,.45)] ring-1 ring-line">
      <div className="flex items-center gap-3.5">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-sea-900 text-lg font-bold text-white">{agent.initials}</span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-semibold text-sea-950">
            {agent.name} {agent.verified && <BadgeCheck className="size-4 text-lagoon-600" aria-label="Verified" />}
          </p>
          <p className="text-sm text-ink-soft">{agent.agency}</p>
        </div>
      </div>
      <dl className="mt-4 space-y-1.5 rounded-2xl bg-mist p-3.5 text-xs text-ink-soft">
        <div className="flex justify-between gap-3"><dt>{LICENSE_LABEL[agent.licenseType]}</dt><dd className="font-semibold text-ink">{agent.license}</dd></div>
        <div className="flex items-center gap-1.5"><Languages className="size-3.5" /><dd>{agent.languages.join(", ")}</dd></div>
        <div className="flex items-center gap-1.5"><Clock className="size-3.5" /><dd>{agent.replyTime}</dd></div>
        {!agent.verified && <p className="pt-1 font-medium text-coral-600">Licence not yet verified by Go Search Property.</p>}
      </dl>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <a href={leadHref("viber", listingId)} rel="nofollow" className={`flex h-11 items-center justify-center gap-2 rounded-full bg-viber text-sm font-semibold text-white transition hover:brightness-110${offClass}`} {...offProps}>
          <MessageCircle className="size-4" /> Viber
        </a>
        <a href={leadHref("whatsapp", listingId)} rel="nofollow" className={`flex h-11 items-center justify-center gap-2 rounded-full bg-whatsapp text-sm font-semibold text-white transition hover:brightness-110${offClass}`} {...offProps}>
          <WhatsAppIcon className="size-4" /> WhatsApp
        </a>
      </div>
      <a href={STATIC_PREVIEW ? undefined : `tel:${agent.mobile}`} className={`mt-2 flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold text-sea-900 ring-1 ring-line transition hover:bg-mist${offClass}`} {...offProps}>
        <Phone className="size-4" /> Call {agent.mobile.replace(/^\+63(\d{3})(\d{3})(\d{4})$/, "+63 $1 $2 $3")}
      </a>

      {STATIC_PREVIEW && <p className="mt-2 text-center text-xs text-ink-soft">{PREVIEW_CONTACT_NOTE}.</p>}

      <div className="my-5 flex items-center gap-3 text-xs text-ink-soft"><span className="h-px flex-1 bg-line" />{computation ? "Request a sample computation" : "or send an inquiry"}<span className="h-px flex-1 bg-line" /></div>

      {status === "sent" ? (
        <div className="flex gap-3 rounded-2xl bg-lagoon-50 p-4 text-sm text-ink">
          <CheckCircle2 className="size-5 shrink-0 text-lagoon-600" />
          <p>
            {STATIC_PREVIEW ? (
              <>
                <span className="font-semibold">Preview only.</span> On the live site this {computation ? "computation request" : "inquiry"} goes to {agent.name.split(" ")[0]}; here nothing was sent.
              </>
            ) : (
              <>
                <span className="font-semibold">{computation ? "Computation requested." : "Inquiry sent."}</span> {agent.name.split(" ")[0]} will reply by email or mobile. {agent.replyTime}.
              </>
            )}
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-2.5">
          {/* Honeypot: hidden from people, filled in by bots; the server drops those submissions */}
          <input name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] size-px opacity-0" />
          <input name="name" required placeholder="Full name" aria-label="Full name" autoComplete="name" className={input} />
          <input name="email" type="email" required placeholder="Email" aria-label="Email" autoComplete="email" className={input} />
          <input name="mobile" type="tel" placeholder="Mobile, e.g. +63 917 …" aria-label="Mobile number" autoComplete="tel" className={input} />
          <textarea name="message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} aria-label="Message" className="w-full rounded-xl bg-mist p-3.5 text-sm text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-lagoon-500" />
          <label className="flex items-start gap-2.5 py-1 text-xs leading-relaxed text-ink-soft">
            <input type="checkbox" name="consent" required className="mt-0.5 size-4 accent-[var(--color-sea-900)]" />
            I agree to share these details with this agent so they can reply, under the Data Privacy Act of 2012.
          </label>
          {status === "error" && <p className="text-sm font-medium text-coral-600">{error}</p>}
          <button disabled={status === "sending"} className="h-12 w-full rounded-full bg-sea-900 text-sm font-semibold text-white transition hover:bg-sea-800 disabled:opacity-60">
            {status === "sending" ? "Sending…" : computation ? "Request sample computation" : "Send inquiry"}
          </button>
        </form>
      )}
    </div>
  );
}
