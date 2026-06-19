import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const providers = sqliteTable('providers', {
    id: text('id').primaryKey(),
    label: text('label').notNull(),
    capabilities: text('capabilities', { mode: 'json' }).notNull(),
    credentialSource: text('credential_source').notNull(),
    runtimeConfigKey: text('runtime_config_key'),
    userSettingsKey: text('user_settings_key'),
    envVarName: text('env_var_name'),
    models: text('models', { mode: 'json' }),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})
