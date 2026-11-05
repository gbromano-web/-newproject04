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
        Go Search Property is a listing portal. It shows properties for sale and for rent in the Philippines and the United Arab Emirates that licensed real estate brokers and accredited salespersons publish, and passes your inquiries to them.
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
      <p>
        In the UAE, agents must be registered with the regulator of the emirate where the property is, and listings in Dubai, Abu Dhabi and Ras Al Khaimah must show that emirate&apos;s advertising permit. Before paying anything, check the broker and the permit with the emirate&apos;s land department or regulator, confirm whether the property is freehold for your nationality, and, for off-plan projects, make sure payments go to the project&apos;s registered escrow account.
      </p>
    </>,
  ],
  [
    "Prices, conversions and calculators",
    <>
      <p>
        Prices are in Philippine pesos or UAE dirhams as set by the agent. Amounts shown in other currencies are estimates using Bangko Sentral ng Pilipinas reference rates and are for guidance only. Loan, mortgage and amortization figures from our calculators are estimates; the bank, Pag-IBIG Fund or developer sets the final terms.
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
    "Paid plans for agents",
    <>
      <p>
        Agents can use the free Starter plan or a paid plan (Pro or Brokerage), described on the <Link href="/pricing" className="font-semibold text-sea-900 underline">pricing page</Link>. Paid plans are subscriptions billed monthly or yearly in advance, in Philippine pesos for Philippine accounts and UAE dirhams for UAE accounts, plus VAT where it applies. Payments are handled by Stripe; we never see or store card details.
      </p>
      <p>
        A plan renews automatically at the end of each period until you cancel it. You can cancel at any time in Plan and billing, then Manage billing. Your plan then continues until the end of the period already paid, and the unused part is not refunded, except where the law requires a refund.
      </p>
      <p>
        If a payment fails we try again for a short time. If it still fails, or a plan ends, your account moves to the free plan. If you then have more live listings than that plan allows, we tell you in your dashboard and pause the newest ones after 14 days, unless you pause some yourself or choose a plan. Paused listings are kept and can be published again.
      </p>
      <p>
        We will email you at least 30 days before we change the price of your plan or end a free offer you are on.
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
  return <LegalPage title="Terms of use" intro="The rules for using Go Search Property." updated="5 November 2026" sections={sections} />;
}
