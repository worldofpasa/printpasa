import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDB, schema } from '~~/server/database'
import { getServiceUser } from '~~/server/utils/auth'
import { runPipelineJob, processNextPendingJob } from '~~/server/services/pipeline/run-job'

const bodySchema = z.object({
  jobId: z.string().uuid().optional(),
})

export default defineEventHandler(async (event) => {
  const serviceUser = getServiceUser(event)
  if (!serviceUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const raw = await readBody(event)
  const parsed = bodySchema.safeParse(raw ?? {})
  const jobId = parsed.success ? parsed.data.jobId : undefined

  if (jobId) {
    const db = useDB()
    const job = await db.query.pipelineJobs.findFirst({
      where: eq(schema.pipelineJobs.id, jobId),
    })
    if (!job) {
      throw createError({ statusCode: 404, statusMessage: 'Job not found' })
    }
    if (job.status === 'pending' || job.status === 'failed') {
      await db
        .update(schema.pipelineJobs)
        .set({
          status: 'running',
          errorMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(schema.pipelineJobs.id, jobId))
    }
    await runPipelineJob(jobId)
    const updated = await db.query.pipelineJobs.findFirst({
      where: eq(schema.pipelineJobs.id, jobId),
    })
    return { processedJobId: jobId, status: updated?.status }
  }

  const processedJobId = await processNextPendingJob()
  return { processedJobId, status: processedJobId ? 'processed' : 'no_pending_jobs' }
})
