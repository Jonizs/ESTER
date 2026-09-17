#!/usr/bin/env bash
# ESTER launcher for Linux / macOS.
set -euo pipefail
cd "$(dirname "$0")"

command -v node >/dev/null || { echo "[ESTER] Node.js is required: https://nodejs.org"; exit 1; }

[ -d node_modules ] || { echo "[ESTER] Installing dependencies..."; npm install; }
[ -f dist/index.html ] || { echo "[ESTER] Building game bundle..."; npm run build; }

echo "[ESTER] Launching..."
exec npx electron .
