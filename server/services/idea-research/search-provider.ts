import { eq } from 'drizzle-orm'
import { useDB, schema } from '~~/server/database'
import { SEARCH_PROVIDERS, type SearchProvider } from '~~/shared/types/providers'

export type SearchProviderName = SearchProvider

export interface SearchCredentials {
  provider: SearchProviderName
  apiKey: string
  /** Key worked on SearchAPI but was read from NUXT_SERPAPI_KEY */
  misconfigured?: boolean
}

export class SearchProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly provider: SearchProviderName,
    readonly engine?: string,
  ) {
    super(message)
    this.name = 'SearchProviderError'
  }
}

const FALLBACK_ORDER: SearchProviderName[] = [...SEARCH_PROVIDERS]

async function readUserSettings(userId?: string) {
  if (!userId) return null
  const db = useDB()
  return db.query.userSettings.findFirst({
    where: eq(schema.userSettings.userId, userId),
  })
}

async function readSerpApiKey(userId?: string): Promise<string | null> {
  const runtime = useRuntimeConfig()
  if (userId) {
    const settings = await readUserSettings(userId)
    const key = settings?.serpapiKey || (runtime.serpapiKey as string)
    return key?.trim() || null
  }
  return (runtime.serpapiKey as string)?.trim() || null
}

async function readSearchApiKey(userId?: string): Promise<string | null> {
  const runtime = useRuntimeConfig()
  if (userId) {
    const settings = await readUserSettings(userId)
    const key = settings?.searchapiKey || (runtime.searchapiKey as string)
    return key?.trim() || null
  }
  return (runtime.searchapiKey as string)?.trim() || null
}

async function readSerperApiKey(userId?: string): Promise<string | null> {
  const runtime = useRuntimeConfig()
  if (userId) {
    const settings = await readUserSettings(userId)
    const key = settings?.serperApiKey || (runtime.serperApiKey as string)
    return key?.trim() || null
  }
  return (runtime.serperApiKey as string)?.trim() || null
}

async function readDefaultSearchProvider(userId?: string): Promise<SearchProviderName | null> {
  const runtime = useRuntimeConfig()
  const fromEnv = (runtime.defaultSearchProvider as string)?.trim()
  if (userId) {
    const settings = await readUserSettings(userId)
    const preferred = settings?.defaultSearchProvider?.trim() || fromEnv
    if (preferred && SEARCH_PROVIDERS.includes(preferred as SearchProviderName)) {
      return preferred as SearchProviderName
    }
    return null
  }
  if (fromEnv && SEARCH_PROVIDERS.includes(fromEnv as SearchProviderName)) {
    return fromEnv as SearchProviderName
  }
  return null
}

async function readKeyForProvider(
  provider: SearchProviderName,
  userId?: string,
): Promise<string | null> {
  switch (provider) {
    case 'serpapi':
      return readSerpApiKey(userId)
    case 'searchapi':
      return readSearchApiKey(userId)
    case 'serper':
      return readSerperApiKey(userId)
  }
}

function providerBaseUrl(provider: SearchProviderName): string {
  switch (provider) {
    case 'serpapi':
      return 'https://serpapi.com/search.json'
    case 'searchapi':
      return 'https://www.searchapi.io/api/v1/search'
    case 'serper':
      return 'https://google.serper.dev/search'
  }
}

function translateParamsForSearchApi(params: Record<string, string>): Record<string, string> {
  const engine = params.engine
  if (engine === 'pinterest') {
    return {
      ...params,
      engine: 'google',
      q: `site:pinterest.com ${params.q}`,
    }
  }
  if (engine === 'tiktok') {
    return {
      ...params,
      engine: 'google',
      q: `site:tiktok.com ${params.q}`,
    }
  }
  return params
}

function translateParamsForSerper(params: Record<string, string>): Record<string, string> {
  const engine = params.engine
  if (engine === 'pinterest') {
    return { q: `site:pinterest.com ${params.q}`, num: params.num ?? '10' }
  }
  if (engine === 'tiktok') {
    return { q: `site:tiktok.com ${params.q}`, num: params.num ?? '10' }
  }
  if (engine === 'google' || !engine) {
    return { q: params.q, num: params.num ?? '10' }
  }
  throw new SearchProviderError(
    `Serper.dev does not support engine "${engine}" — use SearchAPI or SerpAPI for Google Trends`,
    400,
    'serper',
    engine,
  )
}

function normalizeSerperResponse(body: Record<string, unknown>): Record<string, unknown> {
  const organic = body.organic as
    | Array<{ title?: string; link?: string; snippet?: string }>
    | undefined

  return {
    ...body,
    organic_results: (organic ?? []).map((item) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
    })),
  }
}

async function rawSerperSearch(
  apiKey: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const payload = {
    ...translateParamsForSerper(params),
    gl: 'us',
    hl: 'en',
  }

  const res = await fetch(providerBaseUrl('serper'), {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000),
  })

  const body = await res.json().catch(() => ({})) as Record<string, unknown> & { message?: string }

  if (!res.ok) {
    const detail = (body.message as string | undefined) ?? res.statusText
    throw new SearchProviderError(
      `Serper.dev ${params.engine ?? 'search'} failed: ${res.status} ${detail}`,
      res.status,
      'serper',
      params.engine,
    )
  }

  return normalizeSerperResponse(body)
}

