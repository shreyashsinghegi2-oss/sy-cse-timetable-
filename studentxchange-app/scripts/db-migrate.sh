#!/bin/bash
# scripts/db-migrate.sh
# Pushes the Drizzle schema to the PostgreSQL database.
# Run this after any change to shared/schema.ts.
#
# Usage:
#   ./scripts/db-migrate.sh          # safe push (warns on data loss)
#   ./scripts/db-migrate.sh --force  # force push (use with caution)

set -e

FORCE=${1:-""}

echo "==> Pushing schema to database..."

if [ "$FORCE" = "--force" ]; then
  echo "    WARNING: --force flag set — data loss columns will be dropped."
  npm run db:push -- --force
else
  npm run db:push
fi

echo "==> Schema push complete."
