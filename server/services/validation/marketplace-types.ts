export type MarketplaceSaturation = 'low' | 'medium' | 'high' | 'unknown'

export type EtsyListingHit = {
  title: string
  url?: string
  snippet?: string
}

export type EtsyThemeMarketplace = {
  themeTitle: string
  query: string
  listingCount: number
  saturation: MarketplaceSaturation
  listings: EtsyListingHit[]
  error?: string
}

export type ValidationMarketplaceSnapshot = {
  source: 'etsy'
  fetchedAt: string
  status: 'success' | 'partial' | 'failed' | 'skipped'
  message?: string
  provider?: string
  themes: EtsyThemeMarketplace[]
}
