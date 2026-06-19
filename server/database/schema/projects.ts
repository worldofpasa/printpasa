import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { users } from './users'

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  slug: text('slug').notNull().default(''),
  description: text('description'),
  currentStage: text('current_stage').notNull().default('gather-idea'),
  trendSource: text('trend_source'),
  niche: text('niche'),
  customNiche: text('custom_niche'),
  themeCount: integer('theme_count').default(10),
  trendingTopicsSnapshot: text('trending_topics_snapshot'),
  researchSnapshot: text('research_snapshot'),
  validationSnapshot: text('validation_snapshot'),
  aiProvider: text('ai_provider'),
  imageProvider: text('image_provider'),
  fulfillmentProvider: text('fulfillment_provider'),
  status: text('status').notNull().default('active'),
  originSource: text('origin_source').notNull().default('portal'),
  originActor: text('origin_actor'),
  originMeta: text('origin_meta'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  userSlugIdx: uniqueIndex('user_slug_idx').on(table.userId, table.slug),
}))
