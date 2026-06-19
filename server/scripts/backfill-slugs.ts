/**
 * One-time backfill script to populate slug columns
 * for existing projects and themes.
 *
 * Run via: npx tsx server/scripts/backfill-slugs.ts
 */
import { createClient } from '@libsql/client'
import { slugify } from '../utils/slugify'

const url = process.env.TURSO_DATABASE_URL || 'file:./data/printpasa.db'
const client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
})

async function main() {
    console.log('Backfilling project slugs...')
    const projects = await client.execute('SELECT id, name FROM projects WHERE slug = \'\' OR slug IS NULL')

    for (const row of projects.rows) {
        const id = row.id as string
        const name = row.name as string
        const slug = slugify(name)
        await client.execute({ sql: 'UPDATE projects SET slug = ? WHERE id = ?', args: [slug, id] })
        console.log(`  Project "${name}" → "${slug}"`)
    }
    console.log(`  ${projects.rows.length} project(s) updated.`)

    console.log('Backfilling theme slugs...')
    const themes = await client.execute('SELECT id, title FROM themes WHERE slug = \'\' OR slug IS NULL')

    for (const row of themes.rows) {
        const id = row.id as string
        const title = row.title as string
        const slug = slugify(title)
        await client.execute({ sql: 'UPDATE themes SET slug = ? WHERE id = ?', args: [slug, id] })
        console.log(`  Theme "${title}" → "${slug}"`)
    }
    console.log(`  ${themes.rows.length} theme(s) updated.`)

    console.log('Done!')
}

main().catch(console.error)
