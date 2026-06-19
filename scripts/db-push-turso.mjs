#!/usr/bin/env node
/**
 * Apply Drizzle schema to the remote Turso database.
 *
 * Prerequisites:
 *   - .env with TURSO_DATABASE_URL and TURSO_AUTH_TOKEN
 *
 * Usage:
 *   pnpm db:push:turso
 *   pnpm db:push:turso -- --force   # auto-approve destructive changes
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from './load-env.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

loadEnv()

const url = process.env.TURSO_DATABASE_URL
const token = process.env.TURSO_AUTH_TOKEN

if (!url || url.startsWith('file:')) {
  console.error('[db:push:turso] Set TURSO_DATABASE_URL to your libsql://... URL in .env')
  process.exit(1)
}
if (!token) {
  console.error('[db:push:turso] Set TURSO_AUTH_TOKEN in .env')
  process.exit(1)
}

const extraArgs = process.argv.slice(2)
const force = extraArgs.includes('--force')
const args = ['exec', 'drizzle-kit', 'push', ...(force ? ['--force'] : [])]

console.log(`[db:push:turso] Pushing schema to ${url.replace(/\/\/.*@/, '//***@')}`)

const result = spawnSync('pnpm', args, {
  cwd: projectRoot,
  stdio: 'inherit',
  env: { ...process.env, TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: token },
})

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}

console.log('[db:push:turso] Done. Restart the app (or redeploy) so provider seed sync runs.')
