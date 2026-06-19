import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as schema from './schema'
import { join } from 'path'
import { mkdirSync } from 'fs'

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function useDB() {
  if (!_db) {
    const url = process.env.TURSO_DATABASE_URL || 'file:./data/printpasa.db'

    if (url.startsWith('file:')) {
      const dbDir = join(process.cwd(), 'data')
      try {
        mkdirSync(dbDir, { recursive: true })
      } catch (e) {
        console.warn('Could not create data directory', e)
      }
    }

    const client = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
    _db = drizzle(client, { schema })
  }
  return _db
}

export { schema }
