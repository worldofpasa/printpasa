import type { IBrandRiskProvider, BrandRiskLevel, BrandRiskResult } from '../types'

type SerpApiResponse = {
  search_information?: { total_results?: number }
  knowledge_graph?: { title?: string; type?: string }
  organic_results?: Array<{ title?: string; link?: string }>
}

export class SerpApiBrandRiskProvider implements IBrandRiskProvider {
  readonly name = 'serpapi-google' as const

  constructor(private readonly apiKey: string) {
    if (!apiKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'SerpAPI key not configured for brand-risk validation',
      })
    }
  }

  async check(text: string): Promise<BrandRiskResult> {
    const query = `"${text.trim()}" (movie OR book OR game OR brand OR band)`
    const url = new URL('https://serpapi.com/search.json')
    url.searchParams.set('engine', 'google')
    url.searchParams.set('q', query)
    url.searchParams.set('api_key', this.apiKey)
    url.searchParams.set('num', '10')

    const res = await fetch(url.toString())
    if (!res.ok) {
      throw createError({
        statusCode: 502,
        statusMessage: `SerpAPI brand-risk search failed: ${res.status} ${res.statusText}`,
      })
    }

    const data = (await res.json()) as SerpApiResponse
    const totalResults = data.search_information?.total_results ?? 0
    const kg = data.knowledge_graph
    const hasBrandyKg = !!kg && !!kg.type && /film|movie|book|novel|video game|brand|band|musician|tv series/i.test(kg.type)

    let riskLevel: BrandRiskLevel = 'low'
    let notes: string | undefined

    if (hasBrandyKg) {
      riskLevel = 'high'
      notes = `Knowledge graph hit: ${kg?.title} (${kg?.type})`
    } else if (totalResults > 1_000_000) {
      riskLevel = 'high'
      notes = `~${totalResults.toLocaleString()} exact-phrase hits with branded qualifiers`
    } else if (totalResults > 100_000) {
      riskLevel = 'medium'
      notes = `~${totalResults.toLocaleString()} exact-phrase hits with branded qualifiers`
    }

    return {
      isSafe: riskLevel !== 'high',
      riskLevel,
      notes,
    }
  }
}
