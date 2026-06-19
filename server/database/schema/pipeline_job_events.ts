import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { pipelineJobs } from './pipeline_jobs'

export const pipelineJobEvents = sqliteTable('pipeline_job_events', {
  id: text('id').primaryKey(),
  jobId: text('job_id').notNull().references(() => pipelineJobs.id, { onDelete: 'cascade' }),
  step: text('step').notNull(),
  level: text('level').notNull(),
  message: text('message').notNull(),
  detail: text('detail'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})
