import { defineConfig } from 'drizzle-kit'

const url = process.env.TURSO_DATABASE_URL || 'file:./data/printpasa.db'
export default defineConfig({
  schema: './server/database/schema/index.ts',
  out: './server/database/migrations',
  dialect: url.startsWith('libsql') || url.startsWith('http') ? 'turso' : 'sqlite',
  dbCredentials: {
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
})
