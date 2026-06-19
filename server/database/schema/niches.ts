import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const niches = sqliteTable('niches', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  source: text('source').notNull().default('trend-extracted'), // 'seed' | 'trend-extracted' | 'manual'
  trendOrigin: text('trend_origin'), // raw trend that produced this niche
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
  usageCount: integer('usage_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  slugIdx: uniqueIndex('niches_slug_idx').on(table.slug),
}))
