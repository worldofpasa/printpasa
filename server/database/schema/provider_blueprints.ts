import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const providerBlueprints = sqliteTable('provider_blueprints', {
  id: text('id').primaryKey(),
  provider: text('provider').notNull(),         // 'printify' | 'printful'
  blueprintId: text('blueprint_id').notNull(),  // numeric ID from provider as string
  title: text('title').notNull(),               // generic title, e.g. "Unisex Cotton T-Shirt"
  brandName: text('brand_name'),                // from print_providers, e.g. "Bella+Canvas 3001"
  description: text('description'),
  imageUrl: text('image_url'),
  basePrice: integer('base_price'),             // cents; null if unavailable from provider API
  previewImageUrl: text('preview_image_url'),   // user-selected or auto-picked preview image
  allImages: text('all_images'),                // JSON array of all blueprint images from Printify
  isBestseller: integer('is_bestseller', { mode: 'boolean' }).notNull().default(false),
  syncedAt: integer('synced_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})
