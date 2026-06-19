import type { TrendProvider } from '~~/shared/types/providers'

export interface TrendItem {
  title: string
  source: TrendProvider
  score?: number
  url?: string
}

export interface FetchTrendsOpts {
  niche: string
  limit: number
}

export interface ITrendsProvider {
  readonly name: TrendProvider
  fetchTrends(opts: FetchTrendsOpts): Promise<TrendItem[]>
}
