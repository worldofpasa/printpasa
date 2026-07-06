#!/bin/sh
set -e

# Prod: Fly secrets set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN → remote Turso.
# Fallback: SQLite on the mounted volume. docker-compose.yml mounts ./data:/app/data,
# so the DB must live under /app/data to survive `docker compose down`/rebuild.
mkdir -p /app/data/db
if [ -z "$TURSO_DATABASE_URL" ]; then
  export TURSO_DATABASE_URL="file:/app/data/db/printpasa.db"
fi

echo "[entrypoint] running migrations..."
node ./scripts/baseline-drizzle-migrations.mjs
node ./node_modules/drizzle-kit/bin.cjs migrate

echo "[entrypoint] seeding superuser..."
node ./scripts/seed-superuser.mjs

echo "[entrypoint] starting server..."
exec node .output/server/index.mjs
