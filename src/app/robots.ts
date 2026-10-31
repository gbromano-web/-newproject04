import type { MetadataRoute } from "next";
import { SAMPLE_DATA } from "@/lib/ph/preview";

/**
 * Real site: crawl everything except the API and the agent dashboard.
 * The static preview replaces this with a no-crawl robots.txt (scripts/build-preview.sh).
 */
export default function robots(): MetadataRoute.Robots {
  // Sample listings must never be indexed under the brand's domain
  if (SAMPLE_DATA) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard"] } };
}
