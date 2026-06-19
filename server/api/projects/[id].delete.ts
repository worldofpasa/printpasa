import { useDB, schema } from '~~/server/database'
import { eq } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { resolveProjectBySlug } from '~~/server/utils/resolveProject'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const slug = getRouterParam(event, 'id')!
  const db = useDB()

  const existing = await resolveProjectBySlug(user, slug)

  await db.delete(schema.projects).where(eq(schema.projects.id, existing.id))

  return { success: true }
})
