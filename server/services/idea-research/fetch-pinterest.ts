import type { LabeledSignal } from './types'
import { searchRequest, type SearchCredentials } from './search-provider'

export async function fetchPinterestSignals(
  creds: SearchCredentials,
  keywords: string[],
  labelPrefix = 'P',
): Promise<LabeledSignal[]> {
  const signals: LabeledSignal[] = []
  let index = 1

  for (const keyword of keywords) {
    const label = `${labelPrefix}${index}`
    index++
    try {
      const data = await searchRequest(creds, {
        engine: 'pinterest',
        q: keyword,
      })

      const pins = extractPins(data)
      if (pins.length === 0) {
        signals.push({
          label,
          source: 'pinterest',
          query: keyword,
          title: keyword,
          detail: 'No pins returned',
        })
        continue
      }

      for (const pin of pins.slice(0, 3)) {
        signals.push({
          label,
          source: 'pinterest',
          query: keyword,
          title: pin.title,
          detail: pin.description,
          url: pin.url,
        })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      signals.push({
        label,
        source: 'pinterest',
        query: keyword,
        title: '(fetch failed)',
        error: message,
      })
    }
  }

  return signals
}

function extractPins(data: Record<string, unknown>): Array<{ title: string; description?: string; url?: string }> {
  const organic = data.organic_results as
    | Array<{ title?: string; snippet?: string; link?: string }>
    | undefined

  return (organic ?? [])
    .filter((item) => item.title)
    .map((item) => ({
      title: item.title!,
      description: item.snippet,
      url: item.link,
    }))
}
