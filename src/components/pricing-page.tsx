import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, BadgeCheck, Check, Minus, Sparkles } from "lucide-react";
import { RememberMarket } from "@/components/market-nav";
import { Flag } from "@/components/flags";
import { MARKETS, type CountryCode } from "@/lib/markets";
import { LAUNCH_OFFER, PLANS, VAT, planPrice, type Plan } from "@/lib/plans";

/** Agent plans for one country: /pricing (Philippines) and /uae/pricing. Prices come from src/lib/plans.ts. */
export function PricingPage({ country }: { country: CountryCode }) {
  const plans = PLANS[country];
  const ae = country === "AE";
  const other: CountryCode = ae ? "PH" : "AE";
  const licence = ae ? "broker registration (BRN) with the emirate's regulator" : "PRC licence or DHSUD accreditation";

  const rows: { label: string; value: (p: Plan) => string | boolean }[] = [
    { label: "Active listings", value: (p) => String(p.listings) },
    { label: "Photos per listing", value: () => "30" },
    { label: "Featured listings a month", value: (p) => (p.featuredPerMonth ? String(p.featuredPerMonth) : false) },
    { label: ae ? "Brokers in the account" : "Agents in the account", value: (p) => String(p.seats) },
    { label: "Verified licence badge", value: () => true },
    { label: ae ? "WhatsApp and inquiry leads" : "Viber, WhatsApp and inquiry leads", value: () => true },
    { label: "Lead dashboard", value: () => true },
    { label: "Support", value: (p) => (p.id === "broker" ? "Priority" : p.id === "pro" ? "Email" : "Help pages") },
  ];

  const faq: [string, string][] = [
    [
      "Who can join?",
      `Licensed professionals only. When you sign up we check your ${licence} before your listings go live, so buyers can trust every number they see.`,
    ],
    [
      "What does the launch offer include?",
      `Every verified agent gets the Pro plan free until ${LAUNCH_OFFER.label}. No card is needed. We will email you at least 30 days before any paid plan starts, and you can choose a plan or stay on Starter then.`,
    ],
    ["What is a featured listing?", "A featured listing is shown ahead of the others in search results (the default \"Featured\" order) for 30 days. Your monthly featured listings renew each month."],
    ["Can I change or cancel my plan?", "Yes. Plans are monthly or yearly with no long contract. Moving down a plan takes effect at the end of the period you paid for."],
    [
      "Are prices with VAT?",
      `Prices are shown before VAT. Where it applies, ${ae ? "UAE VAT of 5%" : "Philippine VAT of 12%"} is added to the invoice.`,
    ],
    [
      ae ? "Do I need an advertising permit?" : "Do salespersons need their own plan?",
      ae
        ? "In Dubai, Abu Dhabi and Ras Al Khaimah, yes: each listing needs the emirate's advertising permit (Trakheesi, Madhmoun or RAK RERA) before it can be published. The listing form asks for it."
        : "No. On the Brokerage plan a PRC broker can add up to 5 agents, including DHSUD-accredited salespersons working under them.",
    ],
  ];

  return (
    <div className="bg-mist/50">
      <RememberMarket code={country} />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-sea-900 ring-1 ring-line">
            <Flag code={country} className="h-3.5 w-5" /> {MARKETS[country].name}
          </p>
          <h1 className="mt-5 text-3xl font-bold leading-tight tracking-[-0.02em] text-sea-950 sm:text-[44px]">Plans for {ae ? "brokers" : "agents and brokers"}</h1>
          <p className="mt-4 text-[17px] leading-relaxed text-ink-soft">
            List your properties where buyers {ae ? "in the UAE and abroad" : "in the Philippines and abroad"} search, with prices in {ae ? "dirhams" : "pesos"} and their own currency beside them. Every plan includes leads straight to your phone.
          </p>
          <Link href={MARKETS[other].home === "/" ? "/pricing" : "/uae/pricing"} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-sea-900 hover:text-lagoon-700">
            <Flag code={other} className="h-3 w-4" /> Prices for {MARKETS[other].name} <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="mx-auto mt-10 flex max-w-3xl items-start gap-3 rounded-2xl bg-lagoon-50 px-5 py-4 text-sm text-lagoon-800 ring-1 ring-lagoon-600/20">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-lagoon-600" />
          <p>
            <span className="font-semibold">Launch offer:</span> every verified agent gets <span className="font-semibold">Pro free until {LAUNCH_OFFER.label}</span>. No card needed; we email you at least 30 days before any charge.
          </p>
        </div>

        <ul className="mt-10 grid gap-6 lg:grid-cols-3" aria-label="Plans">
          {plans.map((p) => (
            <li key={p.id} className={clsx("relative flex flex-col rounded-3xl bg-white p-7 ring-1", p.highlight ? "shadow-lg ring-2 ring-sea-900" : "ring-line")}>
              {p.highlight && <span className="absolute -top-3 left-7 rounded-full bg-sea-900 px-3 py-1 text-xs font-semibold text-white">Most popular</span>}
              <h2 className="text-xl font-bold text-sea-950">{p.name}</h2>
              <p className="mt-1 text-sm text-ink-soft">{p.tagline}</p>
              <p className="mt-6 flex items-baseline gap-1.5">
                <span className="price text-4xl font-bold tracking-[-0.03em] text-sea-950">{planPrice(p.monthly, country)}</span>
                {p.monthly > 0 && <span className="text-sm text-ink-soft">/ month</span>}
              </p>
              <p className="mt-1 h-5 text-sm text-ink-soft">
                {p.yearly > 0 ? <>or <span className="price font-semibold text-sea-900">{planPrice(p.yearly, country)}</span> a year (2 months free)</> : "Always free"}
              </p>
              {p.id === "pro" && <p className="mt-2 text-sm font-semibold text-lagoon-700">Free until {LAUNCH_OFFER.label}</p>}
              <ul className="mt-6 space-y-2.5 text-sm text-ink">
                <li className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-lagoon-600" /><span><span className="font-semibold">{p.listings} active listings</span>{p.seats > 1 && <>, {p.seats} {ae ? "brokers" : "agents"}</>}</span></li>
                {p.includes.map((f) => (
                  <li key={f} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-lagoon-600" /><span>{f}</span></li>
                ))}
              </ul>
              <div className="mt-auto pt-8">
                <a
                  href={p.cta.href}
                  className={clsx(
                    "block rounded-full px-5 py-3 text-center text-sm font-semibold",
                    p.highlight ? "bg-sea-900 text-white hover:bg-sea-800" : "text-sea-900 ring-1 ring-line hover:bg-mist",
                  )}
                >
                  {p.cta.label}
                </a>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-center text-sm text-ink-soft">
          Prices before VAT ({VAT[country]}% where it applies). {ae ? "Dirhams (AED)." : "Philippine pesos (PHP)."}
        </p>

        <section className="mt-16 overflow-hidden rounded-3xl bg-white ring-1 ring-line" aria-labelledby="compare-h">
          <h2 id="compare-h" className="p-6 pb-2 text-lg font-bold text-sea-950 sm:p-8 sm:pb-2">Compare plans</h2>
          <div className="overflow-x-auto px-2 pb-4 sm:px-4">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-ink-soft">
                  <th className="px-4 py-3 font-semibold"><span className="sr-only">Feature</span></th>
                  {plans.map((p) => <th key={p.id} scope="col" className="px-4 py-3 text-center font-semibold text-sea-950">{p.name}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                <tr>
                  <th scope="row" className="px-4 py-3 text-left font-medium text-ink">Price a month</th>
                  {plans.map((p) => <td key={p.id} className="price px-4 py-3 text-center font-semibold text-sea-950">{planPrice(p.monthly, country)}</td>)}
                </tr>
                {rows.map((r) => (
                  <tr key={r.label}>
                    <th scope="row" className="px-4 py-3 text-left font-medium text-ink">{r.label}</th>
                    {plans.map((p) => {
                      const v = r.value(p);
                      return (
                        <td key={p.id} className="px-4 py-3 text-center text-ink">
                          {v === true ? <Check className="mx-auto size-4 text-lagoon-600" aria-label="Included" /> : v === false ? <Minus className="mx-auto size-4 text-line" aria-label="Not included" /> : v}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-3xl" aria-labelledby="faq-h">
          <h2 id="faq-h" className="text-2xl font-bold text-sea-950">Questions</h2>
          <div className="mt-6 divide-y divide-line rounded-2xl bg-white ring-1 ring-line">
            {faq.map(([q, a]) => (
              <details key={q} className="group px-6 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-sea-950">
                  {q}
                  <span className="text-xl leading-none text-ink-soft transition-transform group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{a}</p>
              </details>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-center gap-3 rounded-3xl bg-sea-950 px-6 py-10 text-center text-white">
            <BadgeCheck className="size-8 text-lagoon-300" />
            <p className="text-xl font-bold">Ready to list?</p>
            <p className="max-w-md text-sm text-white/75">Create your account, we check your licence, and your listings go live with Pro free until {LAUNCH_OFFER.label}.</p>
            <Link href="/agent/sign-up" className="mt-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-sea-950 hover:bg-mist">Create an agent account</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
