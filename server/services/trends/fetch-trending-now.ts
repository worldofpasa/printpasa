import { resolveSearchCredentials, searchRequest } from '~~/server/services/idea-research/search-provider'
import { fetchGoogleTrendsRss } from './google-trends-rss'

export interface TrendingNowItem {
  title: string
  source: 'google-trends' | 'searchapi-trends'
  rank?: number
  url?: string
}

/** Keyword-free trending from Google Trends RSS (free, stable). */
export async function fetchGoogleTrendingNow(limit = 10): Promise<TrendingNowItem[]> {
  const items = await fetchGoogleTrendsRss(limit)
  return items.map((item) => ({
    title: item.title,
    source: 'google-trends' as const,
    rank: item.rank,
  }))
}

/** Keyword-free trending via SearchAPI google_trends_trending_now engine. */
export async function fetchSearchApiTrendingNow(limit = 10): Promise<TrendingNowItem[]> {
  const creds = await resolveSearchCredentials()
  if (!creds || creds.provider === 'serper') return []

  try {
    const data = await searchRequest(creds, {
      engine: 'google_trends_trending_now',
      geo: 'US',
    })

    const trends = (data.trends as Array<{
      position?: number
      title?: string
      query?: string
    }> | undefined) ?? []

    return trends.slice(0, limit).map((t, idx) => ({
      title: t.title ?? t.query ?? 'Unknown trend',
      source: 'searchapi-trends' as const,
      rank: t.position ?? idx + 1,
    }))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[trends] SearchAPI trending now failed:', message)
    return []
  }
}

export async function fetchAllTrendingNow(limit = 10): Promise<TrendingNowItem[]> {
  const [google, searchapi] = await Promise.all([
    fetchGoogleTrendingNow(limit),
    fetchSearchApiTrendingNow(limit),
  ])

  const seen = new Set<string>()
  const merged: TrendingNowItem[] = []

  for (const item of [...google, ...searchapi]) {
    const key = item.title.toLowerCase().trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    merged.push(item)
    if (merged.length >= limit) break
  }

  return merged
}
