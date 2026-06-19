import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDB, schema } from '~~/server/database'
import { CANONICAL_MODELS_BY_PROVIDER, mergeProviderModels } from '~~/server/utils/canonical-providers'
import { isProviderImplemented, type ProviderCapability } from '~~/shared/types/providers'

export type CredentialSource = 'user_or_env' | 'env_only' | 'service_env'

export interface ProviderModel {
  id: string
  label: string
  description: string
  cost: string
  enabled?: boolean
}

export interface ProviderRegistryEntry {
  id: string
  label: string
  capabilities: ProviderCapability[]
  credentialSource: CredentialSource
  runtimeConfigKey?: string
  userSettingsKey?: string
  envVarName?: string
  baseURL?: string
  isOpenAICompatible?: boolean
  models?: ProviderModel[]
  enabled?: boolean
}

const capabilitySchema = z.enum(['text-generation', 'generation', 'upscale', 'background-removal', 'fulfillment'])
const credentialSourceSchema = z.enum(['user_or_env', 'env_only', 'service_env'])
const providerModelSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  description: z.string().default(''),
  cost: z.string().default(''),
  enabled: z.boolean().optional(),
})

export const providerRegistryEntrySchema = z.object({
  id: z.string().trim().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase kebab-case IDs.'),
  label: z.string().trim().min(1),
  capabilities: z.array(capabilitySchema),
  credentialSource: credentialSourceSchema,
  runtimeConfigKey: z.string().trim().min(1).optional().nullable(),
  userSettingsKey: z.string().trim().min(1).optional().nullable(),
  envVarName: z.string().trim().min(1).optional().nullable(),
  baseURL: z.string().trim().url().optional().nullable(),
  isOpenAICompatible: z.boolean().optional(),
  models: z.array(providerModelSchema).optional(),
  enabled: z.boolean().optional(),
})

export async function getProviderRegistry(userId?: string): Promise<ProviderRegistryEntry[]> {
  const db = useDB()
  const providersRows = await db.query.providers.findMany()

  const globalProviders: ProviderRegistryEntry[] = providersRows.map((row) => {
    const stored = (row.models as ProviderModel[]) ?? undefined
    const canonical = CANONICAL_MODELS_BY_PROVIDER[row.id]
    return {
      id: row.id,
      label: row.label,
      capabilities: row.capabilities as ProviderCapability[],
      credentialSource: row.credentialSource as CredentialSource,
      runtimeConfigKey: row.runtimeConfigKey ?? undefined,
      userSettingsKey: row.userSettingsKey ?? undefined,
      envVarName: row.envVarName ?? undefined,
      models: mergeProviderModels(canonical, stored) ?? stored,
      enabled: row.enabled ?? true,
    }
  })

  if (!userId) {
    return globalProviders
  }

  const settings = await db.query.userSettings.findFirst({
    where: eq(schema.userSettings.userId, userId),
  })

  if (!settings?.providerRegistryConfig) {
    return globalProviders
  }

  try {
    const userOverrides = JSON.parse(settings.providerRegistryConfig) as ProviderRegistryEntry[]

    // Merge: Use global providers as base, apply user overrides
    const registry = globalProviders.map(p => {
      const override = userOverrides.find(o => o.id === p.id)
      if (override) {
        return {
          ...p,
          label: override.label || p.label,
          capabilities: override.capabilities || p.capabilities,
          enabled: override.enabled ?? p.enabled,
          credentialSource: override.credentialSource || p.credentialSource,
          runtimeConfigKey: override.runtimeConfigKey || p.runtimeConfigKey,
          userSettingsKey: override.userSettingsKey || p.userSettingsKey,
          envVarName: override.envVarName || p.envVarName,
          models: mergeProviderModels(
            CANONICAL_MODELS_BY_PROVIDER[p.id] ?? p.models,
            mergeProviderModels(p.models, override.models),
          ) ?? p.models,
        }
      }
      return p
    })

    // Also add any purely custom providers that aren't in the global list
    const customProviders = userOverrides.filter(o => !globalProviders.some(p => p.id === o.id))
    registry.push(...customProviders)

    return registry
  } catch (e) {
    console.error('Failed to parse providerRegistryConfig for user', userId, e)
    return globalProviders
  }
}

export async function getProviderById(id: string, userId?: string): Promise<ProviderRegistryEntry | undefined> {
  const registry = await getProviderRegistry(userId)
  return registry.find((provider) => provider.id === id)
}

