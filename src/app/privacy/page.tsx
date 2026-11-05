import type { Metadata } from "next";
import { ContactEmail, LegalPage, operatorLine } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: "How Go Search Property collects, uses, shares and keeps your personal data, and how to exercise your rights under the Philippine Data Privacy Act of 2012 and the UAE Personal Data Protection Law.",
  alternates: { canonical: "/privacy" },
};

// Keep in step with purge_old_leads() in prisma/sql/postgis.sql
const RETENTION_MONTHS = 24;

const sections: [string, React.ReactNode][] = [
  [
    "Who we are",
    <>
      Go Search Property is operated by {operatorLine()}, the personal information controller for this website. Our Data Protection Officer can be reached at <ContactEmail />.
    </>,
  ],
  [
    "What we collect",
    <ul key="collect" className="list-disc space-y-1.5 pl-5">
      <li>When you send an inquiry or request a sample computation: your name, email, mobile number (optional), message, and the financing figures you chose.</li>
      <li>When you tap Viber or WhatsApp on a listing: which listing and agent, and your browser type. The conversation itself happens in that app, not on our site.</li>
      <li>For security: a one-way, salted code made from your IP address, used to stop spam. We do not store your IP address itself.</li>
      <li>On your device: your preferred display currency and country, kept in your browser only (the country choice also in a cookie, so the home page opens for that country).</li>
      <li>From agents: name, mobile, licence or broker registration numbers, brokerage, listings and photos, and, on a paid plan, billing name, address, tax number and plan history. Card details are entered on Stripe&apos;s page and never reach us; we receive only the card brand and last four digits.</li>
    </ul>,
  ],
  [
    "Why we use it",
    <>
      To pass your inquiry to the agent of the listing you chose so they can reply, to prepare the computation you asked for, and to protect the site from abuse. We process inquiry details on the basis of your consent, which you give with the checkbox on the form. For agents, we process account, licence and billing details to provide the service they signed up for, to check their licence, and to keep the tax and accounting records the law requires.
    </>,
  ],
  [
    "Who we share it with",
    <>
      Only the licensed agent or agency handling the listing, and the service providers that run the site for us under contract: Vercel (website hosting), Supabase (database, sign-in and photo storage, in Ireland) and, for agents on a paid plan, Stripe (card payments and invoices). We do not sell your data or use it for advertising.
    </>,
  ],
  [
    "Data stored outside the Philippines and the UAE",
    <>
      Our database is in the European Union (Ireland), and our hosting and payment providers may process data in the United States and other countries. Each provider is bound by a contract to protect it to a standard at least equal to the Data Privacy Act and the UAE Personal Data Protection Law, and to use it only to provide its service to us. You can ask us for details of these safeguards at <ContactEmail />.
    </>,
  ],
  [
    "How long we keep it",
    <>
      Inquiry details are kept for {RETENTION_MONTHS} months, then your name, contact details and message are erased automatically. We keep only anonymous counts (for example, how many inquiries a listing received). Agents&apos; billing records and invoices are kept for as long as UAE and Philippine tax law requires.
    </>,
  ],
  [
    "Your rights",
    <>
      Under the Data Privacy Act of 2012 (Republic Act No. 10173) you may ask what data we hold about you, get a copy, have it corrected, object to its use, withdraw your consent, or have it erased. Write to <ContactEmail />; we will confirm your identity and respond as soon as possible. If you are not satisfied, you may complain to the National Privacy Commission at privacy.gov.ph.
      <br />
      <br />
      If you use the site in the United Arab Emirates, you have similar rights under Federal Decree-Law No. 45 of 2021 on the Protection of Personal Data, and you can contact us the same way.
    </>,
  ],
];

export default function PrivacyPage() {
  return <LegalPage title="Privacy notice" intro="How we handle your personal data when you use Go Search Property." updated="5 November 2026" sections={sections} />;
}
