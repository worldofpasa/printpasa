import { fetchGoogleTrendsRss } from '../google-trends-rss'
import type { ITrendsProvider, TrendItem, FetchTrendsOpts } from '../types'

export class GoogleTrendsProvider implements ITrendsProvider {
  readonly name = 'google-trends' as const

  async fetchTrends(opts: FetchTrendsOpts): Promise<TrendItem[]> {
    try {
      const items = await fetchGoogleTrendsRss(opts.limit)
      if (items.length === 0) {
        throw createError({
          statusCode: 502,
          statusMessage: 'Google Trends RSS returned no items. Try Reddit or manual entry.',
        })
      }

      return items.map((item) => ({
        title: item.title,
        source: this.name,
        score: undefined,
        url: undefined,
      }))
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'statusCode' in err) throw err
      const message = err instanceof Error ? err.message : 'unknown error'
      throw createError({
        statusCode: 502,
        statusMessage: `Google Trends unavailable: ${message}. Try Reddit or manual entry.`,
      })
    }
  }
}
