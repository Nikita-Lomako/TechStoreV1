#!/bin/sh
set -e

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] applying database migrations..."
  npx prisma migrate deploy
fi

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "[entrypoint] seeding demo data..."
  node prisma/seed.js
fi

echo "[entrypoint] starting API on ${HOST:-0.0.0.0}:${PORT:-3000}"
exec node dist/server.js
