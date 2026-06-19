import { useDB, schema } from '~~/server/database'
import { eq } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing niche id' })
  const db = useDB()
  const row = await db.query.niches.findFirst({ where: eq(schema.niches.id, id) })
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Niche not found' })
  return row
})
