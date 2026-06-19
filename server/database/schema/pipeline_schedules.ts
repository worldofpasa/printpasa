import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const pipelineSchedules = sqliteTable('pipeline_schedules', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  interval: text('interval').notNull().default('daily'), // 'hourly' | 'daily' | 'weekly'
  cronExpression: text('cron_expression'), // optional for advanced cron
  niche: text('niche').default('holiday'), // target category override (e.g. 'gaming') or 'holiday'
  source: text('source').default('reddit'), // signal source: 'reddit' | 'google-trends'
  discoveryMode: text('discovery_mode').notNull().default('auto'), // 'auto' | 'event' | 'daily'
  maxJobsPerRun: integer('max_jobs_per_run').notNull().default(3),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  lastRunAt: integer('last_run_at', { mode: 'timestamp' }),
  nextRunAt: integer('next_run_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})
