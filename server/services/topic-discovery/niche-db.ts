import { eq, isNull, asc, and } from 'drizzle-orm'
import { useDB, schema } from '~~/server/database'
import type { ClassifiedTrend } from './trend-classifier'

export interface NicheRow {
  id: string
  slug: string
  name: string
  description: string | null
  source: string
  trendOrigin: string | null
  isActive: boolean
  lastUsedAt: Date | null
  usageCount: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Upsert classified trends into the niches table.
 * Skips any that already exist (by slug). Only inserts new ones.
 * Returns all niches that are active and ready to be used as seeds.
 */
export async function upsertNiches(classified: ClassifiedTrend[]): Promise<NicheRow[]> {
  const db = useDB()
  const safe = classified.filter(c => c.safe && c.slug && c.niche)

  for (const c of safe) {
    const existing = await db.query.niches.findFirst({
      where: eq(schema.niches.slug, c.slug!),
    })
    if (!existing) {
      await db.insert(schema.niches).values({
        id: crypto.randomUUID(),
        slug: c.slug!,
        name: c.niche!,
        description: c.description,
        source: 'trend-extracted',
        trendOrigin: c.original,
        isActive: true,
        usageCount: 0,
      })
      console.log(`[niche-db] inserted new niche: "${c.niche}" (slug: ${c.slug}) from trend: "${c.original}"`)
    }
  }

  // Return the niche rows that match the current safe classified set
  const slugs = safe.map(c => c.slug!)
  if (slugs.length === 0) return []

  const rows: NicheRow[] = []
  for (const slug of slugs) {
    const row = await db.query.niches.findFirst({
      where: and(eq(schema.niches.slug, slug), eq(schema.niches.isActive, true)),
    })
    if (row) rows.push(row as NicheRow)
  }
  return rows
}

/**
 * Get evergreen niches from the DB for filling empty pipeline slots.
 * Ordered by lastUsedAt ASC (never-used first, then stale first).
 * Excludes slugs already picked in this run.
 */
export async function getEvergreenNiches(limit: number, excludeSlugs: string[] = []): Promise<NicheRow[]> {
  if (limit <= 0) return []
  const db = useDB()

  // Get never-used first
  const neverUsed = await db.query.niches.findMany({
    where: and(eq(schema.niches.isActive, true), isNull(schema.niches.lastUsedAt)),
    orderBy: [asc(schema.niches.createdAt)],
  })

  const stale = await db.query.niches.findMany({
    where: and(eq(schema.niches.isActive, true)),
    orderBy: [asc(schema.niches.lastUsedAt)],
  })

  const seen = new Set<string>(excludeSlugs)
  const result: NicheRow[] = []

  for (const row of [...neverUsed, ...stale]) {
    if (result.length >= limit) break
    if (seen.has(row.slug)) continue
    seen.add(row.slug)
    result.push(row as NicheRow)
  }

  return result
}

/**
 * Mark a niche as used after a pipeline project is created from it.
 */
export async function markNicheUsed(slug: string): Promise<void> {
  const db = useDB()
  const existing = await db.query.niches.findFirst({
    where: eq(schema.niches.slug, slug),
  })
  if (!existing) return
  await db
    .update(schema.niches)
    .set({
      lastUsedAt: new Date(),
      usageCount: existing.usageCount + 1,
      updatedAt: new Date(),
    })
    .where(eq(schema.niches.slug, slug))
}
