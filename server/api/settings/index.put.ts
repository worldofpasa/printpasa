import { useDB, schema } from '~~/server/database'
import { eq } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { z } from 'zod'
import { getProviderIdsByCapability, providerRegistryEntrySchema } from '~~/server/utils/provider-registry'
import { CANONICAL_MODELS_BY_PROVIDER, mergeProviderModels } from '~~/server/utils/canonical-providers'
import { clearSearchCredentialsCache } from '~~/server/services/idea-research/search-provider'
import { isProviderImplemented, SEARCH_PROVIDERS } from '~~/shared/types/providers'
import { TEXT_WORKFLOW_STAGES, type StageTextConfig } from '~~/shared/types/text-stages'

const stageBindingSchema = z.object({
  provider: z.string().trim().min(1).optional(),
  model: z.string().trim().min(1).optional(),
})

const stageTextConfigSchema = z.object({
  'gather-idea': stageBindingSchema.optional(),
  'validate': stageBindingSchema.optional(),
  'image-prompts': stageBindingSchema.optional(),
  'product-metadata': stageBindingSchema.optional(),
  'niche-classify': stageBindingSchema.optional(),
}).optional()

const bodySchema = z.object({
  defaultAIProvider: z.string().optional(),
  defaultImageProvider: z.string().optional(),
  defaultUpscaleProvider: z.string().optional(),
  defaultBackgroundRemovalProvider: z.string().optional(),
  defaultFulfillmentProvider: z.string().optional(),
  geminiApiKey: z.string().optional(),
  openaiApiKey: z.string().optional(),
  anthropicApiKey: z.string().optional(),
  xaiApiKey: z.string().optional(),
  groqApiKey: z.string().optional(),
  togetherApiKey: z.string().optional(),
  deepinfraApiKey: z.string().optional(),
  stageTextConfig: stageTextConfigSchema,
  kreaApiKey: z.string().optional(),
  falApiKey: z.string().optional(),
  printifyApiKey: z.string().optional(),
  printifyShopId: z.string().optional(),
  printfulApiKey: z.string().optional(),
  leonardoApiKey: z.string().optional(),
  photoroomApiKey: z.string().optional(),
  replicateApiToken: z.string().optional(),
  rapidapiKey: z.string().optional(),
  serpapiKey: z.string().optional(),
  searchapiKey: z.string().optional(),
  serperApiKey: z.string().optional(),
  defaultSearchProvider: z.union([z.enum(SEARCH_PROVIDERS), z.literal('')]).optional(),
  useTrademarkApi: z.boolean().optional(),
  useBrandRiskApi: z.boolean().optional(),
  defaultThemeCount: z.number().int().min(1).max(50).optional(),
  defaultWinnerCount: z.number().int().min(1).max(20).optional(),
  defaultPromptsPerTheme: z.number().int().min(1).max(10).optional(),
  defaultImagesPerPrompt: z.number().int().min(1).max(10).optional(),
  maxProductVariants: z.number().int().min(1).max(100).optional(),
  providerRegistry: z.array(providerRegistryEntrySchema).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDB()

  const existing = await db.query.userSettings.findFirst({
    where: eq(schema.userSettings.userId, user.id),
  })

  let textProviderIds: string[]
  let generationProviderIds: string[]
  let upscaleProviderIds: string[]
  let bgProviderIds: string[]
  let fulfillmentProviderIds: string[]

  if (body.providerRegistry) {
    const active = body.providerRegistry.filter((p) => p.enabled !== false)
    textProviderIds = active
      .filter((p) => p.capabilities.includes('text-generation') && isProviderImplemented(p.id, 'text-generation'))
      .map((p) => p.id)
    generationProviderIds = active.filter((p) => p.capabilities.includes('generation')).map((p) => p.id)
    upscaleProviderIds = active.filter((p) => p.capabilities.includes('upscale')).map((p) => p.id)
    bgProviderIds = active.filter((p) => p.capabilities.includes('background-removal')).map((p) => p.id)
    fulfillmentProviderIds = active.filter((p) => p.capabilities.includes('fulfillment')).map((p) => p.id)
  } else {
    textProviderIds = await getProviderIdsByCapability('text-generation', user.id)
    generationProviderIds = await getProviderIdsByCapability('generation', user.id)
    upscaleProviderIds = await getProviderIdsByCapability('upscale', user.id)
    bgProviderIds = await getProviderIdsByCapability('background-removal', user.id)
    fulfillmentProviderIds = await getProviderIdsByCapability('fulfillment', user.id)
  }

  if (textProviderIds.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Provider registry must include at least one implemented text-generation provider.' })
  }

  if (generationProviderIds.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Provider registry must include at least one implemented generation provider.' })
  }
  if (upscaleProviderIds.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Provider registry must include at least one implemented upscale provider.' })
  }
  if (bgProviderIds.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Provider registry must include at least one implemented background removal provider.' })
  }
  if (fulfillmentProviderIds.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Provider registry must include at least one implemented fulfillment provider.' })
  }

  if (body.defaultAIProvider && !textProviderIds.includes(body.defaultAIProvider)) {
    throw createError({ statusCode: 400, statusMessage: `Unsupported text-generation provider: ${body.defaultAIProvider}` })
  }

  if (body.stageTextConfig) {
    for (const stage of TEXT_WORKFLOW_STAGES) {
      const binding = body.stageTextConfig[stage]
      if (!binding) continue
      if (binding.provider && !textProviderIds.includes(binding.provider)) {
        throw createError({ statusCode: 400, statusMessage: `Unsupported text provider for ${stage}: ${binding.provider}` })
      }
    }
  }

  if (body.defaultImageProvider && !generationProviderIds.includes(body.defaultImageProvider)) {
    throw createError({ statusCode: 400, statusMessage: `Unsupported generation provider: ${body.defaultImageProvider}` })
  }
  if (body.defaultUpscaleProvider && !upscaleProviderIds.includes(body.defaultUpscaleProvider)) {
    throw createError({ statusCode: 400, statusMessage: `Unsupported upscale provider: ${body.defaultUpscaleProvider}` })
  }
  if (body.defaultBackgroundRemovalProvider && !bgProviderIds.includes(body.defaultBackgroundRemovalProvider)) {
    throw createError({ statusCode: 400, statusMessage: `Unsupported background removal provider: ${body.defaultBackgroundRemovalProvider}` })
  }
  if (body.defaultFulfillmentProvider && !fulfillmentProviderIds.includes(body.defaultFulfillmentProvider)) {
    throw createError({ statusCode: 400, statusMessage: `Unsupported fulfillment provider: ${body.defaultFulfillmentProvider}` })
  }

  // Filter out undefined values and empty strings that mean "clear this key"
  const updateData: Record<string, any> = {}
  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined) {
      let mappedKey = key === 'defaultAIProvider' ? 'defaultAiProvider' : key
      if (mappedKey === 'providerRegistry') {
        mappedKey = 'providerRegistryConfig'
        updateData[mappedKey] = JSON.stringify(value)
      } else if (mappedKey === 'stageTextConfig') {
        updateData[mappedKey] = JSON.stringify(value as StageTextConfig)
      } else {
        updateData[mappedKey] = value === '' ? null : value
      }
    }
  }

  if (existing) {
    await db.update(schema.userSettings)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(schema.userSettings.userId, user.id))
  } else {
    await db.insert(schema.userSettings).values({
      id: crypto.randomUUID(),
      userId: user.id,
      ...updateData,
    })
  }

  if (body.providerRegistry) {
    // Replace providers
    await db.delete(schema.providers)
    if (body.providerRegistry.length > 0) {
      await db.insert(schema.providers).values(
        body.providerRegistry.map((p) => ({
          id: p.id,
          label: p.label,
          capabilities: p.capabilities,
          credentialSource: p.credentialSource,
          runtimeConfigKey: p.runtimeConfigKey,
          userSettingsKey: p.userSettingsKey,
          envVarName: p.envVarName,
          enabled: p.enabled ?? true,
          models: mergeProviderModels(CANONICAL_MODELS_BY_PROVIDER[p.id], p.models) ?? p.models,
          updatedAt: new Date(),
        }))
      )
    }
  }

  if (
    body.defaultSearchProvider !== undefined
    || body.searchapiKey !== undefined
    || body.serperApiKey !== undefined
    || body.serpapiKey !== undefined
  ) {
    clearSearchCredentialsCache()
  }

  return { success: true }
})
