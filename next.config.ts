import type { NextConfig } from "next";

// Static client preview for GitHub Pages (npm run build:preview); the real site runs on a server.
const preview = process.env.NEXT_PUBLIC_STATIC_PREVIEW === "1";

const nextConfig: NextConfig = {
  ...(preview && { output: "export", basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined }),
  cacheComponents: !preview,
  partialPrefetching: !preview,
  images: {
    unoptimized: preview,
    // Listing photos are served from S3 / Supabase Storage in production.
    // Add your bucket or CDN hostname here.
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "https", hostname: "*.amazonaws.com" },
    ],
    formats: ["image/avif", "image/webp"],
    // Demo placeholder images are local SVGs.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
