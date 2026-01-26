#!/usr/bin/env bash
set -euo pipefail

# Railpack entrypoint
# Starts the backend service (the deployable runtime for this repo).

cd "$(dirname "$0")/backend"

# If the platform didn't run install/build steps, do a safe fallback.
if [ ! -d node_modules ]; then
  if [ -f package-lock.json ]; then
    npm ci
  else
    npm install
  fi
fi

# Ensure the compiled JS exists.
if [ ! -f dist/index.js ]; then
  npm run build
fi

# Prisma client must exist at runtime.
# (Safe to run multiple times.)
npm run db:generate

# Optional: run migrations if DATABASE_URL is configured.
# If you don't want auto-migrations on boot, remove this line.
if [ -n "${DATABASE_URL:-}" ]; then
  npm run db:migrate
fi

npm start
