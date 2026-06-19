import { useDB, schema } from '~~/server/database'
import { eq } from 'drizzle-orm'
import type { PipelineEventLevel, PipelineNotifyTarget, PipelineStep } from './types'

export async function getSuccessfulSteps(jobId: string): Promise<Set<PipelineStep>> {
  const db = useDB()
  const events = await db.query.pipelineJobEvents.findMany({
    where: eq(schema.pipelineJobEvents.jobId, jobId),
  })
  return new Set(
    events
      .filter((e) => e.level === 'success')
      .map((e) => e.step as PipelineStep),
  )
}
import { sendTelegramMessage } from '../telegram/notify'

function truncateDetail(value: unknown, max = 2000): string {
  const raw = JSON.stringify(value)
  if (raw.length <= max) return raw
  return `${raw.slice(0, max)}…`
}

function resolvePipelineActor(source: string, sourceMeta?: string | null): string {
  if (source === 'cron') return 'CRON'
  if (source === 'telegram') return 'TELEGRAM'
  if (sourceMeta) {
    try {
      const meta = JSON.parse(sourceMeta) as { scheduleId?: string }
      if (meta.scheduleId) return 'CRON'
      if (meta.chatId) return 'TELEGRAM'
    } catch {
      // ignore
    }
  }
  return 'SYSTEM'
}

function parseJobContext(job: {
  projectId: string | null
  source: string
  sourceMeta: string | null
}) {
  let runId: string | undefined
  let scheduleId: string | undefined

  if (job.sourceMeta) {
    try {
      const meta = JSON.parse(job.sourceMeta) as { runId?: string; scheduleId?: string }
      runId = meta.runId
      scheduleId = meta.scheduleId
    } catch {
      // ignore
    }
  }

  return {
    projectId: job.projectId ?? undefined,
    runId,
    scheduleId,
    actor: resolvePipelineActor(job.source, job.sourceMeta),
  }
}

export async function insertPipelineEvent(
  jobId: string,
  step: PipelineStep | string,
  level: PipelineEventLevel,
  message: string,
  detail?: unknown,
) {
  const db = useDB()
  await db.insert(schema.pipelineJobEvents).values({
    id: crypto.randomUUID(),
    jobId,
    step,
    level,
    message,
    detail: detail !== undefined ? truncateDetail(detail) : null,
  })

  const job = await db.query.pipelineJobs.findFirst({
    where: eq(schema.pipelineJobs.id, jobId),
    columns: { projectId: true, source: true, sourceMeta: true },
  })

  if (job) {
    const ctx = parseJobContext(job)
    const { logAuditEvent } = await import('../audit-log')
    const { mapPipelineStepToAction, mapPipelineStepToStage } = await import('../audit-log/mappers')

    const targets = [`job:${jobId}`]
    if (ctx.projectId) targets.push(`project:${ctx.projectId}`)
    if (ctx.runId) targets.push(`run:${ctx.runId}`)

    const parsedDetail =
      detail && typeof detail === 'object' && !Array.isArray(detail)
        ? (detail as Record<string, unknown>)
        : detail !== undefined
          ? { value: detail }
          : {}

    await logAuditEvent({
      actor: ctx.actor,
      action: mapPipelineStepToAction(step, level),
      target: targets.join(','),
      projectId: ctx.projectId,
      stage: mapPipelineStepToStage(step),
      runId: ctx.runId,
      pipelineJobId: jobId,
      scheduleId: ctx.scheduleId,
      level,
      metadata: {
        message,
        step,
        ...parsedDetail,
      },
    })
  }
}

export async function updateJobStep(jobId: string, currentStep: string) {
  const db = useDB()
  await db
    .update(schema.pipelineJobs)
    .set({ currentStep, updatedAt: new Date() })
    .where(eq(schema.pipelineJobs.id, jobId))
}

export async function recordStep<T>(
  jobId: string,
  step: PipelineStep,
  fn: () => Promise<T>,
  opts?: {
    recoverable?: boolean
    notify?: PipelineNotifyTarget | null
    stepLabel?: string
  },
): Promise<T> {
  const started = Date.now()
  const label = opts?.stepLabel ?? step
  try {
    const result = await fn()
    const durationMs = Date.now() - started
    await insertPipelineEvent(jobId, step, 'success', `${label} completed`, { durationMs })
    console.log(`[pipeline] job=${jobId} step=${step} ok (${durationMs}ms)`)
    return result
  } catch (error: unknown) {
    const durationMs = Date.now() - started
    const err = error as { statusCode?: number; statusMessage?: string; message?: string; data?: unknown }
    const reason =
      err.statusMessage ?? err.message ?? (error instanceof Error ? error.message : String(error))
    const detail = {
      durationMs,
      statusCode: err.statusCode,
      message: reason,
      data: err.data,
    }

    if (opts?.recoverable) {
      await insertPipelineEvent(jobId, step, 'warning', `${label} failed: ${reason}`, detail)
      console.warn(`[pipeline] job=${jobId} step=${step} warning: ${reason}`)
      if (opts.notify) {
        await sendTelegramMessage(
          opts.notify.chatId,
          `⚠️ Pipeline warning — ${label}\n${reason}\nContinuing…`,
          opts.notify.replyToMessageId,
        ).catch((e) => console.error('[telegram] warning notify failed', e))
      }
      throw error
    }

    await insertPipelineEvent(jobId, step, 'error', `${label} failed: ${reason}`, detail)
    console.error(`[pipeline] job=${jobId} step=${step} error: ${reason}`)
    if (opts?.notify) {
      await sendTelegramMessage(
        opts.notify.chatId,
        `❌ Pipeline failed — ${label}\n${reason}\nJob: ${jobId}`,
        opts.notify.replyToMessageId,
      ).catch((e) => console.error('[telegram] error notify failed', e))
    }
    throw error
  }
}

export async function recordRecoverableWarning(
  jobId: string,
  step: PipelineStep,
  message: string,
  detail?: unknown,
  notify?: PipelineNotifyTarget | null,
) {
  await insertPipelineEvent(jobId, step, 'warning', message, detail)
  console.warn(`[pipeline] job=${jobId} step=${step} warning: ${message}`)
  if (notify) {
    await sendTelegramMessage(
      notify.chatId,
      `⚠️ Pipeline warning — ${step}\n${message}\nContinuing…`,
      notify.replyToMessageId,
    ).catch((e) => console.error('[telegram] warning notify failed', e))
  }
}

export async function getJobEventSummary(jobId: string) {
  const db = useDB()
  const events = await db.query.pipelineJobEvents.findMany({
    where: eq(schema.pipelineJobEvents.jobId, jobId),
  })
  const success = events.filter((e) => e.level === 'success').length
  const warnings = events.filter((e) => e.level === 'warning')
  const errors = events.filter((e) => e.level === 'error').length
  return { success, warnings, errors, warningMessages: warnings.map((w) => w.message) }
}
