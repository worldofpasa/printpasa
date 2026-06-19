import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const pipelineJobs = sqliteTable('pipeline_jobs', {
  id: text('id').primaryKey(),
  status: text('status').notNull().default('pending'),
  source: text('source').notNull().default('telegram'),
  sourceMeta: text('source_meta'),
  ideaText: text('idea_text').notNull(),
  projectName: text('project_name'),
  projectId: text('project_id'),
  projectSlug: text('project_slug'),
  currentStep: text('current_step'),
  errorMessage: text('error_message'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
})
