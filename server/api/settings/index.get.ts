import { useDB, schema } from '~~/server/database'
import { eq } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { SEARCH_PROVIDERS, implementedCapabilitiesForProvider } from '~~/shared/types/providers'
import {
  getCapabilityProviderChoices,
  getProviderIdsByCapability,
  getProviderRegistry,
} from '~~/server/utils/provider-registry'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = useDB()
  const config = useRuntimeConfig()

  const settings = await db.query.userSettings.findFirst({
    where: eq(schema.userSettings.userId, user.id),
  })

  const providerRegistry = await getProviderRegistry(user.id)

  const textProviders = await getCapabilityProviderChoices('text-generation', settings as any, config as any, user.id)
  const generationProviders = await getCapabilityProviderChoices('generation', settings as any, config as any, user.id)
  const upscaleProviders = await getCapabilityProviderChoices('upscale', settings as any, config as any, user.id)
  const backgroundProviders = await getCapabilityProviderChoices('background-removal', settings as any, config as any, user.id)
  const fulfillmentProviders = await getCapabilityProviderChoices('fulfillment', settings as any, config as any, user.id)

  const textProviderIds = await getProviderIdsByCapability('text-generation', user.id)
  const generationProviderIds = await getProviderIdsByCapability('generation', user.id)
  const upscaleProviderIds = await getProviderIdsByCapability('upscale', user.id)
  const bgProviderIds = await getProviderIdsByCapability('background-removal', user.id)
  const fulfillmentProviderIds = await getProviderIdsByCapability('fulfillment', user.id)

  const providerRegistryPayload = providerRegistry.map((provider) => ({
    id: provider.id,
    label: provider.label,
    capabilities: provider.capabilities,
    implementedCapabilities: implementedCapabilitiesForProvider(provider.id).filter((capability) =>
      provider.capabilities.includes(capability),
    ),
    credentialSource: provider.credentialSource,
    envVarName: provider.envVarName ?? null,
    runtimeConfigKey: provider.runtimeConfigKey ?? null,
    userSettingsKey: provider.userSettingsKey ?? null,
    enabled: provider.enabled ?? true,
    models: provider.models ?? [],
  }))

  function resolveDefault(
    candidate: string | null | undefined,
    allowed: string[],
    fallback: string,
  ) {
    if (candidate && allowed.includes(candidate)) return candidate
    if (allowed.includes(fallback)) return fallback
    return allowed[0] ?? fallback
  }

  return {
    defaultAIProvider: resolveDefault(
      settings?.defaultAiProvider,
      textProviderIds,
      (config.defaultAiProvider as string) || 'gemini',
    ),
    defaultImageProvider: resolveDefault(
      settings?.defaultImageProvider,
      generationProviderIds,
      (config.defaultImageProvider as string) || 'fal',
    ),
    defaultUpscaleProvider: resolveDefault(
      settings?.defaultUpscaleProvider,
      upscaleProviderIds,
      (config.defaultUpscaleProvider as string) || 'leonardo',
    ),
    defaultBackgroundRemovalProvider: resolveDefault(
      settings?.defaultBackgroundRemovalProvider,
      bgProviderIds,
      (config.defaultBackgroundRemovalProvider as string) || 'leonardo',
    ),
    defaultFulfillmentProvider: resolveDefault(
      settings?.defaultFulfillmentProvider,
      fulfillmentProviderIds,
      (config.defaultFulfillmentProvider as string) || 'printify',
    ),
    hasGeminiKey: !!settings?.geminiApiKey || !!config.geminiApiKey,
    hasOpenaiKey: !!settings?.openaiApiKey || !!config.openaiApiKey,
    hasAnthropicKey: !!settings?.anthropicApiKey || !!config.anthropicApiKey,
    hasXaiKey: !!settings?.xaiApiKey || !!config.xaiApiKey,
    hasGroqKey: !!settings?.groqApiKey || !!config.groqApiKey,
    hasTogetherKey: !!settings?.togetherApiKey || !!config.togetherApiKey,
    hasDeepinfraKey: !!settings?.deepinfraApiKey || !!config.deepinfraApiKey,
    hasKreaKey: !!settings?.kreaApiKey || !!config.kreaApiKey,
    hasFalKey: !!settings?.falApiKey || !!config.falApiKey,
    hasPrintifyKey: !!settings?.printifyApiKey,
    hasPrintfulKey: !!settings?.printfulApiKey,
    hasRapidapiKey: !!settings?.rapidapiKey || !!config.rapidapiKey,
    hasSerpapiKey: !!settings?.serpapiKey || !!config.serpapiKey,
    hasSearchapiKey: !!settings?.searchapiKey || !!config.searchapiKey,
    hasSerperKey: !!settings?.serperApiKey || !!config.serperApiKey,
    defaultSearchProvider: (() => {
      const preferred = settings?.defaultSearchProvider?.trim()
        || (config.defaultSearchProvider as string)?.trim()
      if (preferred && SEARCH_PROVIDERS.includes(preferred as typeof SEARCH_PROVIDERS[number])) {
        return preferred
      }
      return null
    })(),
    useTrademarkApi: !!settings?.useTrademarkApi,
    useBrandRiskApi: !!settings?.useBrandRiskApi,
    textProviders,
    stageTextConfig: (() => {
      if (!settings?.stageTextConfig) return {}
      try {
        return JSON.parse(settings.stageTextConfig)
      } catch {
        return {}
      }
    })(),
    generationProviders,
    upscaleProviders,
    backgroundProviders,
    fulfillmentProviders,
    providerRegistry: providerRegistryPayload,
    printifyShopId: settings?.printifyShopId ?? null,
    defaultThemeCount: settings?.defaultThemeCount ?? 10,
    defaultWinnerCount: settings?.defaultWinnerCount ?? 5,
    defaultPromptsPerTheme: settings?.defaultPromptsPerTheme ?? 5,
    defaultImagesPerPrompt: settings?.defaultImagesPerPrompt ?? 1,
    maxProductVariants: settings?.maxProductVariants ?? 5,
  }
})
