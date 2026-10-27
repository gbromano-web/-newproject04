#!/usr/bin/env bash
# Builds the static client preview into ./out for GitHub Pages.
# Lead API routes need a server, so they are set aside during the build.
set -euo pipefail
cd "$(dirname "$0")/.."
export NEXT_PUBLIC_STATIC_PREVIEW=1
export NEXT_PUBLIC_BASE_PATH="${NEXT_PUBLIC_BASE_PATH-/-newproject04}"
export NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL-https://gbromano-web.github.io/-newproject04}"
stash="$(mktemp -d)"
mv src/app/api "$stash/api"
trap 'mv "$stash/api" src/app/api' EXIT
rm -rf out
npx next build
touch out/.nojekyll
