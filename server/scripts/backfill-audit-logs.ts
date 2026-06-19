/**
 * One-time backfill: import workflow_run_events and pipeline_job_events into audit_logs.
 *
 * Run via: npx tsx server/scripts/backfill-audit-logs.ts
 */
import { useDB, schema } from '../database'
import { logAuditEvent, auditLogExists } from '../services/audit-log'
import {
  mapPipelineStepToAction,
  mapPipelineStepToStage,
  mapWorkflowPhaseToAction,
  mapWorkflowPhaseToStage,
  mapWorkflowSourceToActor,
} from '../services/audit-log/mappers'

function resolvePipelineActor(source: string, sourceMeta?: string | null): string {
  if (source === 'cron') return 'CRON'
  if (source === 'telegram') return 'TELEGRAM'
  if (sourceMeta) {
    try {
      const meta = JSON.parse(sourceMeta) as { scheduleId?: string; chatId?: number }
      if (meta.scheduleId) return 'CRON'
      if (meta.chatId) return 'TELEGRAM'
    } catch {
      // ignore
    }
  }
  return 'SYSTEM'
}

async function backfillWorkflowRunEvents() {
  const db = useDB()
  const events = await db.query.workflowRunEvents.findMany({
    orderBy: (row, { asc }) => [asc(row.createdAt)],
  })

  let inserted = 0
  let skipped = 0

  for (const event of events) {
    const id = `legacy-wre-${event.id}`
    if (await auditLogExists(id)) {
      skipped++
      continue
    }

    let detail: Record<string, unknown> = {}
    if (event.detail) {
      try {
        detail = JSON.parse(event.detail) as Record<string, unknown>
      } catch {
        detail = { raw: event.detail }
      }
    }

    const targets = [`run:${event.runId}`]
    if (event.projectId) targets.push(`project:${event.projectId}`)
    if (event.pipelineJobId) targets.push(`job:${event.pipelineJobId}`)

    await logAuditEvent({
      id,
      actor: mapWorkflowSourceToActor(event.source),
      action: mapWorkflowPhaseToAction(
        event.phase as 'discovery' | 'research' | 'themes' | 'pipeline',
        event.level as 'info' | 'success' | 'warning' | 'error',
        event.message,
      ),
      target: targets.join(','),
      projectId: event.projectId ?? undefined,
      stage: mapWorkflowPhaseToStage(event.phase as 'discovery' | 'research' | 'themes' | 'pipeline'),
      runId: event.runId,
      pipelineJobId: event.pipelineJobId ?? undefined,
      scheduleId: event.scheduleId ?? undefined,
      level: event.level as 'info' | 'success' | 'warning' | 'error',
      createdAt: event.createdAt,
      metadata: {
        message: event.message,
        phase: event.phase,
        source: event.source,
        legacySource: 'workflow_run_events',
        legacySourceId: event.id,
        ...detail,
      },
    })
    inserted++
  }

  console.log(`workflow_run_events: inserted ${inserted}, skipped ${skipped}`)
}

async function backfillPipelineJobEvents() {
  const db = useDB()
  const events = await db.query.pipelineJobEvents.findMany({
    orderBy: (row, { asc }) => [asc(row.createdAt)],
  })

  const jobs = await db.query.pipelineJobs.findMany()
  const jobById = new Map(jobs.map((job) => [job.id, job]))

  let inserted = 0
  let skipped = 0

  for (const event of events) {
    const id = `legacy-pje-${event.id}`
    if (await auditLogExists(id)) {
      skipped++
      continue
    }

    const job = jobById.get(event.jobId)
    let runId: string | undefined
    let scheduleId: string | undefined
    if (job?.sourceMeta) {
      try {
        const meta = JSON.parse(job.sourceMeta) as { runId?: string; scheduleId?: string }
        runId = meta.runId
        scheduleId = meta.scheduleId
      } catch {
        // ignore
      }
    }

    const targets = [`job:${event.jobId}`]
    if (job?.projectId) targets.push(`project:${job.projectId}`)
    if (runId) targets.push(`run:${runId}`)

    let detail: Record<string, unknown> = {}
    if (event.detail) {
      try {
        detail = JSON.parse(event.detail) as Record<string, unknown>
      } catch {
        detail = { raw: event.detail }
      }
    }

    await logAuditEvent({
      id,
      actor: job ? resolvePipelineActor(job.source, job.sourceMeta) : 'SYSTEM',
      action: mapPipelineStepToAction(event.step, event.level),
      target: targets.join(','),
      projectId: job?.projectId ?? undefined,
      stage: mapPipelineStepToStage(event.step),
      runId,
      pipelineJobId: event.jobId,
      scheduleId,
      level: event.level as 'info' | 'success' | 'warning' | 'error',
      createdAt: event.createdAt,
      metadata: {
        message: event.message,
        step: event.step,
        legacySource: 'pipeline_job_events',
        legacySourceId: event.id,
        ...detail,
      },
    })
    inserted++
  }

  console.log(`pipeline_job_events: inserted ${inserted}, skipped ${skipped}`)
}

async function main() {
  console.log('Backfilling audit_logs from legacy event tables...')
  await backfillWorkflowRunEvents()
  await backfillPipelineJobEvents()
  console.log('Done.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
