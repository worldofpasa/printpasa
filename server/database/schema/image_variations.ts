import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { generatedImages } from './images'

export const imageVariations = sqliteTable('image_variations', {
  id: text('id').primaryKey(),
  imageId: text('image_id').notNull().references(() => generatedImages.id, { onDelete: 'cascade' }),
  parentVariationId: text('parent_variation_id'),
  name: text('name').notNull(),
  kind: text('kind').notNull(),
  format: text('format').notNull().default('png'),
  mimeType: text('mime_type').notNull().default('image/png'),
  width: integer('width'),
  height: integer('height'),
  fileSize: integer('file_size'),
  s3Key: text('s3_key'),
  url: text('url').notNull(),
  metadata: text('metadata'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  imageIdIdx: index('image_variations_image_id_idx').on(table.imageId),
}))
