import { and, count, desc, eq, like, or, sql } from 'drizzle-orm'
import type { WorkflowStage } from '~~/shared/types/workflow'

export type AuditActor = 'USER' | 'SYSTEM' | 'CRON' | 'TELEGRAM' | 'SERVICE'
export type AuditLevel = 'info' | 'success' | 'warning' | 'error'

export interface LogAuditEventOpts {
  actor: AuditActor | string
  action: string
  actorId?: string
  target?: string
  metadata?: Record<string, unknown>
  projectId?: string
  stage?: WorkflowStage | string | null
  runId?: string
  pipelineJobId?: string
  scheduleId?: string
  level?: AuditLevel | string | null
  id?: string
  createdAt?: Date
}

export interface ListAuditLogsFilters {
  q?: string
  projectId?: string
  stage?: string
  actor?: string
  level?: string
  runId?: string
  action?: string
  limit?: number
  offset?: number
}

const METADATA_MAX = 8000

function truncateMetadata(value: unknown): string | null {
  if (value === undefined || value === null) return null
  const raw = JSON.stringify(value)
  if (raw.length <= METADATA_MAX) return raw
  return `${raw.slice(0, METADATA_MAX)}…`
}

export async function logAuditEvent(opts: LogAuditEventOpts): Promise<string> {
  const { useDB, schema } = await import('~~/server/database')
  const db = useDB()
  const id = opts.id ?? crypto.randomUUID()

  await db.insert(schema.auditLogs).values({
    id,
    actor: opts.actor,
    actorId: opts.actorId ?? null,
    action: opts.action,
    target: opts.target ?? null,
    metadata: truncateMetadata(opts.metadata),
    projectId: opts.projectId ?? null,
    stage: opts.stage ?? null,
    runId: opts.runId ?? null,
    pipelineJobId: opts.pipelineJobId ?? null,
    scheduleId: opts.scheduleId ?? null,
    level: opts.level ?? null,
    createdAt: opts.createdAt ?? new Date(),
  })

  return id
}

export async function listAuditLogs(filters: ListAuditLogsFilters = {}) {
  const { useDB, schema } = await import('~~/server/database')
  const db = useDB()

  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200)
  const offset = Math.max(filters.offset ?? 0, 0)

  const conditions = []

  if (filters.projectId) {
    conditions.push(eq(schema.auditLogs.projectId, filters.projectId))
  }
  if (filters.stage) {
    conditions.push(eq(schema.auditLogs.stage, filters.stage))
  }
  if (filters.actor) {
    conditions.push(eq(schema.auditLogs.actor, filters.actor))
  }
  if (filters.level) {
    conditions.push(eq(schema.auditLogs.level, filters.level))
  }
  if (filters.runId) {
    conditions.push(eq(schema.auditLogs.runId, filters.runId))
  }
  if (filters.action) {
    conditions.push(like(schema.auditLogs.action, `${filters.action}%`))
  }
  if (filters.q?.trim()) {
    const term = `%${filters.q.trim()}%`
    conditions.push(
      or(
        like(schema.auditLogs.action, term),
        like(schema.auditLogs.target, term),
        like(schema.auditLogs.actor, term),
        like(schema.auditLogs.runId, term),
        like(schema.auditLogs.metadata, term),
        like(schema.auditLogs.actorId, term),
      )!,
    )
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [totalRow] = await db
    .select({ total: count() })
    .from(schema.auditLogs)
    .where(whereClause)

  const rows = await db
    .select({
      id: schema.auditLogs.id,
      actor: schema.auditLogs.actor,
      actorId: schema.auditLogs.actorId,
      action: schema.auditLogs.action,
      target: schema.auditLogs.target,
      projectId: schema.auditLogs.projectId,
      stage: schema.auditLogs.stage,
      runId: schema.auditLogs.runId,
      pipelineJobId: schema.auditLogs.pipelineJobId,
      scheduleId: schema.auditLogs.scheduleId,
      level: schema.auditLogs.level,
      createdAt: schema.auditLogs.createdAt,
      hasMetadata: sql<boolean>`CASE WHEN ${schema.auditLogs.metadata} IS NOT NULL AND ${schema.auditLogs.metadata} != '' THEN 1 ELSE 0 END`,
    })
    .from(schema.auditLogs)
    .where(whereClause)
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(limit)
    .offset(offset)

  return {
    items: rows.map((row) => ({
      ...row,
      hasMetadata: Boolean(row.hasMetadata),
    })),
    count: rows.length,
    total: totalRow?.total ?? 0,
  }
}

export async function getAuditLogById(id: string) {
  const { useDB, schema } = await import('~~/server/database')
  const db = useDB()

  const row = await db.query.auditLogs.findFirst({
    where: eq(schema.auditLogs.id, id),
  })

  if (!row) return null

  let metadata: Record<string, unknown> | null = null
  if (row.metadata) {
    try {
      metadata = JSON.parse(row.metadata) as Record<string, unknown>
    } catch {
      metadata = { raw: row.metadata }
    }
  }

  return { ...row, metadata }
}

export async function auditLogExists(id: string): Promise<boolean> {
  const { useDB, schema } = await import('~~/server/database')
  const db = useDB()
  const row = await db.query.auditLogs.findFirst({
    where: eq(schema.auditLogs.id, id),
    columns: { id: true },
  })
  return !!row
}
