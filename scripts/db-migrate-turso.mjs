#!/usr/bin/env node
/**
 * Run Drizzle migrations against the remote Turso database.
 *
 * Usage:
 *   pnpm db:migrate:turso
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
  console.error('[db:migrate:turso] Set TURSO_DATABASE_URL to your libsql://... URL in .env')
  process.exit(1)
}
if (!token) {
  console.error('[db:migrate:turso] Set TURSO_AUTH_TOKEN in .env')
  process.exit(1)
}

console.log(`[db:migrate:turso] Migrating ${url.replace(/\/\/.*@/, '//***@')}`)

const result = spawnSync('pnpm', ['db:migrate'], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: { ...process.env, TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: token },
})

process.exit(result.status ?? 1)
