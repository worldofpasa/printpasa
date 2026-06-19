import { fetchAllTrendingNow } from '~~/server/services/trends/fetch-trending-now'
import { classifyTrends } from './trend-classifier'
import { upsertNiches, getEvergreenNiches } from './niche-db'
import type { TopicSeed } from './types'

const STARTER_EVERGREEN_NICHES = [
  { slug: 'dog-lovers', name: 'Dog Lovers & Pet Parents', description: 'Passionate dog owners who treat their pets like family' },
  { slug: 'coffee-culture', name: 'Coffee Culture', description: 'Coffee addicts and cafe enthusiasts who live for their morning cup' },
  { slug: 'gym-motivation', name: 'Gym Motivation & Fitness Grind', description: 'Weightlifters and fitness enthusiasts who embrace the grind' },
  { slug: 'gaming-esports', name: 'Gaming & Esports Culture', description: 'Gamers and esports fans who proudly identify with the culture' },
  { slug: 'plant-parents', name: 'Plant Parents', description: 'Houseplant enthusiasts who love collecting and nurturing plants' },
  { slug: 'hiking-camping', name: 'Outdoor Hiking & Camping', description: 'Outdoor adventurers who live for trails and camping trips' },
  { slug: 'teacher-life', name: 'Teacher Life', description: 'Teachers who bond over the joys and struggles of classroom life' },
  { slug: 'nurse-life', name: 'Nurse Life & Healthcare Heroes', description: 'Nurses and healthcare workers who take pride in their calling' },
  { slug: 'fishing-anglers', name: 'Fishing & Weekend Anglers', description: 'Fishing enthusiasts who live for early mornings on the water' },
  { slug: 'book-lovers', name: 'Book Lovers', description: 'Avid readers who identify strongly with the reading community' },
]

async function seedEvergreenNiches(): Promise<void> {
  const { useDB, schema } = await import('~~/server/database')
  const { eq } = await import('drizzle-orm')
  const db = useDB()
  for (const n of STARTER_EVERGREEN_NICHES) {
    const existing = await db.query.niches.findFirst({ where: eq(schema.niches.slug, n.slug) })
    if (!existing) {
      await db.insert(schema.niches).values({
        id: crypto.randomUUID(),
        slug: n.slug,
        name: n.name,
        description: n.description,
        source: 'seed',
        trendOrigin: null,
        isActive: true,
        usageCount: 0,
      })
      console.log(`[daily-seeds] seeded evergreen niche: "${n.name}"`)
    }
  }
}

function nicheToSeed(name: string, slug: string, source: TopicSeed['source'], trendOrigin?: string, rank?: number): TopicSeed {
  const ideaDescription = [
    `Create print-on-demand t-shirt designs for the "${name}" niche.`,
    'Research what this community is passionate about and turn cultural identity into specific, commercially viable t-shirt themes.',
    'Focus on identity-signaling designs for passionate audiences — not generic slogans.',
  ].join(' ')

  return {
    ideaDescription,
    projectName: `${name} Tees`,
    source,
    sourceMeta: {
      trendQuery: trendOrigin,
      nicheSlug: slug,
      rank,
    },
  }
}

export async function buildDailySeeds(limit = 10): Promise<TopicSeed[]> {
  // Ensure evergreen niches are seeded on first run
  await seedEvergreenNiches()

  // Fetch trending topics
  const trends = await fetchAllTrendingNow(limit * 3)
  const titles = trends.map(t => t.title)

  // Classify all trends through IP filter + niche extractor (single AI call)
  const classified = await classifyTrends(titles)

  const safeClassified = classified.filter(c => c.safe)
  console.log(
    `[daily-seeds] classified ${titles.length} trends: ${safeClassified.length} safe, ${classified.length - safeClassified.length} rejected`,
    classified.filter(c => !c.safe).map(c => `"${c.original}" (${c.reason})`),
  )

  // Upsert new safe niches into DB
  const trendNiches = await upsertNiches(classified)

  // Build seeds from trend-derived niches (up to limit)
  const seeds: TopicSeed[] = []
  const usedSlugs: string[] = []

  for (const niche of trendNiches.slice(0, limit)) {
    const rawTrend = trends.find(
      t => classified.find(c => c.original === t.title && c.slug === niche.slug)
    )
    seeds.push(nicheToSeed(niche.name, niche.slug, 'google-trends', niche.trendOrigin ?? undefined, rawTrend?.rank))
    usedSlugs.push(niche.slug)
  }

  // Fill remaining slots with evergreen niches from DB
  const remaining = limit - seeds.length
  if (remaining > 0) {
    const evergreen = await getEvergreenNiches(remaining, usedSlugs)
    for (const niche of evergreen) {
      seeds.push(nicheToSeed(niche.name, niche.slug, 'google-trends', undefined))
      usedSlugs.push(niche.slug)
    }
    console.log(`[daily-seeds] filled ${evergreen.length} slots from evergreen niche DB`)
  }

  if (seeds.length === 0) {
    console.warn('[daily-seeds] no seeds produced (no trends classified safe + no evergreen niches found)')
  }

  return seeds
}
