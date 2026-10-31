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
      <li>On your device: your preferred display currency, kept in your browser only.</li>
    </ul>,
  ],
  [
    "Why we use it",
    <>
      To pass your inquiry to the agent of the listing you chose so they can reply, to prepare the computation you asked for, and to protect the site from abuse. We process inquiry details on the basis of your consent, which you give with the checkbox on the form.
    </>,
  ],
  [
    "Who we share it with",
    <>
      Only the licensed agent or agency handling the listing, and the service providers that host our website and database under contract. We do not sell your data or use it for advertising.
    </>,
  ],
  [
    "How long we keep it",
    <>
      Inquiry details are kept for {RETENTION_MONTHS} months, then your name, contact details and message are erased automatically. We keep only anonymous counts (for example, how many inquiries a listing received).
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
  return <LegalPage title="Privacy notice" intro="How we handle your personal data when you use Go Search Property." updated="31 October 2026" sections={sections} />;
}
