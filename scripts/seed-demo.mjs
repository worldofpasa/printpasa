#!/usr/bin/env node
/**
 * Seeds demo workspace data for screenshots and read-only demo deploy.
 * Usage: node scripts/seed-demo.mjs
 */
import { createClient } from '@libsql/client'
import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const url = process.env.TURSO_DATABASE_URL || 'file:./data/printpasa.db'
if (url.startsWith('file:')) {
  mkdirSync(join(process.cwd(), 'data'), { recursive: true })
}

const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN })
const now = Date.now()
const demoUserId = 'demo-viewer'

async function run(sql, args = []) {
  await db.execute({ sql, args })
}

async function main() {
  console.log('[seed-demo] Seeding demo workspace…')

  await run(`INSERT OR IGNORE INTO users (id, email, name, avatar_url, role, email_verified, created_at, updated_at)
    VALUES (?, ?, ?, NULL, 'user', 1, ?, ?)`, [demoUserId, 'demo@printpasa.local', 'Demo Viewer', now, now])

  const projectId = 'demo-project-complete'
  await run(`INSERT OR REPLACE INTO projects (id, user_id, name, slug, niche, status, current_stage, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)`, [
    projectId, demoUserId, 'Summer Vibes Collection', 'summer-vibes', 'gen-z', 'manual-review', now, now,
  ])

  const themeId = randomUUID()
  await run(`DELETE FROM themes WHERE project_id = ?`, [projectId])
  await run(`INSERT INTO themes (id, project_id, title, description, is_selected, is_validated, is_winner, trend_score, created_at)
    VALUES (?, ?, ?, ?, 1, 1, 1, 85, ?)`, [
    themeId, projectId, 'Retro Sunset Palm', 'Nostalgic 80s sunset with palm silhouettes', now,
  ])

  const promptId = randomUUID()
  const promptText = 'Minimal retro sunset palm tree silhouette, vibrant orange and pink gradient'
  await run(`INSERT INTO image_prompts (id, theme_id, prompt_text, original_prompt_text, style, background_color_hex, background_color_name, status, is_selected, created_at)
    VALUES (?, ?, ?, ?, 'flat vector', '#00000000', 'transparent', 'selected', 1, ?)`, [
    promptId, themeId, promptText, promptText, now,
  ])

  const imageId = randomUUID()
  const placeholderImage = 'https://placehold.co/1024x1024/png?text=Demo+Design'
  await run(`INSERT INTO generated_images (id, prompt_id, image_url, image_provider, generation_status, is_selected, created_at)
    VALUES (?, ?, ?, 'demo', 'completed', 1, ?)`, [imageId, promptId, placeholderImage, now])

  console.log('[seed-demo] Done — demo project at stage 7 (manual-review)')
  db.close()
}

main().catch((err) => {
  console.error('[seed-demo] failed:', err)
  process.exit(1)
})
