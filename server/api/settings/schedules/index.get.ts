import { useDB, schema } from '~~/server/database'
import { requireUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const db = useDB()
  const schedules = await db.query.pipelineSchedules.findMany()
  return schedules
})
