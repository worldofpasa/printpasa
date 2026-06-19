import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { themes } from './themes'

export const imagePrompts = sqliteTable('image_prompts', {
  id: text('id').primaryKey(),
  themeId: text('theme_id').notNull().references(() => themes.id, { onDelete: 'cascade' }),
  promptText: text('prompt_text').notNull(),
  originalPromptText: text('original_prompt_text').notNull(),
  style: text('style'),
  designLane: text('design_lane'),
  sloganText: text('slogan_text'),
  recommendedModel: text('recommended_model'),
  backgroundColorHex: text('background_color_hex'),
  backgroundColorName: text('background_color_name'),
  sortOrder: integer('sort_order').notNull().default(0),
  isSelected: integer('is_selected', { mode: 'boolean' }).notNull().default(true),
  status: text('status').notNull().default('active'),
  generationBatch: text('generation_batch'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})
