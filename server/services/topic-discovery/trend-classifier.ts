import { createAIProvider } from '~~/server/services/text-generation'
import { useDB, schema } from '~~/server/database'
import { eq } from 'drizzle-orm'
import { resolveProviderApiKey } from '~~/server/utils/provider-registry'
import { resolveDefaultModelFromCatalog } from '~~/server/utils/canonical-providers'
import { DEFAULT_TEXT_MODELS } from '~~/server/services/text-generation/defaults'
import { getProviderIdsByCapability, getProviderById } from '~~/server/utils/provider-registry'
import { resolvePipelineOwnerUserId } from '~~/server/utils/superuser-seed'
import type { AIProvider } from '~~/shared/types/providers'

export interface ClassifiedTrend {
  /** The original raw trending topic string */
  original: string
  /** Whether this topic can produce an IP-safe t-shirt niche */
  safe: boolean
  /** Human-readable niche name, e.g. "Soccer Fans" */
  niche: string | null
  /** URL-safe slug, e.g. "soccer-fans" */
  slug: string | null
  /** Short description of the niche for DB storage */
  description: string | null
  /** Reason for the classification decision */
  reason: string
}

const CLASSIFIER_PROMPT = `You are an IP safety filter for a print-on-demand t-shirt company.

For each trending topic in the input array, determine if it can be safely turned into a t-shirt niche WITHOUT any IP, trademark, or copyright risk.

REJECT (safe: false, niche: null) if the topic is any of:
- A real person's name (celebrity, athlete, politician, influencer, YouTuber)
- A brand or company name (Nike, Tesla, McDonald's, etc.)
- A sports team name (Lakers, Manchester United, Patriots, etc.)
- A movie, TV show, book, video game, song, or album title
- An organization name (FIFA, NFL, Grammy Awards, Oscars, etc.)
- A specific trademarked event name (Super Bowl, Grammy Awards, Coachella, etc.)
- Anything with clear and obvious trademark or copyright risk

EXTRACT a safe underlying niche (safe: true) if the trend implies a passion community or lifestyle:
- "FIFA World Cup 2026" → niche: "Soccer Fans", slug: "soccer-fans" (the sport, not the org/event)
- "NBA Finals" → niche: "Basketball Lifestyle", slug: "basketball-lifestyle"
- "Brat Summer" → niche: "Indie Pop Culture", slug: "indie-pop-culture"
- "Ozempic" → niche: "Wellness Journey Humor", slug: "wellness-journey-humor"
- "Nurse Week" → niche: "Nurse Life", slug: "nurse-life" (already safe)
- "Taylor Swift Eras Tour" → safe: false (celebrity)
- "Travis Scott" → safe: false (celebrity, no extractable niche)

Rules for slugs: lowercase, hyphens only, no special characters, max 40 chars.

Return a JSON array with one object per input topic:
[
  {
    "original": "...",
    "safe": true | false,
    "niche": "Display Name" | null,
    "slug": "url-safe-slug" | null,
    "description": "One sentence description of this niche audience for t-shirts" | null,
    "reason": "short explanation"
  }
]`

async function resolveSystemAIProvider() {
  const config = useRuntimeConfig()
  const db = useDB()

  const ownerRef = (config.pipelineOwnerUserId as string)?.trim() ?? ''
  const ownerId = await resolvePipelineOwnerUserId(ownerRef)

  const settings = ownerId
    ? await db.query.userSettings.findFirst({
        where: eq(schema.userSettings.userId, ownerId),
      })
    : null

  const textProviderIds = await getProviderIdsByCapability('text-generation', ownerId ?? undefined)
  if (textProviderIds.length === 0) {
    console.error('[trend-classifier] Failed to resolve system AI provider: No text-generation providers are configured in the registry.')
    throw new Error('[trend-classifier] No text-generation providers configured')
  }

  const stageConfig = (() => {
    try {
      return settings?.stageTextConfig
        ? (JSON.parse(settings.stageTextConfig) as Record<string, { provider?: string; model?: string }>)
        : {}
    } catch {
      return {}
    }
  })()

  const preferredProvider = stageConfig['niche-classify']?.provider
    ?? settings?.defaultAiProvider
    ?? (config.defaultAiProvider as string)

  if (!preferredProvider || !textProviderIds.includes(preferredProvider)) {
    console.error(`[trend-classifier] Preferred provider "${preferredProvider}" not available, falling back to ${textProviderIds[0]}`)
  }

  const providerId = textProviderIds.includes(preferredProvider!)
    ? preferredProvider!
    : textProviderIds[0]!

  const providerEntry = await getProviderById(providerId, ownerId ?? undefined)
  if (!providerEntry) {
    console.error(`[trend-classifier] Provider not found in registry: ${providerId}`)
    throw new Error(`[trend-classifier] Provider not found: ${providerId}`)
  }

  const apiKey = resolveProviderApiKey(providerEntry, settings as any, config as any)
  if (!apiKey) {
    console.error(`[trend-classifier] No API key configured for provider: ${providerId}`)
    throw new Error(`[trend-classifier] No API key for provider: ${providerId}`)
  }

  const catalogModel = resolveDefaultModelFromCatalog(providerEntry.models)
  const fallbackModel = DEFAULT_TEXT_MODELS[providerId as AIProvider]
  const model = stageConfig['niche-classify']?.model || catalogModel || fallbackModel

  return createAIProvider(providerId as AIProvider, apiKey, model, providerEntry.baseURL ?? undefined)
}

export async function classifyTrends(titles: string[]): Promise<ClassifiedTrend[]> {
  if (titles.length === 0) return []

  try {
    const provider = await resolveSystemAIProvider()
    const result = await provider.generateJSON<ClassifiedTrend[]>({
      prompt: `${CLASSIFIER_PROMPT}\n\nInput topics:\n${JSON.stringify(titles)}`,
    })

    // Validate and normalise — guard against malformed AI output
    if (!Array.isArray(result)) {
      console.warn('[trend-classifier] AI returned non-array, falling back to reject-all')
      return titles.map(original => ({ original, safe: false, niche: null, slug: null, description: null, reason: 'classifier error' }))
    }

    return titles.map((original) => {
      const found = result.find(
        r => typeof r === 'object' && r !== null && normalize(r.original ?? '') === normalize(original)
      )
      if (!found) {
        return { original, safe: false, niche: null, slug: null, description: null, reason: 'not returned by classifier' }
      }
      return {
        original,
        safe: found.safe === true && !!found.niche && !!found.slug,
        niche: found.niche ?? null,
        slug: found.slug ? found.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 40) : null,
        description: found.description ?? null,
        reason: found.reason ?? '',
      }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[trend-classifier] classification failed, rejecting all trends:', message)
    return titles.map(original => ({ original, safe: false, niche: null, slug: null, description: null, reason: 'classifier error' }))
  }
}

function normalize(s: string): string {
  return s.toLowerCase().trim()
}
