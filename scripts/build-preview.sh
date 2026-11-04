#!/usr/bin/env bash
# Builds the static client preview into ./out for GitHub Pages.
# Lead API routes need a server, and the server's robots rules allow crawling,
# so both are set aside during the build; the preview gets a no-crawl robots.txt.
set -euo pipefail
cd "$(dirname "$0")/.."
export NEXT_PUBLIC_STATIC_PREVIEW=1
export NEXT_PUBLIC_BASE_PATH="${NEXT_PUBLIC_BASE_PATH-/-newproject04}"
export NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL-https://gbromano-web.github.io/-newproject04}"
stash="$(mktemp -d)"
mv src/app/api "$stash/api"
mv src/app/robots.ts "$stash/robots.ts"
mv src/app/sitemap.ts "$stash/sitemap.ts" # lists the live site; the preview is not indexed
mv src/proxy.ts "$stash/proxy.ts" # dashboard lock needs a server; the preview dashboard holds sample data only
# Agent sign-in needs a server too; the preview dashboard is the sample one
mv src/app/agent "$stash/agent"
mv src/app/auth "$stash/auth"
cp src/app/dashboard/page.tsx "$stash/dashboard-page.tsx"
cat > src/app/dashboard/page.tsx <<'TSX'
import type { Metadata } from "next";
import { SampleDashboard } from "./sample-dashboard";
export const metadata: Metadata = { title: "Agent dashboard", robots: { index: false, follow: false } };
export default function DashboardPage() {
  return <SampleDashboard />;
}
TSX
mv src/app/dashboard/live-dashboard.tsx "$stash/live-dashboard.tsx"
mv src/app/dashboard/listings "$stash/listings" # the listing editor needs sign-in and a database
mv src/app/dashboard/billing "$stash/billing"
# "use cache" needs cacheComponents, which a static export turns off: the preview renders sample listings directly
cp src/components/ph/latest-listings-cache.tsx "$stash/latest-listings-cache.tsx"
printf 'export { LatestListingsList as LatestListings } from "./latest-listings";\n' > src/components/ph/latest-listings-cache.tsx
restore() {
  mv "$stash/latest-listings-cache.tsx" src/components/ph/latest-listings-cache.tsx
  mv "$stash/api" src/app/api; mv "$stash/robots.ts" src/app/robots.ts; mv "$stash/sitemap.ts" src/app/sitemap.ts; mv "$stash/proxy.ts" src/proxy.ts
  mv "$stash/agent" src/app/agent; mv "$stash/auth" src/app/auth
  mv "$stash/listings" src/app/dashboard/listings; mv "$stash/billing" src/app/dashboard/billing
  mv "$stash/live-dashboard.tsx" src/app/dashboard/live-dashboard.tsx; mv "$stash/dashboard-page.tsx" src/app/dashboard/page.tsx
}
trap restore EXIT
rm -rf out
npx next build
touch out/.nojekyll
printf "User-agent: *\nDisallow: /\n" > out/robots.txt
