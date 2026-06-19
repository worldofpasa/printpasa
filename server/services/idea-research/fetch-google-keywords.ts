import type { LabeledSignal } from './types'
import { searchRequest, type SearchCredentials } from './search-provider'

export async function fetchGoogleTrendSignals(
  creds: SearchCredentials,
  keywords: string[],
  labelPrefix = 'G',
): Promise<LabeledSignal[]> {
  const signals: LabeledSignal[] = []
  let index = 1

  for (const keyword of keywords) {
    const label = `${labelPrefix}${index}`
    index++
    try {
      const related = creds.provider === 'serper'
        ? await fetchSerperTrendSignals(creds, keyword)
        : await fetchTrendsApiSignals(creds, keyword)

      if (related.length === 0) {
        signals.push({
          label,
          source: 'google-trends',
          query: keyword,
          title: keyword,
          detail: creds.provider === 'serper'
            ? 'No related searches returned (Serper fallback)'
            : 'No related queries returned',
        })
        continue
      }

      for (const item of related.slice(0, 3)) {
        signals.push({
          label,
          source: 'google-trends',
          query: keyword,
          title: item.query,
          detail: item.type,
          score: item.value,
        })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      signals.push({
        label,
        source: 'google-trends',
        query: keyword,
        title: '(fetch failed)',
        error: message,
      })
    }
  }

  return signals
}

type TrendQuery = { query: string; type: string; value?: number }

async function fetchTrendsApiSignals(
  creds: SearchCredentials,
  keyword: string,
): Promise<TrendQuery[]> {
  const data = await searchRequest(creds, {
    engine: 'google_trends',
    q: keyword,
    data_type: 'RELATED_QUERIES',
    geo: 'US',
  })
  return extractRelatedQueries(data)
}

async function fetchSerperTrendSignals(
  creds: SearchCredentials,
  keyword: string,
): Promise<TrendQuery[]> {
  const data = await searchRequest(creds, {
    engine: 'google',
    q: keyword,
    num: '10',
  })
  return extractSerperTrendSignals(data)
}

function extractSerperTrendSignals(data: Record<string, unknown>): TrendQuery[] {
  const out: TrendQuery[] = []

  const related = data.relatedSearches as Array<{ query?: string }> | undefined
  for (const item of related ?? []) {
    if (item.query) {
      out.push({ query: item.query, type: 'related search' })
    }
  }

  const peopleAlsoAsk = data.peopleAlsoAsk as Array<{ question?: string }> | undefined
  for (const item of peopleAlsoAsk ?? []) {
    if (item.question) {
      out.push({ query: item.question, type: 'people also ask' })
    }
  }

  if (out.length > 0) return out

  const organic = (data.organic_results ?? data.organic) as
    | Array<{ title?: string }>
    | undefined
  for (const item of organic ?? []) {
    if (item.title) {
      out.push({ query: item.title, type: 'top result' })
    }
  }

  return out
}

function extractRelatedQueries(data: Record<string, unknown>): TrendQuery[] {
  const out: TrendQuery[] = []
  const related = data.related_queries as
    | {
        rising?: Array<{ query?: string; extracted_value?: number; link?: string }>
        top?: Array<{ query?: string; extracted_value?: number; link?: string }>
      }
    | undefined

  for (const item of related?.rising ?? []) {
    if (item.query) {
      out.push({ query: item.query, type: 'rising', value: item.extracted_value })
    }
  }
  for (const item of related?.top ?? []) {
    if (item.query) {
      out.push({ query: item.query, type: 'top', value: item.extracted_value })
    }
  }

  const interest = data.interest_over_time as
    | { timeline_data?: Array<{ date?: string; values?: Array<{ query?: string; extracted_value?: number }> }> }
    | undefined
  for (const point of interest?.timeline_data ?? []) {
    for (const val of point.values ?? []) {
      if (val.query) {
        out.push({ query: val.query, type: 'interest', value: val.extracted_value })
      }
    }
  }

  return out
}
