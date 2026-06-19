import type { ITrendsProvider, TrendItem, FetchTrendsOpts } from '../types'

const NICHE_TO_SUBREDDIT: Record<string, string> = {
  'gen-z': 'teenagers',
  millennials: 'Millennials',
  moms: 'Mommit',
  dads: 'daddit',
  pets: 'aww',
  nurse: 'nursing',
  teacher: 'Teachers',
  gamer: 'gaming',
  fitness: 'fitness',
  foodie: 'food',
}

const USER_AGENT = 'printpasa/0.1 (trend aggregator)'

export class RedditProvider implements ITrendsProvider {
  readonly name = 'reddit' as const

  async fetchTrends(opts: FetchTrendsOpts): Promise<TrendItem[]> {
    const subreddit = resolveSubreddit(opts.niche)
    const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${Math.min(opts.limit, 100)}`

    let res: Response
    try {
      res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    } catch (err: any) {
      throw createError({
        statusCode: 502,
        statusMessage: `Reddit unreachable: ${err?.message ?? 'network error'}`,
      })
    }

    if (!res.ok) {
      throw createError({
        statusCode: 502,
        statusMessage: `Reddit returned ${res.status} for r/${subreddit}`,
      })
    }

    const data = (await res.json()) as {
      data: { children: Array<{ data: { title: string; score: number; permalink: string; stickied?: boolean } }> }
    }

    const posts = (data.data?.children ?? [])
      .map((c) => c.data)
      .filter((p) => !p.stickied)
      .slice(0, opts.limit)

    return posts.map((p) => ({
      title: p.title,
      source: this.name,
      score: p.score,
      url: `https://www.reddit.com${p.permalink}`,
    }))
  }
}

function resolveSubreddit(niche: string): string {
  return NICHE_TO_SUBREDDIT[niche] ?? 'all'
}
