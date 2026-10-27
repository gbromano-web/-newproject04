import type { Metadata } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { PreviewBanner } from "@/components/preview-banner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CurrencyProvider } from "@/components/ph/currency";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "SA Realty: Property for sale and rent in the Philippines", template: "%s | SA Realty" },
  description: "Condominiums, house and lot, lots, pre-selling and foreclosed properties across the Philippines, listed by PRC and DHSUD-verified agents. Prices in pesos with conversion for international buyers.",
  openGraph: { siteName: "SA Realty", type: "website", locale: "en_PH" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col">
        <CurrencyProvider>
          <PreviewBanner />
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </CurrencyProvider>
      </body>
    </html>
  );
}
