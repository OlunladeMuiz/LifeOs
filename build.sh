#!/usr/bin/env bash
set -euo pipefail

# Railpack build hook
# Installs backend dependencies and produces dist/.

cd "$(dirname "$0")/backend"

if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

npm run db:generate
npm run build
