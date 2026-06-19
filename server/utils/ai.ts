import type { H3Event } from 'h3'
import type { AIProvider } from '~~/shared/types/providers'
import type { TextWorkflowStage } from '~~/shared/types/text-stages'
import type { StageTextConfig } from '~~/shared/types/text-stages'
import { createAIProvider } from '../services/text-generation'
import { DEFAULT_TEXT_MODELS } from '../services/text-generation/defaults'
import { useDB } from '../database'
import { schema } from '../database'
import { eq } from 'drizzle-orm'
import {
  getProviderById,
  getProviderIdsByCapability,
  resolveProviderApiKey,
} from './provider-registry'
import { resolveDefaultModelFromCatalog } from './canonical-providers'

function parseStageTextConfig(raw: string | null | undefined): StageTextConfig {
  if (!raw) return {}
  try {
    return JSON.parse(raw) as StageTextConfig
  } catch {
    return {}
  }
}

export interface TextProviderOptions {
  projectId?: string
  providerOverride?: string
  modelOverride?: string
}

export async function getTextProviderForStage(
  event: H3Event,
  userId: string,
  stage: TextWorkflowStage,
  options?: TextProviderOptions,
) {
  const config = useRuntimeConfig()
  const db = useDB()

  const settings = await db.query.userSettings.findFirst({
    where: eq(schema.userSettings.userId, userId),
  })

  let projectAiProvider: string | null = null
  if (options?.projectId) {
    const project = await db.query.projects.findFirst({
      where: eq(schema.projects.id, options.projectId),
      columns: { aiProvider: true, userId: true },
    })
    if (project?.userId === userId) {
      projectAiProvider = project.aiProvider
    }
  }

  const stageConfig = parseStageTextConfig(settings?.stageTextConfig)[stage]
  const textProviderIds = await getProviderIdsByCapability('text-generation', userId)

  if (textProviderIds.length === 0) {
    console.error(`[ai] Failed to get text provider for stage "${stage}": No implemented text-generation providers are enabled in the provider registry for user ${userId}.`)
    throw createError({
      statusCode: 500,
      statusMessage: 'No implemented text-generation providers are enabled in the provider registry.',
    })
  }

  const preferredProvider = options?.providerOverride
    ?? stageConfig?.provider
    ?? projectAiProvider
    ?? settings?.defaultAiProvider
    ?? (config.defaultAiProvider as string)

  if (!preferredProvider || !textProviderIds.includes(preferredProvider)) {
    console.warn(`[ai] Preferred provider "${preferredProvider}" not available, falling back to next available provider.`)
  }

  const providerId = textProviderIds.includes(preferredProvider as string)
    ? preferredProvider as string
    : textProviderIds.includes(settings?.defaultAiProvider ?? '')
      ? (settings!.defaultAiProvider as string)
      : textProviderIds[0]!

  const providerEntry = await getProviderById(providerId, userId)
  if (!providerEntry || !textProviderIds.includes(providerId)) {
    console.error(`[ai] Unknown text provider "${providerId}" requested by user ${userId}`)
    throw createError({ statusCode: 400, statusMessage: `Unknown text provider: ${providerId}` })
  }

  const apiKey = resolveProviderApiKey(providerEntry, settings as any, config as any)
  if (!apiKey) {
    const envHint = providerEntry.envVarName ? ` via ${providerEntry.envVarName}` : ''
    console.error(`[ai] No API key configured for "${providerId}" for user ${userId}.`)
    throw createError({
      statusCode: 400,
      statusMessage: `No API key configured for ${providerId}. Please configure it in Settings${envHint}.`,
    })
  }

  const catalogModel = resolveDefaultModelFromCatalog(providerEntry.models)
  const fallbackModel = DEFAULT_TEXT_MODELS[providerId as AIProvider]
  const model = options?.modelOverride
    || stageConfig?.model
    || catalogModel
    || fallbackModel

  return createAIProvider(providerId as AIProvider, apiKey, model, providerEntry.baseURL ?? undefined)
}

/** Global default text provider (no per-stage routing). Kept for backward compatibility. */
export async function getAIProviderForUser(event: H3Event, userId: string, projectId?: string) {
  return getTextProviderForStage(event, userId, 'gather-idea', { projectId })
}

export async function getImageProviderForUser(event: H3Event, userId: string, providerOverride?: string, modelOverride?: string) {
  const config = useRuntimeConfig()
  const db = useDB()
  const { createImageProvider } = await import('../services/image-generation')
  const { schema: s } = await import('../database')

  const settings = await db.query.userSettings.findFirst({
    where: eq(s.userSettings.userId, userId),
  })

  const generationProviderIds = await getProviderIdsByCapability('generation', userId)

  if (generationProviderIds.length === 0) {
    throw createError({
      statusCode: 500,
      statusMessage: 'No implemented image generation providers are enabled in the provider registry.',
    })
  }

  if (providerOverride && !generationProviderIds.includes(providerOverride)) {
    throw createError({ statusCode: 400, statusMessage: `Unknown image provider: ${providerOverride}` })
  }

  const configuredProvider = (providerOverride ?? settings?.defaultImageProvider ?? config.defaultImageProvider) as string | undefined
  const provider = generationProviderIds.includes(configuredProvider as string)
    ? (configuredProvider as string)
    : generationProviderIds[0]!
  const providerEntry = await getProviderById(provider, userId)
  if (!providerEntry || !generationProviderIds.includes(provider)) {
    throw createError({ statusCode: 400, statusMessage: `Unknown image provider: ${provider}` })
  }

  const apiKey = resolveProviderApiKey(providerEntry, settings as any, config as any)

  if (!apiKey) {
    const envHint = providerEntry.envVarName ? ` via ${providerEntry.envVarName}` : ''
    throw createError({
      statusCode: 400,
      statusMessage: `No API key configured for ${provider}. Please configure it in Settings${envHint}.`,
    })
  }

  return createImageProvider(provider as any, apiKey, modelOverride)
}
