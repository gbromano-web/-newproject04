import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { SAMPLE_DATA } from "@/lib/ph/preview";
import { liveListingSlugs } from "@/lib/server/listings-repo";
import { log } from "@/lib/server/request";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://gosearchproperty.com").replace(/\/$/, "");
const PAGES = ["/", "/search", "/calculator", "/about", "/contact", "/terms", "/privacy"];

/** Public pages plus every live listing. Sample listings are never listed. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = PAGES.map((p) => ({ url: SITE + p, changeFrequency: p === "/" || p === "/search" ? "daily" : "monthly" }));
  if (SAMPLE_DATA) return pages;
  await connection(); // outside the try: the build stops here on purpose, which is not a failure
  try {
    const listings = await liveListingSlugs();
    return [...pages, ...listings.map((l) => ({ url: `${SITE}/property/${l.slug}`, lastModified: l.updatedAt, changeFrequency: "weekly" as const }))];
  } catch (e) {
    log("error", "sitemap.listings_failed", { error: e instanceof Error ? e.message : String(e) });
    return pages;
  }
}
