/**
 * Backfill projects.origin_source / origin_actor from pipeline_jobs or portal default.
 * Run: node scripts/backfill-project-origin.mjs
 */
import { createClient } from '@libsql/client'
import { loadEnv } from './load-env.mjs'

loadEnv()

const url = process.env.TURSO_DATABASE_URL || 'file:./data/printpasa.db'
const authToken = process.env.TURSO_AUTH_TOKEN
const db = createClient({ url, authToken })

const { rows: projects } = await db.execute('SELECT id, origin_actor FROM projects')
const { rows: jobs } = await db.execute(`
  SELECT project_id, source, source_meta
  FROM pipeline_jobs
  WHERE project_id IS NOT NULL
  ORDER BY created_at ASC
`)
const { rows: schedules } = await db.execute('SELECT id, name FROM pipeline_schedules')

const jobMap = new Map()
for (const job of jobs) {
  if (!jobMap.has(job.project_id)) jobMap.set(job.project_id, job)
}
const scheduleNames = new Map(schedules.map((s) => [s.id, s.name]))

let updated = 0
for (const project of projects) {
  if (project.origin_actor) continue

  const job = jobMap.get(project.id)
  if (!job) {
    await db.execute({
      sql: 'UPDATE projects SET origin_source = ?, origin_actor = ?, origin_meta = ? WHERE id = ?',
      args: ['portal', 'Portal', null, project.id],
    })
    updated++
    continue
  }

  let meta = {}
  try {
    meta = job.source_meta ? JSON.parse(job.source_meta) : {}
  } catch {
    meta = {}
  }

  if (job.source === 'telegram') {
    const fromUser = meta.fromUser
    const actor = fromUser
      ? (fromUser.startsWith('@') ? fromUser : `@${fromUser}`)
      : 'Telegram'
    await db.execute({
      sql: 'UPDATE projects SET origin_source = ?, origin_actor = ?, origin_meta = ? WHERE id = ?',
      args: [
        'telegram',
        actor,
        JSON.stringify({
          telegramUserId: meta.fromUserId,
          chatId: meta.chatId,
          messageThreadId: meta.messageThreadId,
        }),
        project.id,
      ],
    })
    updated++
    continue
  }

  if (job.source === 'cron') {
    const scheduleId = meta.scheduleId
    const actor = scheduleId ? (scheduleNames.get(scheduleId) ?? 'Cron') : 'Cron'
    await db.execute({
      sql: 'UPDATE projects SET origin_source = ?, origin_actor = ?, origin_meta = ? WHERE id = ?',
      args: ['cron', actor, JSON.stringify({ scheduleId, runId: meta.runId }), project.id],
    })
    updated++
    continue
  }

  await db.execute({
    sql: 'UPDATE projects SET origin_source = ?, origin_actor = ?, origin_meta = ? WHERE id = ?',
    args: ['portal', 'Portal', null, project.id],
  })
  updated++
}

console.log(`Backfilled origin on ${updated} project(s).`)
await db.close()
