import { eq } from 'drizzle-orm'
import { useDB, schema } from '~~/server/database'
import { getServiceUser } from '~~/server/utils/auth'
import { runAutomatedResearch } from '~~/server/services/pipeline/brainstorm'

export default defineEventHandler(async (event) => {
  const serviceUser = getServiceUser(event)
  if (!serviceUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const scheduleId = getRouterParam(event, 'id')!
  const db = useDB()
  const schedule = await db.query.pipelineSchedules.findFirst({
    where: eq(schema.pipelineSchedules.id, scheduleId),
  })
  if (!schedule) {
    throw createError({ statusCode: 404, statusMessage: `Schedule not found: ${scheduleId}` })
  }

  const now = new Date()
  await db
    .update(schema.pipelineSchedules)
    .set({ lastRunAt: now, updatedAt: now })
    .where(eq(schema.pipelineSchedules.id, scheduleId))

  const result = await runAutomatedResearch(scheduleId)
  return result
})
