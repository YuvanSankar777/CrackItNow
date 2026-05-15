#!/usr/bin/env bash
# Start the local Piston code-execution container.
# Safe to re-run: reuses the `piston_data` volume so installed runtimes persist.

set -euo pipefail

NAME=piston_api
VOLUME=piston_data
PORT=2000

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not running. Open Docker Desktop first." >&2
  exit 1
fi

docker volume inspect "$VOLUME" >/dev/null 2>&1 || docker volume create "$VOLUME" >/dev/null

if docker ps --format '{{.Names}}' | grep -q "^${NAME}$"; then
  echo "Piston already running on :${PORT}"
  exit 0
fi

docker rm -f "$NAME" >/dev/null 2>&1 || true

docker run -d --name "$NAME" --privileged \
  -p "${PORT}:2000" \
  -e PISTON_RUN_TIMEOUT=15000 \
  -e PISTON_COMPILE_TIMEOUT=30000 \
  -e PISTON_RUN_CPU_TIME=10000 \
  -e PISTON_COMPILE_CPU_TIME=30000 \
  -v "${VOLUME}:/piston" \
  ghcr.io/engineer-man/piston >/dev/null

echo -n "Waiting for Piston..."
until curl -sS -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/api/v2/runtimes" 2>/dev/null | grep -q 200; do
  sleep 1
  echo -n "."
done
echo " up"

RUNTIMES=$(curl -sS "http://localhost:${PORT}/api/v2/runtimes")
echo "$RUNTIMES" | python3 -c "import json,sys; rs=json.load(sys.stdin); print('Installed:', ', '.join(sorted({r['language'] for r in rs})))"

NEEDS_INSTALL=()
echo "$RUNTIMES" | grep -q '"python"'     || NEEDS_INSTALL+=('{"language":"python","version":"3.12.0"}')
echo "$RUNTIMES" | grep -q '"javascript"' || NEEDS_INSTALL+=('{"language":"node","version":"20.11.1"}')
echo "$RUNTIMES" | grep -q '"java"'       || NEEDS_INSTALL+=('{"language":"java","version":"15.0.2"}')
echo "$RUNTIMES" | grep -q '"c++"'        || NEEDS_INSTALL+=('{"language":"gcc","version":"10.2.0"}')

if [ ${#NEEDS_INSTALL[@]} -gt 0 ]; then
  echo "Installing missing runtimes..."
  for pkg in "${NEEDS_INSTALL[@]}"; do
    echo "  $pkg"
    curl -sS -X POST "http://localhost:${PORT}/api/v2/packages" \
      -H 'Content-Type: application/json' \
      -d "$pkg" >/dev/null
  done
  echo "Done."
fi
