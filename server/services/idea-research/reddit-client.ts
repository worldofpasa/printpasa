type RedditOAuthConfig = {
  clientId: string
  clientSecret: string
  userAgent: string
}

type RedditPost = { title: string; score?: number; url: string }

let cachedToken: { token: string; expiresAt: number } | null = null

export function getRedditOAuthConfig(): RedditOAuthConfig | null {
  const config = useRuntimeConfig()
  const clientId = String(config.redditClientId ?? '').trim()
  const clientSecret = String(config.redditClientSecret ?? '').trim()
  if (!clientId || !clientSecret) return null
  const userAgent = String(config.redditUserAgent ?? '').trim() || 'printpasa:v1.0 (idea-research)'
  return { clientId, clientSecret, userAgent }
}

async function getAccessToken(oauth: RedditOAuthConfig): Promise<string> {
  const now = Date.now()
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token
  }

  const basic = Buffer.from(`${oauth.clientId}:${oauth.clientSecret}`).toString('base64')
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': oauth.userAgent,
    },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) {
    throw new Error(`Reddit OAuth token request failed (${res.status})`)
  }

  const data = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!data.access_token) {
    throw new Error('Reddit OAuth token response missing access_token')
  }

  cachedToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in ?? 3600) * 1000,
  }
  return data.access_token
}

export async function fetchSubredditHotOAuth(
  oauth: RedditOAuthConfig,
  subreddit: string,
  limit: number,
): Promise<RedditPost[]> {
  const clean = subreddit.replace(/^r\//i, '').trim()
  const token = await getAccessToken(oauth)
  const url = `https://oauth.reddit.com/r/${encodeURIComponent(clean)}/hot?raw_json=1&limit=${Math.min(limit + 5, 25)}`

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': oauth.userAgent,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) {
    throw new Error(`Reddit OAuth returned ${res.status} for r/${clean}`)
  }

  const data = (await res.json()) as {
    data: { children: Array<{ data: { title: string; score: number; permalink: string; stickied?: boolean } }> }
  }

  return (data.data?.children ?? [])
    .map((c) => c.data)
    .filter((p) => !p.stickied)
    .slice(0, limit)
    .map((p) => ({
      title: p.title,
      score: p.score,
      url: `https://www.reddit.com${p.permalink}`,
    }))
}
