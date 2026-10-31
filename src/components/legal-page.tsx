import { SITE } from "@/lib/site";

/** Shared layout for the Terms and Privacy pages. */
export function LegalPage({ title, intro, updated, sections }: { title: string; intro: string; updated: string; sections: [string, React.ReactNode][] }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      {!SITE.legalReviewed && (
        <p className="rounded-2xl bg-mango-500/15 px-4 py-3 text-sm text-sea-950 ring-1 ring-mango-500/30">
          This page is pending review by a Philippine lawyer and may change.
        </p>
      )}
      <h1 className="mt-8 text-3xl font-bold leading-tight text-sea-950 sm:text-[44px]">{title}</h1>
      <p className="mt-3 text-[16px] leading-relaxed text-ink-soft">{intro}</p>
      <p className="mt-2 text-sm text-ink-soft">Last updated {updated}</p>
      <div className="mt-10 space-y-9">
        {sections.map(([heading, body]) => (
          <section key={heading}>
            <h2 className="text-xl font-bold text-sea-950">{heading}</h2>
            <div className="mt-2.5 space-y-3 text-[15px] leading-relaxed text-ink">{body}</div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function ContactEmail() {
  return (
    <a href={`mailto:${SITE.contactEmail}`} className="font-semibold text-sea-900 underline underline-offset-2 hover:text-lagoon-700">
      {SITE.contactEmail}
    </a>
  );
}

/** "Go Search Property" or "Go Search Property, <address>" once the address is filled in. */
export const operatorLine = () => (SITE.operatorAddress ? `${SITE.operator}, ${SITE.operatorAddress}` : SITE.operator);