function translateEtsyEngine(params: Record<string, string>): Record<string, string> {
  if (params.engine !== 'etsy') return params
  return {
    engine: 'google',
    q: `site:etsy.com ${params.q}`,
    num: params.num ?? '10',
  }
}

async function rawSearch(
  provider: SearchProviderName,
  apiKey: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const normalizedParams = translateEtsyEngine(params)

  if (provider === 'serper') {
    return rawSerperSearch(apiKey, normalizedParams)
  }

  const effectiveParams = provider === 'searchapi'
    ? translateParamsForSearchApi(normalizedParams)
    : normalizedParams

  const url = new URL(providerBaseUrl(provider))
  url.searchParams.set('api_key', apiKey)
  for (const [key, value] of Object.entries(effectiveParams)) {
    url.searchParams.set(key, value)
  }

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(20_000) })
  const body = await res.json().catch(() => ({})) as Record<string, unknown> & { error?: string }

  if (!res.ok) {
    const detail = body.error ?? res.statusText
    throw new SearchProviderError(
      `${providerLabel(provider)} ${effectiveParams.engine ?? 'search'} failed: ${res.status} ${detail}`,
      res.status,
      provider,
      effectiveParams.engine,
    )
  }

  if (body.error) {
    throw new SearchProviderError(
      `${providerLabel(provider)} ${effectiveParams.engine ?? 'search'} error: ${body.error}`,
      400,
      provider,
      effectiveParams.engine,
    )
  }

  return body
}

function providerLabel(provider: SearchProviderName): string {
  switch (provider) {
    case 'serpapi':
      return 'SerpAPI'
    case 'searchapi':
      return 'SearchAPI'
    case 'serper':
      return 'Serper.dev'
  }
}

const VERIFY_CACHE_TTL_MS = 60 * 60 * 1000
let credentialsCache: {
  cacheKey: string
  creds: SearchCredentials | null
  expiresAt: number
} | null = null

async function buildCredentialsCacheKey(userId?: string): Promise<string> {
  const preferred = await readDefaultSearchProvider(userId)
  return `${userId ?? 'global'}:${preferred ?? 'auto'}`
}

export async function verifySearchProvider(
  provider: SearchProviderName,
  apiKey: string,
): Promise<{ valid: boolean; error?: string }> {
  try {
    await rawSearch(provider, apiKey, { engine: 'google', q: 'test', num: '1' })
    return { valid: true }
  } catch (err: unknown) {
    if (err instanceof SearchProviderError) {
      if (err.status === 401 || err.status === 403 || err.message.toLowerCase().includes('invalid api key')) {
        return {
          valid: false,
          error: `Invalid ${providerLabel(provider)} key`,
        }
      }
      return { valid: false, error: err.message }
    }
    const message = err instanceof Error ? err.message : String(err)
    return { valid: false, error: message }
  }
}

function providerTryOrder(preferred: SearchProviderName | null): SearchProviderName[] {
  if (!preferred) return FALLBACK_ORDER
  return [preferred, ...FALLBACK_ORDER.filter((p) => p !== preferred)]
}

export function clearSearchCredentialsCache(): void {
  credentialsCache = null
}

/** Resolve search creds using user default, then fallbacks. Detects SearchAPI keys in NUXT_SERPAPI_KEY. */
export async function resolveSearchCredentials(userId?: string): Promise<SearchCredentials | null> {
  const now = Date.now()
  const cacheKey = await buildCredentialsCacheKey(userId)
  if (credentialsCache && credentialsCache.cacheKey === cacheKey && now < credentialsCache.expiresAt) {
    return credentialsCache.creds
  }

  const preferred = await readDefaultSearchProvider(userId)
  let creds: SearchCredentials | null = null

  for (const provider of providerTryOrder(preferred)) {
    const key = await readKeyForProvider(provider, userId)
    if (!key) continue
    const check = await verifySearchProvider(provider, key)
    if (check.valid) {
      creds = { provider, apiKey: key }
      break
    }
  }

  // Common misconfiguration: SearchAPI key pasted into NUXT_SERPAPI_KEY / serpapiKey
  if (!creds) {
    const serpKey = await readSerpApiKey(userId)
    const searchKey = await readSearchApiKey(userId)
    if (serpKey && serpKey !== searchKey) {
      const check = await verifySearchProvider('searchapi', serpKey)
      if (check.valid) {
        creds = { provider: 'searchapi', apiKey: serpKey, misconfigured: true }
      }
    }
  }

  credentialsCache = { cacheKey, creds, expiresAt: now + VERIFY_CACHE_TTL_MS }
  return creds
}

export async function searchRequest(
  creds: SearchCredentials,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  return rawSearch(creds.provider, creds.apiKey, params)
}

/** @deprecated use resolveSearchCredentials */
export async function resolveSerpApiKey(userId?: string): Promise<string | null> {
  const creds = await resolveSearchCredentials(userId)
  return creds?.apiKey ?? null
}

/** @deprecated use searchRequest */
export async function serpApiSearch(
  apiKey: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  return rawSearch('serpapi', apiKey, params)
}
