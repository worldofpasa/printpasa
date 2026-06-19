import { searchRequest, type SearchCredentials } from '~~/server/services/idea-research/search-provider'
import type {
  EtsyListingHit,
  EtsyThemeMarketplace,
  MarketplaceSaturation,
  ValidationMarketplaceSnapshot,
} from './marketplace-types'

function buildEtsyQuery(themeTitle: string): string {
  return `${themeTitle.trim()} shirt`
}

function deriveSaturation(count: number): MarketplaceSaturation {
  if (count <= 0) return 'unknown'
  if (count <= 3) return 'low'
  if (count <= 8) return 'medium'
  return 'high'
}

function extractListings(data: Record<string, unknown>): EtsyListingHit[] {
  const organic = data.organic_results as
    | Array<{ title?: string; snippet?: string; link?: string }>
    | undefined

  return (organic ?? [])
    .filter((item) => item.title && item.link?.includes('etsy.com'))
    .map((item) => ({
      title: item.title!,
      snippet: item.snippet,
      url: item.link,
    }))
}

async function fetchEtsyForTheme(
  creds: SearchCredentials,
  themeTitle: string,
): Promise<EtsyThemeMarketplace> {
  const query = buildEtsyQuery(themeTitle)
  try {
    const data = await searchRequest(creds, {
      engine: 'etsy',
      q: query,
      num: '10',
    })
    const listings = extractListings(data)
    return {
      themeTitle,
      query,
      listingCount: listings.length,
      saturation: deriveSaturation(listings.length),
      listings: listings.slice(0, 5),
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      themeTitle,
      query,
      listingCount: 0,
      saturation: 'unknown',
      listings: [],
      error: message,
    }
  }
}

function bundleStatus(themes: EtsyThemeMarketplace[]): ValidationMarketplaceSnapshot['status'] {
  if (themes.length === 0) return 'skipped'
  const errors = themes.filter((t) => t.error).length
  const successes = themes.filter((t) => !t.error).length
  if (successes === 0) return 'failed'
  if (errors > 0) return 'partial'
  return 'success'
}

export async function fetchEtsyMarketplaceValidation(
  creds: SearchCredentials | null,
  themeTitles: string[],
): Promise<ValidationMarketplaceSnapshot> {
  const fetchedAt = new Date().toISOString()

  if (!creds) {
    return {
      source: 'etsy',
      fetchedAt,
      status: 'skipped',
      message: 'No search provider configured (Serper, SearchAPI, or SerpAPI).',
      themes: [],
    }
  }

  if (themeTitles.length === 0) {
    return {
      source: 'etsy',
      fetchedAt,
      status: 'skipped',
      message: 'No themes to check.',
      themes: [],
    }
  }

  const themes: EtsyThemeMarketplace[] = []
  for (const title of themeTitles) {
    themes.push(await fetchEtsyForTheme(creds, title))
  }

  const status = bundleStatus(themes)
  let message: string | undefined
  if (status === 'skipped') message = 'Etsy marketplace check was skipped.'
  if (status === 'failed') message = 'Etsy search failed for all themes.'
  if (status === 'partial') message = 'Some Etsy searches failed; partial results shown.'

  return {
    source: 'etsy',
    fetchedAt,
    status,
    message,
    provider: creds.provider,
    themes,
  }
}

export function marketplaceContextForPrompt(snapshot: ValidationMarketplaceSnapshot) {
  return snapshot.themes
    .filter((t) => !t.error)
    .map((t) => ({
      themeTitle: t.themeTitle,
      listingCount: t.listingCount,
      saturation: t.saturation,
      sampleListings: t.listings.slice(0, 3).map((l) => ({
        title: l.title,
        snippet: l.snippet,
      })),
    }))
}
