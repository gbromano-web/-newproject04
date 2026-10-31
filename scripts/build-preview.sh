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
restore() {
  mv "$stash/api" src/app/api; mv "$stash/robots.ts" src/app/robots.ts; mv "$stash/sitemap.ts" src/app/sitemap.ts; mv "$stash/proxy.ts" src/proxy.ts
  mv "$stash/agent" src/app/agent; mv "$stash/auth" src/app/auth
  mv "$stash/live-dashboard.tsx" src/app/dashboard/live-dashboard.tsx; mv "$stash/dashboard-page.tsx" src/app/dashboard/page.tsx
}
trap restore EXIT
rm -rf out
npx next build
touch out/.nojekyll
printf "User-agent: *\nDisallow: /\n" > out/robots.txt
