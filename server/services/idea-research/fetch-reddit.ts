import type { LabeledSignal } from './types'
import { fetchSubredditHotOAuth, getRedditOAuthConfig } from './reddit-client'
import { searchRequest, type SearchCredentials } from './search-provider'

const POSTS_PER_SUB = 5

export async function fetchRedditSignals(
  subreddits: string[],
  opts?: { search?: SearchCredentials | null },
  labelPrefix = 'R',
): Promise<LabeledSignal[]> {
  const signals: LabeledSignal[] = []
  const oauth = getRedditOAuthConfig()
  let index = 1

  for (const subreddit of subreddits) {
    const label = `${labelPrefix}${index}`
    index++
    const query = `r/${subreddit.replace(/^r\//i, '')}`

    try {
      const result = await fetchSubredditPosts(subreddit, POSTS_PER_SUB, { oauth, search: opts?.search })
      if (result.posts.length === 0) {
        signals.push({
          label,
          source: 'reddit',
          query,
          title: '(no posts returned)',
          error: opts?.search || oauth
            ? 'No posts returned from search or Reddit API'
            : 'Configure a search API key (Serper, SearchAPI, or SerpAPI) or NUXT_REDDIT_CLIENT_ID/SECRET',
        })
        continue
      }

      for (const post of result.posts) {
        signals.push({
          label,
          source: 'reddit',
          query,
          title: post.title,
          score: post.score,
          url: post.url,
          detail: result.viaSearch ? 'via Google search' : undefined,
        })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      signals.push({
        label,
        source: 'reddit',
        query,
        title: '(fetch failed)',
        error: message,
      })
    }
  }

  return signals
}

type RedditPost = { title: string; score?: number; url: string }

type FetchSubredditOpts = {
  oauth: ReturnType<typeof getRedditOAuthConfig>
  search?: SearchCredentials | null
}

async function fetchSubredditPosts(
  subreddit: string,
  limit: number,
  opts: FetchSubredditOpts,
): Promise<{ posts: RedditPost[]; viaSearch: boolean }> {
  if (opts.oauth) {
    try {
      const posts = await fetchSubredditHotOAuth(opts.oauth, subreddit, limit)
      if (posts.length > 0) {
        return { posts, viaSearch: false }
      }
    } catch {
      // Fall through to search
    }
  }

  if (opts.search) {
    const posts = await fetchSubredditViaSearch(opts.search, subreddit, limit)
    return { posts, viaSearch: true }
  }

  throw new Error('No search API key configured — Reddit requires search or OAuth credentials')
}

async function fetchSubredditViaSearch(
  creds: SearchCredentials,
  subreddit: string,
  limit: number,
): Promise<RedditPost[]> {
  const clean = subreddit.replace(/^r\//i, '').trim()
  const data = await searchRequest(creds, {
    engine: 'google',
    q: `site:reddit.com/r/${clean}`,
    num: String(Math.min(limit, 10)),
  })

  const organic = data.organic_results as
    | Array<{ title?: string; link?: string; snippet?: string }>
    | undefined

  return (organic ?? [])
    .filter((item) => item.title && item.link?.includes('reddit.com'))
    .slice(0, limit)
    .map((item) => ({
      title: item.title!,
      url: item.link!,
      score: undefined,
    }))
}
