import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { projects } from './projects'
import { pipelineJobs } from './pipeline_jobs'

export const workflowRunEvents = sqliteTable('workflow_run_events', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull(),
  source: text('source').notNull(), // 'ui' | 'telegram' | 'cron'
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  pipelineJobId: text('pipeline_job_id').references(() => pipelineJobs.id, { onDelete: 'set null' }),
  scheduleId: text('schedule_id'),
  phase: text('phase').notNull(), // 'discovery' | 'research' | 'themes' | 'pipeline'
  level: text('level').notNull(), // 'info' | 'success' | 'warning' | 'error'
  message: text('message').notNull(),
  detail: text('detail'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})
