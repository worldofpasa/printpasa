#!/usr/bin/env node
import { createClient } from '@libsql/client'
import { hashPassword } from 'better-auth/crypto'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

const url = process.env.TURSO_DATABASE_URL || 'file:./data/printpasa.db'
if (url.startsWith('file:')) {
  mkdirSync(join(process.cwd(), 'data'), { recursive: true })
}

const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN })
const username = (process.env.NUXT_SUPERUSER_USERNAME?.trim() || 'admin').toLowerCase()
const password = process.env.NUXT_SUPERUSER_PASSWORD?.trim()

if (!password) {
  console.log('[seed-superuser] NUXT_SUPERUSER_PASSWORD not set, skipping.')
  process.exit(0)
}

const userId = username
const email = `${username}@printpasa.local`
const name = username.charAt(0).toUpperCase() + username.slice(1)
const now = Date.now()
const passwordHash = await hashPassword(password)

const existing = await db.execute({ sql: 'SELECT id FROM users WHERE id = ?', args: [userId] })
if (existing.rows.length === 0) {
  await db.execute({
    sql: `INSERT INTO users (id, email, name, avatar_url, role, email_verified, created_at, updated_at)
          VALUES (?, ?, ?, NULL, 'superuser', 1, ?, ?)`,
    args: [userId, email, name, now, now],
  })
  console.log(`[seed-superuser] created user ${userId}`)
} else {
  await db.execute({
    sql: `UPDATE users SET email = ?, name = ?, role = 'superuser', email_verified = 1, updated_at = ? WHERE id = ?`,
    args: [email, name, now, userId],
  })
}

const account = await db.execute({
  sql: `SELECT id FROM auth_accounts WHERE user_id = ? AND provider_id = 'credential'`,
  args: [userId],
})

if (account.rows.length === 0) {
  await db.execute({
    sql: `INSERT INTO auth_accounts (id, account_id, provider_id, user_id, password, created_at, updated_at)
          VALUES (?, ?, 'credential', ?, ?, ?, ?)`,
    args: [randomUUID(), email, userId, passwordHash, now, now],
  })
} else {
  await db.execute({
    sql: `UPDATE auth_accounts SET password = ?, updated_at = ? WHERE user_id = ? AND provider_id = 'credential'`,
    args: [passwordHash, now, userId],
  })
}

console.log('[seed-superuser] done')
db.close()
