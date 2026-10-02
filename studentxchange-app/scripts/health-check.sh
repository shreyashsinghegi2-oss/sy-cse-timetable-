#!/bin/bash
# scripts/health-check.sh
# Verifies the running server responds on the expected port.
# Useful for CI/CD pipelines and post-deploy verification.
#
# Usage:
#   ./scripts/health-check.sh
#   ./scripts/health-check.sh https://your-custom-domain.replit.app

set -e

BASE_URL=${1:-"http://localhost:5000"}
MAX_RETRIES=10
SLEEP=2

echo "==> Health check: $BASE_URL"

for i in $(seq 1 $MAX_RETRIES); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health" 2>/dev/null || echo "000")
  if [ "$STATUS" = "200" ]; then
    echo "    Server is healthy (HTTP $STATUS) after $i attempt(s)."
    exit 0
  fi
  echo "    Attempt $i/$MAX_RETRIES — got HTTP $STATUS, retrying in ${SLEEP}s..."
  sleep "$SLEEP"
done

echo "ERROR: Server did not become healthy after $MAX_RETRIES attempts."
exit 1
