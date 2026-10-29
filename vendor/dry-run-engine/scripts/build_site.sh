#!/usr/bin/env bash
# Builds site/, the folder Cloudflare Pages publishes (HOSTING.md). Cloudflare runs this as the
# build command on every push to the live branch.
#
# It only copies. The game runs as written, so there is nothing to compile. What goes in:
#   game/                  the game, its screens and its fonts
#   engine/*.js, text/*.js the modules the game imports, without their tests or package files
#   hosting/               the root redirect to /game/, cache and no-index headers, robots.txt
# Nothing else from the repo is published: no docs, no sheets, no research, no reports, no
# Phase 0 harness. The checks at the end fail the build if that ever stops being true.
#
# --test-tools turns on the testing tools (game/config.js TEST_TOOLS) in the built copy only:
# "Start again" on How it works. For the tester site behind Access, never for real players.
# Without it the build is the player build.
#
# Usage: bash scripts/build_site.sh [--test-tools]

set -euo pipefail
cd "$(dirname "$0")/.."

test_tools=no
case "${1:-}" in
  "") ;;
  --test-tools) test_tools=yes ;;
  *) echo "Unknown option: $1" >&2; exit 1 ;;
esac

rm -rf site
mkdir -p site/engine site/text
cp -R game site/game
cp engine/*.js site/engine/
cp text/*.js site/text/
cp hosting/_headers hosting/_redirects hosting/robots.txt site/

if [ "$test_tools" = yes ]; then
  sed -i.bak 's/^export const TEST_TOOLS = false;$/export const TEST_TOOLS = true;/' site/game/config.js
  rm -f site/game/config.js.bak
  grep -q '^export const TEST_TOOLS = true;$' site/game/config.js || { echo "Could not turn on TEST_TOOLS" >&2; exit 1; }
  echo "Testing tools ON: this build is for testers only"
  # The jump to a month replays the Balanced player's path; a stale one would put testers in a
  # state no player reaches
  node scripts/export_balanced_path.mjs --check
else
  grep -q '^export const TEST_TOOLS = false;$' site/game/config.js || { echo "TEST_TOOLS must be false in a player build" >&2; exit 1; }
fi

# Only these kinds of file may be published
unexpected=$(find site -type f ! \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.svg' \
  -o -name '*.woff' -o -name 'OFL-*.txt' -o -name 'robots.txt' -o -name '_headers' -o -name '_redirects' \))
if [ -n "$unexpected" ]; then
  echo "Refusing to publish unexpected files:" >&2
  echo "$unexpected" >&2
  exit 1
fi

# The game must be there, with its fonts
for f in site/game/index.html site/game/main.js site/engine/index.js site/text/render.js \
  site/game/fonts/Mukta-Regular.woff site/game/fonts/Mukta-SemiBold.woff site/game/fonts/NotoSerifDevanagari-wght.woff; do
  [ -f "$f" ] || { echo "Missing $f" >&2; exit 1; }
done

echo "Built site/: $(find site -type f | wc -l | tr -d ' ') files, $(du -sk site | cut -f1) KB"
