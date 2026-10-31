import type { MetadataRoute } from "next";
import { SAMPLE_DATA } from "@/lib/ph/preview";

/**
 * Real site: crawl everything except the API and the agent area.
 * The static preview replaces this with a no-crawl robots.txt (scripts/build-preview.sh).
 */
export default function robots(): MetadataRoute.Robots {
  // Sample listings must never be indexed under the brand's domain
  if (SAMPLE_DATA) return { rules: { userAgent: "*", disallow: "/" } };
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://gosearchproperty.com").replace(/\/$/, "");
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard", "/agent/", "/auth/", "/saved"] },
    sitemap: `${site}/sitemap.xml`,
  };
}
