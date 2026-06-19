import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@libsql/client'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const migrationsDir = path.join(projectRoot, 'server/database/migrations')
const journalPath = path.join(migrationsDir, 'meta/_journal.json')

function loadJournal() {
  const raw = fs.readFileSync(journalPath, 'utf8')
  return JSON.parse(raw)
}

function hashMigrationSql(tag) {
  const migrationPath = path.join(migrationsDir, `${tag}.sql`)
  const sql = fs.readFileSync(migrationPath, 'utf8')
  return crypto.createHash('sha256').update(sql).digest('hex')
}

async function main() {
  const url = process.env.TURSO_DATABASE_URL || 'file:./data/printpasa.db'
  const authToken = process.env.TURSO_AUTH_TOKEN

  const client = createClient({ url, authToken })
  const journal = loadJournal()

  // Create migrations table if it doesn't exist
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash text NOT NULL,
      created_at numeric
    )
  `)

  const countResult = await client.execute('SELECT COUNT(*) AS count FROM "__drizzle_migrations"')
  const migrationCount = Number(countResult.rows[0]?.count ?? 0)
  const tablesResult = await client.execute(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
      AND name != '__drizzle_migrations'
  `)
  const userTableCount = tablesResult.rows.length

  // If all migrations are already recorded, nothing to do
  if (migrationCount >= journal.entries.length) {
    console.log(`[drizzle-baseline] Migration history is up to date (${migrationCount} rows). Skipping.`)
    await client.close()
    return
  }

  if (migrationCount > 0) {
    console.log(`[drizzle-baseline] Found partial migration history (${migrationCount}/${journal.entries.length}). Leaving rows intact so drizzle can apply the remaining migrations.`)
    await client.close()
    return
  }

  // Fresh DB: let drizzle-kit apply migrations from scratch.
  if (userTableCount === 0) {
    console.log('[drizzle-baseline] No user tables found. Skipping baseline so drizzle can run all migrations.')
    await client.close()
    return
  }

  // Existing schema with no recorded migration history:
  // assume it was created by db:push and baseline the current journal.
  console.log(`[drizzle-baseline] Found existing schema with no migration history (${userTableCount} table(s)). Baselining current migrations...`)
  for (const entry of journal.entries) {
    const hash = hashMigrationSql(entry.tag)
    await client.execute({
      sql: 'INSERT INTO "__drizzle_migrations" ("hash", "created_at") VALUES (?, ?)',
      args: [hash, entry.when],
    })
  }

  console.log(`[drizzle-baseline] Marked all ${journal.entries.length} migrations as applied.`)
  await client.close()
}

main().catch((error) => {
  console.error('[drizzle-baseline] Error:', error)
  process.exit(1)
})
