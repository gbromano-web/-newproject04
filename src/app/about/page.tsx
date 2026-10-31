import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Globe2, MessageCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description: "Go Search Property is a property portal for the Philippines and the UAE where every listing comes from a licensed broker.",
  alternates: { canonical: "/about" },
};

const POINTS = [
  {
    icon: BadgeCheck,
    title: "Licensed agents only",
    body: "Every agent shows a number you can check: a PRC licence or DHSUD accreditation in the Philippines, a broker registration with the emirate's regulator in the UAE.",
  },
  {
    icon: Globe2,
    title: "Built for buyers abroad",
    body: "Prices in pesos or dirhams with a second currency beside them, and clear notes on which properties foreigners can own.",
  },
  {
    icon: MessageCircle,
    title: "Talk the way you already do",
    body: "Message the agent on WhatsApp (or Viber in the Philippines), or send an inquiry and get a sample computation with your own figures.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-bold leading-tight text-sea-950 sm:text-[44px]">About Go Search Property</h1>
      <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-soft">
        Go Search Property helps people find homes, land and commercial space across the Philippines and all seven emirates of the UAE, and reach the licensed professionals who list them.
      </p>
      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {POINTS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-2xl bg-white p-6 ring-1 ring-line">
            <Icon className="size-6 text-lagoon-600" />
            <h2 className="mt-4 font-bold text-sea-950">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
          </div>
        ))}
      </div>
      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/search" className="rounded-full bg-sea-900 px-5 py-3 text-sm font-semibold text-white hover:bg-sea-800">Search properties</Link>
        <Link href="/contact" className="rounded-full px-5 py-3 text-sm font-semibold text-sea-900 ring-1 ring-line hover:bg-mist">Contact us</Link>
      </div>
    </div>
  );
}
