import { eq } from 'drizzle-orm'
import { useDB, schema } from '~~/server/database'
import { getServiceUser } from '~~/server/utils/auth'
import { getWorkflowRunEventsForJob, getWorkflowRunEvents } from '~~/server/services/workflow-run-audit'

export default defineEventHandler(async (event) => {
  const serviceUser = getServiceUser(event)
  if (!serviceUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')!
  const db = useDB()

  const job = await db.query.pipelineJobs.findFirst({
    where: eq(schema.pipelineJobs.id, id),
  })
  if (!job) {
    throw createError({ statusCode: 404, statusMessage: 'Job not found' })
  }

  const events = await db.query.pipelineJobEvents.findMany({
    where: eq(schema.pipelineJobEvents.jobId, id),
    orderBy: (events, { asc }) => [asc(events.createdAt)],
  })

  let workflowRunEvents = await getWorkflowRunEventsForJob(id)
  if (workflowRunEvents.length === 0 && job.sourceMeta) {
    try {
      const meta = JSON.parse(job.sourceMeta) as { runId?: string }
      if (meta.runId) {
        workflowRunEvents = await getWorkflowRunEvents(meta.runId)
      }
    } catch {
      // ignore parse errors
    }
  }

  return { job, events, count: events.length, workflowRunEvents }
})
