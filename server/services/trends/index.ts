import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import type { TrendProvider } from '~~/shared/types/providers'
import { useDB, schema } from '~~/server/database'
import type { ITrendsProvider, TrendItem, FetchTrendsOpts } from './types'
import { GoogleTrendsProvider } from './providers/google-trends'
import { RedditProvider } from './providers/reddit'

const providerMap: Record<TrendProvider, new () => ITrendsProvider> = {
  'google-trends': GoogleTrendsProvider,
  reddit: RedditProvider,
}

export function createTrendsProvider(provider: TrendProvider): ITrendsProvider {
  const ProviderClass = providerMap[provider]
  if (!ProviderClass) {
    throw createError({ statusCode: 400, statusMessage: `Unknown trends provider: ${provider}` })
  }
  return new ProviderClass()
}

export async function getTrendsProviderForUser(
  _event: H3Event,
  userId: string,
  providerOverride?: TrendProvider,
): Promise<ITrendsProvider> {
  const db = useDB()
  const settings = await db.query.userSettings.findFirst({
    where: eq(schema.userSettings.userId, userId),
  })
  const provider = (providerOverride ?? (settings?.defaultTrendsProvider as TrendProvider | undefined) ?? 'google-trends') as TrendProvider
  return createTrendsProvider(provider)
}

// ---- cache ----
type CacheEntry = { expires: number; items: TrendItem[] }
const cache = new Map<string, CacheEntry>()
const TTL_MS = 60 * 60 * 1000 // 1h

export async function fetchTrendsCached(
  provider: ITrendsProvider,
  opts: FetchTrendsOpts,
): Promise<TrendItem[]> {
  const key = `${provider.name}:${opts.niche}:${opts.limit}`
  const now = Date.now()
  const hit = cache.get(key)
  if (hit && hit.expires > now) return hit.items
  const items = await provider.fetchTrends(opts)
  cache.set(key, { expires: now + TTL_MS, items })
  return items
}

export type { ITrendsProvider, TrendItem, FetchTrendsOpts } from './types'
export {
  fetchAllTrendingNow,
  fetchGoogleTrendingNow,
  fetchSearchApiTrendingNow,
  type TrendingNowItem,
} from './fetch-trending-now'
