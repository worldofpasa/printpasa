export type WorkflowRunSource = 'ui' | 'telegram' | 'cron'
export type WorkflowRunPhase = 'discovery' | 'research' | 'themes' | 'pipeline'
export type WorkflowRunLevel = 'info' | 'success' | 'warning' | 'error'

export interface LogWorkflowRunEventOpts {
  runId: string
  source: WorkflowRunSource
  phase: WorkflowRunPhase
  level: WorkflowRunLevel
  message: string
  detail?: Record<string, unknown>
  projectId?: string
  pipelineJobId?: string
  scheduleId?: string
}

export interface StartWorkflowRunOpts {
  scheduleId?: string
  projectId?: string
  pipelineJobId?: string
}

export function startWorkflowRun(
  source: WorkflowRunSource,
  opts: StartWorkflowRunOpts = {},
): string {
  const runId = crypto.randomUUID()
  console.log(`[workflow-run] runId=${runId} source=${source} phase=init level=info message="Run started"`)

  void import('../audit-log').then(({ logAuditEvent }) =>
    logAuditEvent({
      actor: source === 'ui' ? 'USER' : source === 'cron' ? 'CRON' : 'TELEGRAM',
      action: 'workflow.run_started',
      target: `run:${runId}`,
      runId,
      projectId: opts.projectId,
      pipelineJobId: opts.pipelineJobId,
      scheduleId: opts.scheduleId,
      stage: 'gather-idea',
      level: 'info',
      metadata: { source, message: 'Run started' },
    }),
  )

  return runId
}

export async function logWorkflowRunEvent(opts: LogWorkflowRunEventOpts): Promise<void> {
  const { useDB, schema } = await import('~~/server/database')
  const db = useDB()

  const detailJson = opts.detail ? JSON.stringify(opts.detail) : null

  console.log(
    `[workflow-run] runId=${opts.runId} source=${opts.source} phase=${opts.phase} level=${opts.level} message="${opts.message.replace(/"/g, '\\"')}"`,
  )

  await db.insert(schema.workflowRunEvents).values({
    id: crypto.randomUUID(),
    runId: opts.runId,
    source: opts.source,
    projectId: opts.projectId ?? null,
    pipelineJobId: opts.pipelineJobId ?? null,
    scheduleId: opts.scheduleId ?? null,
    phase: opts.phase,
    level: opts.level,
    message: opts.message,
    detail: detailJson,
  })

  const {
    logAuditEvent,
  } = await import('../audit-log')
  const {
    mapWorkflowSourceToActor,
    mapWorkflowPhaseToAction,
    mapWorkflowPhaseToStage,
  } = await import('../audit-log/mappers')

  const targets = [`run:${opts.runId}`]
  if (opts.projectId) targets.push(`project:${opts.projectId}`)
  if (opts.pipelineJobId) targets.push(`job:${opts.pipelineJobId}`)

  await logAuditEvent({
    actor: mapWorkflowSourceToActor(opts.source),
    action: mapWorkflowPhaseToAction(opts.phase, opts.level, opts.message),
    target: targets.join(','),
    runId: opts.runId,
    projectId: opts.projectId,
    pipelineJobId: opts.pipelineJobId,
    scheduleId: opts.scheduleId,
    stage: mapWorkflowPhaseToStage(opts.phase),
    level: opts.level,
    metadata: {
      message: opts.message,
      phase: opts.phase,
      source: opts.source,
      ...(opts.detail ?? {}),
    },
  })
}

export async function getWorkflowRunEvents(runId: string) {
  const { eq } = await import('drizzle-orm')
  const { useDB, schema } = await import('~~/server/database')
  const db = useDB()
  return db.query.workflowRunEvents.findMany({
    where: eq(schema.workflowRunEvents.runId, runId),
    orderBy: (events, { asc }) => [asc(events.createdAt)],
  })
}

export async function getWorkflowRunEventsForJob(pipelineJobId: string) {
  const { eq } = await import('drizzle-orm')
  const { useDB, schema } = await import('~~/server/database')
  const db = useDB()
  return db.query.workflowRunEvents.findMany({
    where: eq(schema.workflowRunEvents.pipelineJobId, pipelineJobId),
    orderBy: (events, { asc }) => [asc(events.createdAt)],
  })
}
