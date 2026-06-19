import { useDB, schema } from '~~/server/database'
import { eq } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { PrintifyProvider } from '~~/server/services/fulfilment/providers/printify'
import { seedBestsellersIfNeeded } from '~~/server/database/seeds/bestsellers'

// Keywords that Printify uses in blueprint titles for each category.
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  tshirt:  ['t-shirt', 'tshirt', 'tee'],
  hoodie:  ['hoodie', 'sweatshirt', 'pullover', 'zip-up', 'crewneck'],
  tanktop: ['tank', 'sleeveless', 'muscle'],
  cap:     ['cap', 'hat', 'beanie', 'snapback', 'trucker', 'bucket hat'],
  tote:    ['tote', 'tote bag'],
  cup:     ['mug', 'cup', 'tumbler', 'bottle', 'flask'],
}

// Simple in-process cache so repeated browse requests within a session don't
// re-fetch the full Printify catalog (~1000 items, one API call).
let cachedBlueprints: Array<{ id: string; title: string; brandName: string | null; description: string; imageUrl: string }> | null = null
let cacheProvider = ''
let cacheExpiry = 0

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = useDB()
  const config = useRuntimeConfig()

  const query = getQuery(event)
  const provider = (query.provider as string) || 'printify'
  const search = (query.search as string).trim().toLowerCase()
  const category = (query.category as string) || ''
  const perPage = Math.min(100, Math.max(1, parseInt(String(query.perPage ?? '48'), 10)))

  if (provider !== 'printify') {
    return { blueprints: [] }
  }

  // Fetch full blueprint list from Printify (cached for 10 min per process)
  const now = Date.now()
  if (!cachedBlueprints || cacheProvider !== provider || now > cacheExpiry) {
    const settings = await db.query.userSettings.findFirst({
      where: eq(schema.userSettings.userId, user.id),
    })
    const apiKey = (settings?.printifyApiKey ?? config.printifyApiKey) as string | undefined
    if (!apiKey) {
      throw createError({ statusCode: 400, statusMessage: 'No Printify API key configured.' })
    }
    const printify = new PrintifyProvider(apiKey)
    const all = await printify.syncAllBlueprints()
    cachedBlueprints = all.map(b => ({ id: b.id, title: b.title, brandName: b.brandName, description: b.description ?? '', imageUrl: b.imageUrl }))
    cacheProvider = provider
    cacheExpiry = now + 10 * 60 * 1000
  }

  // Filter: free-text search takes priority over category keywords
  let filtered = cachedBlueprints
  if (search) {
    filtered = filtered.filter(b => b.title.toLowerCase().includes(search))
  } else if (category && CATEGORY_KEYWORDS[category]) {
    const kws = CATEGORY_KEYWORDS[category]!
    filtered = filtered.filter(b => {
      const t = b.title.toLowerCase()
      return kws.some(kw => t.includes(kw))
    })
  }

  // Seed bestseller rows on first browse (no-op if already seeded)
  await seedBestsellersIfNeeded()

  // Load bestseller + in-catalog flags from DB in one query
  const dbRows = await db.select({
    blueprintId: schema.providerBlueprints.blueprintId,
    isBestseller: schema.providerBlueprints.isBestseller,
  }).from(schema.providerBlueprints).where(eq(schema.providerBlueprints.provider, provider))

  const bestsellerIds = new Set(dbRows.filter(r => r.isBestseller).map(r => r.blueprintId))

  // Load catalog items for this user
  const catalogRows = await db.select({ blueprintId: schema.providerBlueprints.blueprintId })
    .from(schema.catalogItems)
    .innerJoin(schema.providerBlueprints, eq(schema.catalogItems.providerBlueprintId, schema.providerBlueprints.id))
    .where(eq(schema.catalogItems.userId, user.id))

  const inCatalog = new Set(catalogRows.map(r => r.blueprintId))

  // Sort: bestsellers first, then rest
  const sorted = [
    ...filtered.filter(b => bestsellerIds.has(b.id)),
    ...filtered.filter(b => !bestsellerIds.has(b.id)),
  ]

  return {
    blueprints: sorted.slice(0, perPage).map(b => ({
      blueprintId: b.id,
      provider,
      title: b.title,
      brandName: b.brandName,
      imageUrl: b.imageUrl,
      isBestseller: bestsellerIds.has(b.id),
      inCatalog: inCatalog.has(b.id),
    })),
    total: filtered.length,
  }
})
