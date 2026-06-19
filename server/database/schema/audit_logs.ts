import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { projects } from './projects'
import { pipelineJobs } from './pipeline_jobs'

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  actor: text('actor').notNull(),
  actorId: text('actor_id'),
  action: text('action').notNull(),
  target: text('target'),
  metadata: text('metadata'),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  stage: text('stage'),
  runId: text('run_id'),
  pipelineJobId: text('pipeline_job_id').references(() => pipelineJobs.id, { onDelete: 'set null' }),
  scheduleId: text('schedule_id'),
  level: text('level'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
  projectIdIdx: index('audit_logs_project_id_idx').on(table.projectId),
  stageIdx: index('audit_logs_stage_idx').on(table.stage),
  runIdIdx: index('audit_logs_run_id_idx').on(table.runId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
}))
