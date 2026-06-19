import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDB, schema } from '~~/server/database'
import { requireUser } from '~~/server/utils/auth'

const body = z.object({ enabled: z.boolean() })

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const id = getRouterParam(event, 'id')!
  const { enabled } = await readValidatedBody(event, body.parse)
  const db = useDB()

  const [updated] = await db
    .update(schema.pipelineSchedules)
    .set({ enabled, updatedAt: new Date() })
    .where(eq(schema.pipelineSchedules.id, id))
    .returning()

  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Schedule not found' })
  return updated
})
