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
mv src/proxy.ts "$stash/proxy.ts" # dashboard lock needs a server; the preview dashboard holds sample data only
trap 'mv "$stash/api" src/app/api; mv "$stash/robots.ts" src/app/robots.ts; mv "$stash/proxy.ts" src/proxy.ts' EXIT
rm -rf out
npx next build
touch out/.nojekyll
printf "User-agent: *\nDisallow: /\n" > out/robots.txt
