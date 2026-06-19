#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Load .env reliably (bash `source` breaks on some values)
eval "$(node --input-type=module -e "
import { loadEnv } from './scripts/load-env.mjs'
loadEnv()
const keys = ['NUXT_TELEGRAM_WEBHOOK_SECRET', 'PORT']
for (const key of keys) {
  console.log('export ' + key + '=' + JSON.stringify(process.env[key] ?? ''))
}
")"

PORT="${PORT:-3456}"
BASE="http://localhost:${PORT}"
SECRET="${NUXT_TELEGRAM_WEBHOOK_SECRET:-}"

if [[ -z "${SECRET}" ]]; then
  echo "ERROR: NUXT_TELEGRAM_WEBHOOK_SECRET is empty — check .env" >&2
  exit 1
fi

echo "→ health ${BASE}/api/health"
curl -sS "${BASE}/api/health" | head -c 200
echo ""

echo "→ webhook ${BASE}/api/integrations/telegram/webhook"
curl -sS -X POST "${BASE}/api/integrations/telegram/webhook" \
  -H 'Content-Type: application/json' \
  -H "X-Telegram-Bot-Api-Secret-Token: ${SECRET}" \
  -d @scripts/fixtures/telegram-idea-update.json
echo ""

echo "→ latest pipeline_jobs row"
sqlite3 data/printpasa.db "SELECT id, status, project_name FROM pipeline_jobs ORDER BY created_at DESC LIMIT 1;" 2>/dev/null || true
