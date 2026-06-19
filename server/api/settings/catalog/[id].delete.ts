import { useDB, schema } from '~~/server/database'
import { eq, and } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')!
  const db = useDB()

  const item = await db.query.catalogItems.findFirst({
    where: and(eq(schema.catalogItems.id, id), eq(schema.catalogItems.userId, user.id)),
  })
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Catalog item not found' })

  await db.delete(schema.catalogItems).where(eq(schema.catalogItems.id, id))

  return { ok: true }
})
