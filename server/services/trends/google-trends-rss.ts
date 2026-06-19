const RSS_URL = 'https://trends.google.com/trending/rss?geo=US'

export interface GoogleTrendsRssItem {
  title: string
  rank: number
}

/** Free Google Trends daily feed — replaces dead google-trends-api scrape endpoints. */
export async function fetchGoogleTrendsRss(limit = 10): Promise<GoogleTrendsRssItem[]> {
  try {
    const res = await fetch(RSS_URL, {
      headers: { 'User-Agent': 'printpasa/1.0' },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return []

    const xml = await res.text()
    const titles: string[] = []
    const titleRegex = /<item>[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/gi
    let match: RegExpExecArray | null
    while ((match = titleRegex.exec(xml)) !== null) {
      const title = match[1]!.trim()
      if (title && title !== 'Daily Search Trends') {
        titles.push(title)
      }
    }

    return titles.slice(0, limit).map((title, idx) => ({
      title,
      rank: idx + 1,
    }))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[trends] Google Trends RSS failed:', message)
    return []
  }
}
