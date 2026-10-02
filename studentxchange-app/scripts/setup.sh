#!/bin/bash
# scripts/setup.sh
# First-time project setup script.
# Run once after cloning the repo to get the project ready for development.
#
# Usage:
#   ./scripts/setup.sh

set -e

echo "==> StudentXchange — project setup"
echo ""

# 1. Install dependencies
echo "[1/4] Installing Node.js dependencies..."
npm install

# 2. Check for required environment variables
echo "[2/4] Checking environment variables..."
REQUIRED_VARS=(
  "DATABASE_URL"
  "FIREBASE_SERVICE_ACCOUNT_JSON"
  "VITE_FIREBASE_API_KEY"
  "VITE_FIREBASE_PROJECT_ID"
  "PAYU_MERCHANT_KEY"
  "PAYU_SALT"
)

MISSING=()
for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    MISSING+=("$VAR")
  fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  echo ""
  echo "WARNING: The following required environment variables are not set:"
  for VAR in "${MISSING[@]}"; do
    echo "  - $VAR"
  done
  echo ""
  echo "See .env.example for descriptions. Set them in your Replit Secrets."
  echo ""
fi

# 3. Push database schema
echo "[3/4] Pushing database schema..."
npm run db:push

# 4. Done
echo "[4/4] Setup complete!"
echo ""
echo "Start the development server with:  npm run dev"
echo ""