export async function getProvidersByCapability(capability: ProviderCapability, userId?: string): Promise<ProviderRegistryEntry[]> {
  const registry = await getProviderRegistry(userId)
  return registry.filter(
    (provider) => provider.enabled !== false
      && provider.capabilities.includes(capability)
      && isProviderImplemented(provider.id, capability),
  )
}

export async function getProviderIdsByCapability(capability: ProviderCapability, userId?: string): Promise<string[]> {
  const providers = await getProvidersByCapability(capability, userId)
  return providers.map((provider) => provider.id)
}

export function isProviderConfigured(
  provider: ProviderRegistryEntry,
  settings: Record<string, any> | null | undefined,
  config: Record<string, any>,
): boolean {
  if (provider.enabled === false) return false

  switch (provider.credentialSource) {
    case 'user_or_env':
      if (!provider.runtimeConfigKey || !provider.userSettingsKey) return false
      return !!(settings?.[provider.userSettingsKey] || config[provider.runtimeConfigKey])
    case 'env_only':
      if (provider.runtimeConfigKey) return !!config[provider.runtimeConfigKey]
      return !!(provider.envVarName ? process.env[provider.envVarName] : false)
    case 'service_env':
      // No envVarName means the provider runs on our own infra and needs
      // no credentials — treat it as always configured.
      if (!provider.envVarName) return true
      return !!process.env[provider.envVarName]
    default:
      return false
  }
}

export function resolveProviderApiKey(
  provider: ProviderRegistryEntry,
  settings: Record<string, any> | null | undefined,
  config: Record<string, any>,
): string | undefined {
  if (provider.enabled === false) return undefined

  switch (provider.credentialSource) {
    case 'user_or_env':
      if (!provider.runtimeConfigKey || !provider.userSettingsKey) return undefined
      return settings?.[provider.userSettingsKey] || config[provider.runtimeConfigKey]
    case 'env_only':
      if (!provider.runtimeConfigKey) return undefined
      return config[provider.runtimeConfigKey]
    case 'service_env':
      return undefined
    default:
      return undefined
  }
}

export async function getCapabilityProviderChoices(
  capability: ProviderCapability,
  settings: Record<string, any> | null | undefined,
  config: Record<string, any>,
  userId?: string,
) {
  const registry = await getProviderRegistry(userId)
  return registry
    .filter(
      (provider) => provider.capabilities.includes(capability)
        && isProviderImplemented(provider.id, capability),
    )
    .map((provider) => {
      const selectable = provider.enabled ?? true

      return {
        id: provider.id,
        label: provider.label,
        enabled: provider.enabled ?? true,
        implemented: isProviderImplemented(provider.id, capability),
        selectable,
        available: selectable && isProviderConfigured(provider, settings, config),
        credentialSource: provider.credentialSource,
        envVarName: provider.envVarName ?? null,
        runtimeConfigKey: provider.runtimeConfigKey ?? null,
        userSettingsKey: provider.userSettingsKey ?? null,
        models: provider.models ?? [],
      }
    })
}

export interface ResolvedProvider {
  id: string
  apiKey: string
}

export async function resolveProvidersForCapability(
  capability: ProviderCapability,
  options: {
    settings?: Record<string, any> | null
    config: Record<string, any>
    preferredProviderId?: string | null
    defaultSettingsKey?: string
    defaultConfigKey?: string
  },
): Promise<ResolvedProvider[]> {
  const candidates = await getProvidersByCapability(capability)

  const withKeys: ResolvedProvider[] = []
  for (const entry of candidates) {
    if (entry.credentialSource === 'service_env') {
      // No envVarName → credential-free provider (e.g. local sharp upscaler).
      if (!entry.envVarName) {
        withKeys.push({ id: entry.id, apiKey: '' })
        continue
      }
      if (process.env[entry.envVarName]) {
        withKeys.push({ id: entry.id, apiKey: '' })
      }
      continue
    }

    const key = resolveProviderApiKey(entry, options.settings, options.config)
    if (key) {
      withKeys.push({ id: entry.id, apiKey: key })
    }
  }

  if (withKeys.length === 0) return []

  const preferred = options.preferredProviderId
    ?? (options.defaultSettingsKey && options.settings?.[options.defaultSettingsKey])
    ?? (options.defaultConfigKey && options.config[options.defaultConfigKey])
    ?? null

  if (!preferred) return withKeys

  const preferredIndex = withKeys.findIndex((p) => p.id === preferred)
  if (preferredIndex > 0) {
    const [entry] = withKeys.splice(preferredIndex, 1)
    withKeys.unshift(entry!)
  }

  return withKeys
}
