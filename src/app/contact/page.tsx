import type { Metadata } from "next";
import { Building2, Mail, UserRoundCheck } from "lucide-react";
import { ContactEmail } from "@/components/legal-page";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Go Search Property: questions, agent verification, and advertising for developers.",
  alternates: { canonical: "/contact" },
};

const mailto = (subject: string) => `mailto:${SITE.contactEmail}?subject=${encodeURIComponent(subject)}`;

const TOPICS = [
  {
    id: "buyers",
    icon: Mail,
    title: "Questions about a listing",
    body: "The fastest answer comes from the listing agent: use the Viber, WhatsApp or inquiry buttons on the property page. For anything else, email us.",
    cta: "Email us",
    subject: "Question",
  },
  {
    id: "agents",
    icon: UserRoundCheck,
    title: "Agents: get verified",
    body: "Brokers send their PRC licence number; salespersons send their DHSUD accreditation and supervising broker. Once checked, we invite you to your agent account.",
    cta: "Apply as an agent",
    subject: "Agent verification",
  },
  {
    id: "developers",
    icon: Building2,
    title: "Developers: advertise a project",
    body: "Feature a project on the homepage and in search, with your DHSUD licence to sell shown on every listing.",
    cta: "Ask about advertising",
    subject: "Advertising a project",
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-bold leading-tight text-sea-950 sm:text-[44px]">Contact us</h1>
      <p className="mt-4 text-[17px] text-ink-soft">
        Email <ContactEmail />. We usually reply within one business day.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {TOPICS.map(({ id, icon: Icon, title, body, cta, subject }) => (
          <section key={id} id={id} className="flex scroll-mt-24 flex-col rounded-2xl bg-white p-6 ring-1 ring-line">
            <Icon className="size-6 text-lagoon-600" />
            <h2 className="mt-4 font-bold text-sea-950">{title}</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">{body}</p>
            <a href={mailto(subject)} className="mt-5 self-start rounded-full bg-sea-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sea-800">{cta}</a>
          </section>
        ))}
      </div>
    </div>
  );
}
