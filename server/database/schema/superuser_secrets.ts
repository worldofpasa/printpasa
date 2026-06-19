import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const superuserSecrets = sqliteTable('superuser_secrets', {
    id: text('id').primaryKey(),
    passwordHash: text('password_hash').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})
