import { eq, and, asc } from 'drizzle-orm'
import { useDB, schema } from '~~/server/database'
import { runPipelineOperator } from './operator'

export async function runPipelineJob(jobId: string) {
  try {
    await runPipelineOperator(jobId)
  } catch (error) {
    console.error(`[pipeline] job=${jobId} run failed`, error)
  }
}

export function schedulePipelineJob(jobId: string) {
  void runPipelineJob(jobId)
}

export async function processNextPendingJob(): Promise<string | null> {
  const db = useDB()
  const [pending] = await db
    .select()
    .from(schema.pipelineJobs)
    .where(eq(schema.pipelineJobs.status, 'pending'))
    .orderBy(asc(schema.pipelineJobs.createdAt))
    .limit(1)
  if (!pending) return null

  const [claimed] = await db
    .update(schema.pipelineJobs)
    .set({ status: 'running', updatedAt: new Date() })
    .where(and(
      eq(schema.pipelineJobs.id, pending.id),
      eq(schema.pipelineJobs.status, 'pending'),
    ))
    .returning()

  if (!claimed) return processNextPendingJob()

  await runPipelineJob(claimed.id)
  return claimed.id
}
