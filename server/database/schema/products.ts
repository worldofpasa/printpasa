import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { projects } from './projects'
import { generatedImages } from './images'

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  imageId: text('image_id').notNull().references(() => generatedImages.id),
  sku: text('sku').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  tags: text('tags'),
  fulfillmentProvider: text('fulfillment_provider').notNull(),
  externalProductId: text('external_product_id'),
  printProviderId: text('print_provider_id'),
  blueprintId: text('blueprint_id'),
  status: text('status').notNull().default('draft'),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  errorMessage: text('error_message'),
  metadata: text('metadata'),
  mockupImages: text('mockup_images'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})
