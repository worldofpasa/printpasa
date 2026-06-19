#!/bin/sh
set -e

mkdir -p /data/db

# Prod: Fly secrets set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN → remote Turso.
# Fallback: volume SQLite (rollback path; local dev never runs this entrypoint).
if [ -z "$TURSO_DATABASE_URL" ]; then
  export TURSO_DATABASE_URL="file:/data/db/printpasa.db"
fi

echo "[entrypoint] running migrations..."
node ./scripts/baseline-drizzle-migrations.mjs
node ./node_modules/drizzle-kit/bin.cjs migrate

echo "[entrypoint] seeding superuser..."
node ./scripts/seed-superuser.mjs

echo "[entrypoint] starting server..."
exec node .output/server/index.mjs
