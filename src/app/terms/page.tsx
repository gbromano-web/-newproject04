import type { Metadata } from "next";
import Link from "next/link";
import { ContactEmail, LegalPage, operatorLine } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The terms for using Go Search Property, a property listing portal for the Philippines.",
  alternates: { canonical: "/terms" },
};

const sections: [string, React.ReactNode][] = [
  [
    "About these terms",
    <>
      <p>
        Go Search Property (gosearchproperty.com) is operated by {operatorLine()}. By using the site you agree to these terms. If you do not agree, please do not use the site.
      </p>
    </>,
  ],
  [
    "What the site is",
    <>
      <p>
        Go Search Property is a listing portal. It shows properties for sale and for rent in the Philippines that licensed real estate brokers and accredited salespersons publish, and passes your inquiries to them.
      </p>
      <p>
        We are not a party to any sale, lease or reservation. We do not act as your broker or agent, hold deposits or reservation fees, or give legal, tax or financial advice. Deal directly with the listing agent, and never pay anyone through a link or account you cannot verify.
      </p>
    </>,
  ],
  [
    "Listings and agents",
    <>
      <p>
        Agents are responsible for their listings, including price, availability, size, title status, photos and any claims about foreign ownership eligibility. We check that agents show a PRC licence number (brokers) or DHSUD accreditation and a supervising broker (salespersons), as required by the Real Estate Service Act (Republic Act No. 9646), but we do not inspect properties or verify every detail.
      </p>
      <p>
        Before paying anything, check the title with the Registry of Deeds, confirm the agent&apos;s licence on the PRC website, and, for pre-selling projects, confirm the developer&apos;s DHSUD licence to sell.
      </p>
    </>,
  ],
  [
    "Prices, conversions and calculators",
    <>
      <p>
        Prices are in Philippine pesos as set by the agent. Amounts shown in other currencies are estimates using Bangko Sentral ng Pilipinas reference rates and are for guidance only. Loan and amortization figures from our calculators are estimates; the bank, Pag-IBIG Fund or developer sets the final terms.
      </p>
    </>,
  ],
  [
    "Inquiries",
    <>
      <p>
        When you send an inquiry or tap Viber or WhatsApp, the details you give are shared with the listing agent so they can reply. How we handle your personal data is explained in our <Link href="/privacy" className="font-semibold text-sea-900 underline underline-offset-2">Privacy notice</Link>.
      </p>
    </>,
  ],
  [
    "Acceptable use",
    <>
      <p>
        Do not post or send false, misleading or unlawful content, impersonate anyone, collect agents&apos; or buyers&apos; contact details for marketing, copy listings in bulk, or interfere with the site&apos;s security or operation. We may remove listings or close accounts that break these terms or the law.
      </p>
    </>,
  ],
  [
    "Our liability",
    <>
      <p>
        We provide the site as it is and work to keep it accurate and available, but we cannot promise that listings are complete, current or error-free, or that the site will always be available. To the extent the law allows, we are not liable for losses arising from a transaction between you and an agent, seller, lessor or developer.
      </p>
    </>,
  ],
  [
    "Changes and governing law",
    <>
      <p>
        We may update these terms; the date above shows the latest version. These terms are governed by the laws of the Republic of the Philippines.
      </p>
    </>,
  ],
  [
    "Contact",
    <>
      <p>
        Questions about these terms: <ContactEmail />.
      </p>
    </>,
  ],
];

export default function TermsPage() {
  return <LegalPage title="Terms of use" intro="The rules for using Go Search Property." updated="31 October 2026" sections={sections} />;
}
