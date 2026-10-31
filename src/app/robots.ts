import type { MetadataRoute } from "next";

/**
 * Real site: crawl everything except the API and the agent dashboard.
 * The static preview replaces this with a no-crawl robots.txt (scripts/build-preview.sh).
 */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard"] } };
}
