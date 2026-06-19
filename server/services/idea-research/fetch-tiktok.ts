import type { LabeledSignal } from './types'
import { searchRequest, type SearchCredentials } from './search-provider'

export async function fetchTikTokSignals(
  creds: SearchCredentials,
  keywords: string[],
  labelPrefix = 'T',
): Promise<LabeledSignal[]> {
  const signals: LabeledSignal[] = []
  let index = 1

  for (const keyword of keywords) {
    const label = `${labelPrefix}${index}`
    index++
    try {
      const data = await searchRequest(creds, {
        engine: 'tiktok',
        q: keyword,
      })

      const videos = extractVideos(data)
      if (videos.length === 0) {
        signals.push({
          label,
          source: 'tiktok',
          query: keyword,
          title: keyword,
          detail: 'No videos returned',
        })
        continue
      }

      for (const video of videos.slice(0, 3)) {
        signals.push({
          label,
          source: 'tiktok',
          query: keyword,
          title: video.title,
          detail: video.author,
          score: video.views,
          url: video.url,
        })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      signals.push({
        label,
        source: 'tiktok',
        query: keyword,
        title: '(fetch failed)',
        error: message,
      })
    }
  }

  return signals
}

function extractVideos(data: Record<string, unknown>): Array<{ title: string; author?: string; views?: number; url?: string }> {
  const organic = data.organic_results as
    | Array<{ title?: string; author?: string; views?: number; link?: string }>
    | undefined
  const videoResults = data.video_results as
    | Array<{ title?: string; author?: string; views?: number; link?: string }>
    | undefined

  const items = [...(organic ?? []), ...(videoResults ?? [])]
  return items
    .filter((item) => item.title)
    .map((item) => ({
      title: item.title!,
      author: item.author,
      views: item.views,
      url: item.link,
    }))
}
