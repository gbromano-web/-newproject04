import type { Metadata } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { PreviewBanner } from "@/components/preview-banner";
import { STATIC_PREVIEW } from "@/lib/ph/preview";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CurrencyProvider } from "@/components/ph/currency";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
// Canonical and social links are built from this; a missing value in production points them at localhost
if (!process.env.NEXT_PUBLIC_SITE_URL && process.env.NODE_ENV === "production") {
  console.warn("[config] NEXT_PUBLIC_SITE_URL is not set: canonical and share links will use http://localhost:3000");
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Go Search Property: Property for sale and rent in the Philippines", template: "%s | Go Search Property" },
  description: "Condominiums, house and lot, lots, pre-selling and foreclosed properties across the Philippines, listed by PRC and DHSUD-verified agents. Prices in pesos with conversion for international buyers.",
  openGraph: { siteName: "Go Search Property", type: "website", locale: "en_PH" },
  // The public preview holds sample data only: never index it
  ...(STATIC_PREVIEW && { robots: { index: false, follow: false, googleBot: { index: false, follow: false } } }),
};

// GitHub Pages cannot send security headers, so the static preview carries what
// a page can declare itself: a content policy, a referrer policy and a guard
// against being framed by another site (clickjacking).
const PREVIEW_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://images.unsplash.com",
  "font-src 'self'",
  "connect-src 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");
const FRAME_GUARD = "if (window.top !== window.self) { window.top.location.href = window.location.href; }";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      {STATIC_PREVIEW && (
        <head>
          <meta httpEquiv="Content-Security-Policy" content={PREVIEW_CSP} />
          <meta name="referrer" content="strict-origin-when-cross-origin" />
          <script dangerouslySetInnerHTML={{ __html: FRAME_GUARD }} />
        </head>
      )}
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
