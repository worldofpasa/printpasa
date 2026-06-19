import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { useDB, schema } from '~~/server/database'
import type {
  ITrademarkProvider,
  IBrandRiskProvider,
  TrademarkResult,
  BrandRiskResult,
} from './types'
import { RapidApiTrademarkProvider } from './providers/rapidapi-trademark'
import { SerpApiBrandRiskProvider } from './providers/serpapi-brand-risk'

export type ValidationToggles = {
  useTrademarkApi: boolean
  useBrandRiskApi: boolean
}

export type ValidationProviders = {
  trademark?: ITrademarkProvider
  brandRisk?: IBrandRiskProvider
}

/**
 * Resolve providers for the current run.
 * Per-user keys win over runtime env. If a toggle is on but no key resolves,
 * throw 400 — silent fallback would hide the fact that IP gating didn't run.
 */
export async function getValidationProvidersForUser(
  _event: H3Event,
  userId: string,
  toggles: ValidationToggles,
): Promise<ValidationProviders> {
  const out: ValidationProviders = {}
  if (!toggles.useTrademarkApi && !toggles.useBrandRiskApi) return out

  const db = useDB()
  const settings = await db.query.userSettings.findFirst({
    where: eq(schema.userSettings.userId, userId),
  })
  const runtime = useRuntimeConfig()

  if (toggles.useTrademarkApi) {
    const key = settings?.rapidapiKey || runtime.rapidapiKey
    if (!key) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Trademark check is enabled but no RapidAPI key is configured. Add one in Settings or set NUXT_RAPIDAPI_KEY.',
      })
    }
    out.trademark = new RapidApiTrademarkProvider(key)
  }

  if (toggles.useBrandRiskApi) {
    const key = settings?.serpapiKey || runtime.serpapiKey
    if (!key) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Brand-risk check is enabled but no SerpAPI key is configured. Add one in Settings or set NUXT_SERPAPI_KEY.',
      })
    }
    out.brandRisk = new SerpApiBrandRiskProvider(key)
  }

  return out
}

// ---- cache (24h TTL, per-phrase) ----
type TmCacheEntry = { expires: number; result: TrademarkResult }
type BrCacheEntry = { expires: number; result: BrandRiskResult }
const tmCache = new Map<string, TmCacheEntry>()
const brCache = new Map<string, BrCacheEntry>()
const TTL_MS = 24 * 60 * 60 * 1000

const norm = (s: string) => s.trim().toLowerCase()

export async function checkTrademarkCached(
  provider: ITrademarkProvider,
  text: string,
  classCode = '025',
): Promise<TrademarkResult> {
  const key = `${provider.name}:${classCode}:${norm(text)}`
  const now = Date.now()
  const hit = tmCache.get(key)
  if (hit && hit.expires > now) return hit.result
  const result = await provider.check(text, classCode)
  tmCache.set(key, { expires: now + TTL_MS, result })
  return result
}

export async function checkBrandRiskCached(
  provider: IBrandRiskProvider,
  text: string,
): Promise<BrandRiskResult> {
  const key = `${provider.name}:${norm(text)}`
  const now = Date.now()
  const hit = brCache.get(key)
  if (hit && hit.expires > now) return hit.result
  const result = await provider.check(text)
  brCache.set(key, { expires: now + TTL_MS, result })
  return result
}

export type { ITrademarkProvider, IBrandRiskProvider, TrademarkResult, BrandRiskResult } from './types'
export {
  fetchEtsyMarketplaceValidation,
  marketplaceContextForPrompt,
} from './fetch-etsy-marketplace'
export type {
  ValidationMarketplaceSnapshot,
  EtsyThemeMarketplace,
  EtsyListingHit,
  MarketplaceSaturation,
} from './marketplace-types'
