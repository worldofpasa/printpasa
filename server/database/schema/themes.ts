import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { projects } from './projects'

export const themes = sqliteTable('themes', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  slug: text('slug').notNull().default(''),
  description: text('description'),
  targetDemographic: text('target_demographic'),
  contextNotes: text('context_notes'),
  trendScore: real('trend_score'),
  isValidated: integer('is_validated', { mode: 'boolean' }).notNull().default(false),
  validationNotes: text('validation_notes'),
  patentSafe: integer('patent_safe', { mode: 'boolean' }),
  copyrightSafe: integer('copyright_safe', { mode: 'boolean' }),
  trademarkSafe: integer('trademark_safe', { mode: 'boolean' }),
  isWinner: integer('is_winner', { mode: 'boolean' }).notNull().default(false),
  isSelected: integer('is_selected', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  generationBatch: text('generation_batch'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})
