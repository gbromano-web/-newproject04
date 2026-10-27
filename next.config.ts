import type { NextConfig } from "next";

// Static client preview for GitHub Pages (npm run build:preview); the real site runs on a server.
const preview = process.env.NEXT_PUBLIC_STATIC_PREVIEW === "1";

const dev = process.env.NODE_ENV !== "production";

// Next.js inlines its bootstrap scripts, so script-src needs 'unsafe-inline'
// until a nonce-based CSP (middleware) is added; everything else is locked down.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co",
  "font-src 'self'",
  `connect-src 'self'${dev ? " ws:" : ""}`,
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Static export (preview) cannot send headers; GitHub Pages serves its own
  ...(!preview && {
    headers: async () => [
      { source: "/:path*", headers: securityHeaders },
      { source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ],
  }),
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
