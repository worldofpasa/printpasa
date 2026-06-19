import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { users } from './users'
import { providerBlueprints } from './provider_blueprints'

export const catalogItems = sqliteTable('catalog_items', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),  // 'printify' | 'printful'
  providerBlueprintId: text('provider_blueprint_id').notNull().references(() => providerBlueprints.id, { onDelete: 'cascade' }),
  category: text('category').notNull(),  // 'tshirt' | 'hoodie' | 'tanktop' | 'cap' | 'tote' | 'cup'
  displayName: text('display_name').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})
