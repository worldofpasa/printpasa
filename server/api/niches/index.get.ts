import { useDB, schema } from '~~/server/database'
import { desc } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requireUser(event)
  const db = useDB()
  const rows = await db.query.niches.findMany({
    orderBy: [desc(schema.niches.createdAt)],
  })
  return { niches: rows, count: rows.length }
})
