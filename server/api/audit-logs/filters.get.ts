import { sql } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { useDB, schema } from '~~/server/database'
import { WORKFLOW_STAGES, STAGE_LABELS } from '~~/shared/types/workflow'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  if (!user.isSuperuser) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const db = useDB()

  const projectRows = await db
    .selectDistinct({
      id: schema.auditLogs.projectId,
      name: schema.projects.name,
    })
    .from(schema.auditLogs)
    .leftJoin(schema.projects, sql`${schema.auditLogs.projectId} = ${schema.projects.id}`)
    .where(sql`${schema.auditLogs.projectId} IS NOT NULL`)
    .orderBy(schema.projects.name)

  const actorRows = await db
    .selectDistinct({ actor: schema.auditLogs.actor })
    .from(schema.auditLogs)
    .orderBy(schema.auditLogs.actor)

  const stageRows = await db
    .selectDistinct({ stage: schema.auditLogs.stage })
    .from(schema.auditLogs)
    .where(sql`${schema.auditLogs.stage} IS NOT NULL`)
    .orderBy(schema.auditLogs.stage)

  const knownStages = new Set(WORKFLOW_STAGES)
  const stages = stageRows
    .map((row) => row.stage)
    .filter((stage): stage is string => !!stage && knownStages.has(stage as typeof WORKFLOW_STAGES[number]))
    .map((stage) => ({
      id: stage,
      label: STAGE_LABELS[stage as keyof typeof STAGE_LABELS],
    }))

  return {
    projects: projectRows
      .filter((row) => row.id)
      .map((row) => ({ id: row.id!, name: row.name ?? 'Unknown project' })),
    actors: actorRows.map((row) => row.actor),
    stages,
    levels: ['info', 'success', 'warning', 'error'],
  }
})
