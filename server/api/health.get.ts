import { useDB } from '../database'
import { sql } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const db = useDB()

  try {
    db.get(sql`SELECT 1`)
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Database unavailable' })
  }

  return { status: 'ok' }
})
