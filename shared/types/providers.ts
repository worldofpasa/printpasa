export const AI_PROVIDERS = ['gemini', 'openai', 'anthropic', 'xai', 'groq', 'together', 'deepinfra'] as const
export type AIProvider = typeof AI_PROVIDERS[number]

export const IMAGE_PROVIDERS = ['krea', 'fal'] as const
export type ImageProvider = typeof IMAGE_PROVIDERS[number]

export const BACKGROUND_REMOVAL_PROVIDERS = ['photoroom', 'leonardo', 'bria', 'local-bg'] as const
export type BackgroundRemovalProvider = typeof BACKGROUND_REMOVAL_PROVIDERS[number]

export const UPSCALE_PROVIDERS = ['leonardo', 'photoroom', 'replicate', 'topaz', 'local'] as const
export type UpscaleProvider = typeof UPSCALE_PROVIDERS[number]

export const FULFILLMENT_PROVIDERS = ['printify', 'printful'] as const
export type FulfillmentProvider = typeof FULFILLMENT_PROVIDERS[number]

export const TREND_PROVIDERS = ['google-trends', 'reddit'] as const
export type TrendProvider = typeof TREND_PROVIDERS[number]

export const TREND_SOURCES = ['google-trends', 'reddit', 'manual'] as const
export type TrendSource = typeof TREND_SOURCES[number]

export const SEARCH_PROVIDERS = ['serper', 'searchapi', 'serpapi'] as const
export type SearchProvider = typeof SEARCH_PROVIDERS[number]

export const SEARCH_PROVIDER_LABELS: Record<SearchProvider, string> = {
  serper: 'Serper.dev',
  searchapi: 'SearchAPI.io',
  serpapi: 'SerpAPI',
}

/** Registry capability slugs (Settings + provider DB). */
export const PROVIDER_CAPABILITIES = [
  'text-generation',
  'generation',
  'upscale',
  'background-removal',
  'fulfillment',
] as const
export type ProviderCapability = typeof PROVIDER_CAPABILITIES[number]

/** Which capabilities each provider actually implements in code (source of truth for dropdowns). */
export const IMPLEMENTED_PROVIDER_IDS: Record<ProviderCapability, readonly string[]> = {
  'text-generation': ['gemini', 'openai', 'anthropic', 'xai', 'groq', 'together', 'deepinfra'],
  generation: ['krea', 'fal'],
  upscale: ['leonardo', 'replicate', 'photoroom', 'topaz', 'local'],
  'background-removal': ['local-bg', 'leonardo', 'photoroom', 'bria'],
  fulfillment: ['printify', 'printful'],
}

export function isProviderImplemented(providerId: string, capability: ProviderCapability): boolean {
  return IMPLEMENTED_PROVIDER_IDS[capability].includes(providerId)
}

export function implementedCapabilitiesForProvider(providerId: string): ProviderCapability[] {
  return PROVIDER_CAPABILITIES.filter((capability) => isProviderImplemented(providerId, capability))
}

export const NICHES = [
  'gen-z', 'millennials', 'moms', 'dads', 'pets', 'nurse',
  'teacher', 'gamer', 'fitness', 'foodie', 'custom'
] as const
export type Niche = typeof NICHES[number]
