#!/usr/bin/env node
/**
 * Sync canonical Fal model catalog and re-enable the Fal provider.
 * Updates both the global providers table and per-user provider_registry_config.
 *
 * Usage:
 *   pnpm db:sync-providers
 */
import { createClient } from '@libsql/client'
import { loadEnv } from './load-env.mjs'

const FAL_MODELS = [
  { id: 'fal-ai/flux/dev', label: 'Flux Dev', description: 'Fast illustration generation. Default for graphic tees.', cost: '~$0.025', enabled: true },
  { id: 'fal-ai/flux/schnell', label: 'Flux Schnell', description: 'Ultra-fast drafts for prompt iteration.', cost: '~$0.003/MP', enabled: true },
  { id: 'fal-ai/recraft/v3/text-to-image', label: 'Recraft V3', description: 'Vector and flat design-style graphics.', cost: '~$0.04', enabled: true },
  { id: 'fal-ai/ideogram/v3', label: 'Ideogram V3', description: 'Short legible text in designs.', cost: '~$0.03–0.09', enabled: true },
  { id: 'fal-ai/flux-pro/v1.1', label: 'Flux Pro', description: 'Higher quality finals.', cost: '~$0.05', enabled: false },
]

function mergeModels(canonical, stored) {
  const enabledById = new Map((stored ?? []).map((m) => [m.id, m.enabled]))
  return canonical.map((m) => ({
    ...m,
    enabled: enabledById.has(m.id) ? (enabledById.get(m.id) ?? true) : (m.enabled ?? true),
  }))
}

function patchRegistryConfig(raw) {
  if (!raw) return null
  try {
    const registry = JSON.parse(raw)
    if (!Array.isArray(registry)) return null
    let changed = false
    const next = registry.map((entry) => {
      if (entry?.id !== 'fal') return entry
      const mergedModels = mergeModels(FAL_MODELS, entry.models)
      const modelsChanged = JSON.stringify(mergedModels) !== JSON.stringify(entry.models ?? [])
      const enabledChanged = entry.enabled === false
      if (!modelsChanged && !enabledChanged) return entry
      changed = true
      return { ...entry, enabled: true, models: mergedModels }
    })
    return changed ? JSON.stringify(next) : null
  } catch {
    return null
  }
}

loadEnv()

const url = process.env.TURSO_DATABASE_URL || 'file:./data/printpasa.db'
const authToken = process.env.TURSO_AUTH_TOKEN

const client = createClient({ url, authToken })

try {
  const row = await client.execute({
    sql: 'SELECT models, enabled FROM providers WHERE id = ?',
    args: ['fal'],
  })

  if (row.rows.length === 0) {
    console.error('[sync-providers] No fal provider row — start the app once to seed providers.')
    process.exit(1)
  }

  const existing = row.rows[0].models ? JSON.parse(String(row.rows[0].models)) : []
  const merged = mergeModels(FAL_MODELS, existing)
  const wasDisabled = row.rows[0].enabled === 0 || row.rows[0].enabled === false

  await client.execute({
    sql: 'UPDATE providers SET models = ?, enabled = 1, updated_at = ? WHERE id = ?',
    args: [JSON.stringify(merged), Date.now(), 'fal'],
  })

  const enabledLabels = merged.filter((m) => m.enabled !== false).map((m) => m.label)
  console.log(`[sync-providers] providers.fal: enabled=true${wasDisabled ? ' (was disabled)' : ''}`)
  console.log(`[sync-providers] models (${enabledLabels.length} enabled): ${enabledLabels.join(', ')}`)

  const users = await client.execute('SELECT user_id, provider_registry_config FROM user_settings')
  let userPatches = 0
  for (const userRow of users.rows) {
    const patched = patchRegistryConfig(userRow.provider_registry_config)
    if (!patched) continue
    await client.execute({
      sql: 'UPDATE user_settings SET provider_registry_config = ?, updated_at = ? WHERE user_id = ?',
      args: [patched, Date.now(), userRow.user_id],
    })
    userPatches += 1
    console.log(`[sync-providers] user_settings.${userRow.user_id}: re-enabled fal in provider registry`)
  }

  if (userPatches === 0) {
    console.log('[sync-providers] No user registry overrides needed patching.')
  }
} finally {
  await client.close()
}
