import { useDB, schema } from '~~/server/database'
import { requireUser } from '~~/server/utils/auth'
import { eq } from 'drizzle-orm'
import { getCapabilityProviderChoices } from '~~/server/utils/provider-registry'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const config = useRuntimeConfig()
  const db = useDB()

  const settings = await db.query.userSettings.findFirst({
    where: eq(schema.userSettings.userId, user.id),
  })

  const query = getQuery(event)
  const capability = (query.capability as string) || 'generation'

  const providersRaw = await getCapabilityProviderChoices(capability as any, settings as any, config as any, user.id)

  // Stage 5 dropdowns: only providers enabled in Settings and configured for this user/env.
  const eligible = providersRaw.filter((provider) => provider.enabled && provider.available)

  const providers = eligible.map((provider) => ({
    id: provider.id,
    label: provider.label,
    enabled: provider.enabled,
    hasKey: provider.available,
    envVarName: provider.envVarName,
    models: (provider.models ?? []).map((m: any) => ({
      id: m.id,
      label: m.label,
      description: m.description ?? '',
      cost: m.cost ?? '',
      enabled: m.enabled !== false,
    })),
  }))

  let preferredProvider = ''
  if (capability === 'generation') preferredProvider = (settings?.defaultImageProvider ?? config.defaultImageProvider ?? 'fal') as string
  if (capability === 'upscale') preferredProvider = (settings?.defaultUpscaleProvider ?? config.defaultUpscaleProvider) as string
  if (capability === 'background-removal') preferredProvider = (settings?.defaultBackgroundRemovalProvider ?? config.defaultBackgroundRemovalProvider) as string

  const firstAvailable = providers.find((p) => p.enabled && p.hasKey)
  const preferred = providers.find((p) => p.id === preferredProvider && p.enabled && p.hasKey)
  const defaultProvider = preferred?.id ?? firstAvailable?.id ?? providers.find((p) => p.enabled)?.id ?? providers[0]?.id ?? null

  return { providers, defaultProvider }
})
