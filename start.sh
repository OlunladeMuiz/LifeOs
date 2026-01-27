#!/usr/bin/env bash
set -euo pipefail

# Railpack entrypoint
# Starts the backend service (the deployable runtime for this repo).
# Note: some platforms run in a slim runtime image without npm.

cd "$(dirname "$0")/backend"

if [ ! -d node_modules ]; then
  echo "[BOOT] node_modules/ not found. Ensure the build step installs dependencies." >&2
  exit 1
fi

if [ ! -f dist/index.js ]; then
  echo "[BOOT] dist/index.js not found. Ensure the build step runs the TypeScript build." >&2
  exit 1
fi

exec node dist/index.js
