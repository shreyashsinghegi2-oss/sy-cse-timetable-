#!/usr/bin/env bash
set -euo pipefail

CHROMIUM_BIN="${CHROMIUM_BIN:-$(command -v chromium || command -v chromium-browser || command -v google-chrome || command -v google-chrome-stable || true)}"
if [[ -z "$CHROMIUM_BIN" ]]; then
  echo "No system Chromium executable found." >&2
  exit 2
fi
if [[ -z "${REPLIT_DEV_DOMAIN:-}" ]]; then
  echo "REPLIT_DEV_DOMAIN is required." >&2
  exit 2
fi

CHROMIUM_BIN="$CHROMIUM_BIN" exec node "$(dirname "$0")/student-collab-real-flow.mjs"