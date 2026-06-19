import { useDB, schema } from '~~/server/database'
import { count, eq, inArray } from 'drizzle-orm'
import type { ProviderCapability } from '~~/shared/types/providers'
import { CANONICAL_MODELS_BY_PROVIDER, FAL_GENERATION_MODELS, mergeProviderModels } from '~~/server/utils/canonical-providers'

const DEPRECATED_PROVIDER_IDS = ['midjourney', 'stable-diffusion', 'nano-banana', 'grok-imagine', 'rembg']

const INITIAL_PROVIDERS = [
    {
        id: 'gemini',
        label: 'Google Gemini',
        capabilities: ['text-generation'] as ProviderCapability[],
        credentialSource: 'user_or_env',
        runtimeConfigKey: 'geminiApiKey',
        userSettingsKey: 'geminiApiKey',
        envVarName: 'NUXT_GEMINI_API_KEY',
        models: CANONICAL_MODELS_BY_PROVIDER.gemini,
        enabled: true,
    },
    {
        id: 'openai',
        label: 'OpenAI',
        capabilities: ['text-generation'] as ProviderCapability[],
        credentialSource: 'user_or_env',
        runtimeConfigKey: 'openaiApiKey',
        userSettingsKey: 'openaiApiKey',
        envVarName: 'NUXT_OPENAI_API_KEY',
        models: CANONICAL_MODELS_BY_PROVIDER.openai,
        enabled: true,
    },
    {
        id: 'anthropic',
        label: 'Anthropic',
        capabilities: ['text-generation'] as ProviderCapability[],
        credentialSource: 'user_or_env',
        runtimeConfigKey: 'anthropicApiKey',
        userSettingsKey: 'anthropicApiKey',
        envVarName: 'NUXT_ANTHROPIC_API_KEY',
        models: CANONICAL_MODELS_BY_PROVIDER.anthropic,
        enabled: true,
    },
    {
        id: 'xai',
        label: 'xAI (Grok)',
        capabilities: ['text-generation'] as ProviderCapability[],
        credentialSource: 'user_or_env',
        runtimeConfigKey: 'xaiApiKey',
        userSettingsKey: 'xaiApiKey',
        envVarName: 'NUXT_XAI_API_KEY',
        models: CANONICAL_MODELS_BY_PROVIDER.xai,
        enabled: true,
    },
    {
        id: 'groq',
        label: 'Groq',
        capabilities: ['text-generation'] as ProviderCapability[],
        credentialSource: 'user_or_env',
        runtimeConfigKey: 'groqApiKey',
        userSettingsKey: 'groqApiKey',
        envVarName: 'NUXT_GROQ_API_KEY',
        models: CANONICAL_MODELS_BY_PROVIDER.groq,
        enabled: true,
    },
    {
        id: 'together',
        label: 'Together.ai',
        capabilities: ['text-generation'] as ProviderCapability[],
        credentialSource: 'user_or_env',
        runtimeConfigKey: 'togetherApiKey',
        userSettingsKey: 'togetherApiKey',
        envVarName: 'NUXT_TOGETHER_API_KEY',
        models: CANONICAL_MODELS_BY_PROVIDER.together,
        enabled: true,
    },
    {
        id: 'deepinfra',
        label: 'DeepInfra',
        capabilities: ['text-generation'] as ProviderCapability[],
        credentialSource: 'user_or_env',
        runtimeConfigKey: 'deepinfraApiKey',
        userSettingsKey: 'deepinfraApiKey',
        envVarName: 'NUXT_DEEPINFRA_API_KEY',
        models: CANONICAL_MODELS_BY_PROVIDER.deepinfra,
        enabled: true,
    },
    {
        id: 'krea',
        label: 'Krea.ai',
        capabilities: ['generation'] as ProviderCapability[],
        credentialSource: 'user_or_env',
        runtimeConfigKey: 'kreaApiKey',
        userSettingsKey: 'kreaApiKey',
        envVarName: 'NUXT_KREA_API_KEY',
        models: [
            { id: 'bfl/flux-1-dev', label: 'Flux-1 Dev', description: 'Fast (~5s). Best for LoRAs.', cost: '~5 CU', enabled: true },
            { id: 'bfl/flux-1-kontext-dev', label: 'Flux Kontext', description: 'Image editing, Krea-optimized (~5s).', cost: '~9 CU', enabled: true },
            { id: 'google/nano-banana-pro', label: 'Nano Banana Pro', description: 'High-quality photorealistic (~30s). Up to 4K.', cost: '~119 CU', enabled: true },
        ],
        enabled: true,
    },
    {
        id: 'fal',
        label: 'Fal.ai',
        capabilities: ['generation'] as ProviderCapability[],
        credentialSource: 'user_or_env',
        runtimeConfigKey: 'falApiKey',
        userSettingsKey: 'falApiKey',
        envVarName: 'NUXT_FAL_API_KEY',
        models: FAL_GENERATION_MODELS,
        enabled: true,
    },
    {
        id: 'leonardo',
        label: 'Leonardo',
        capabilities: ['upscale', 'background-removal'] as ProviderCapability[],
        credentialSource: 'env_only',
        runtimeConfigKey: 'leonardoApiKey',
        envVarName: 'NUXT_LEONARDO_API_KEY',
        enabled: true,
    },
    {
        id: 'replicate',
        label: 'Replicate',
        capabilities: ['upscale'] as ProviderCapability[],
        credentialSource: 'env_only',
        runtimeConfigKey: 'replicateApiToken',
        envVarName: 'NUXT_REPLICATE_API_TOKEN',
        enabled: true,
    },
    {
        id: 'topaz',
        label: 'Topaz Gigapixel',
        capabilities: ['upscale'] as ProviderCapability[],
        credentialSource: 'env_only',
        runtimeConfigKey: 'topazApiKey',
        envVarName: 'NUXT_TOPAZ_API_KEY',
        enabled: false,
    },
    {
        id: 'local',
        label: 'Local (sharp lanczos3)',
        capabilities: ['upscale'] as ProviderCapability[],
        credentialSource: 'service_env',
        enabled: true,
    },
    {
        id: 'local-bg',
        label: 'Local (in-process)',
        capabilities: ['background-removal'] as ProviderCapability[],
        credentialSource: 'service_env',
        enabled: true,
    },
    {
        id: 'photoroom',
        label: 'Photoroom',
        capabilities: ['background-removal', 'upscale'] as ProviderCapability[],
        credentialSource: 'env_only',
        runtimeConfigKey: 'photoroomApiKey',
        envVarName: 'NUXT_PHOTOROOM_API_KEY',
        enabled: true,
    },
    {
        id: 'bria',
        label: 'Bria',
        capabilities: ['background-removal'] as ProviderCapability[],
        credentialSource: 'env_only',
        runtimeConfigKey: 'briaApiKey',
        envVarName: 'NUXT_BRIA_API_KEY',
        enabled: false,
    },
    {
        id: 'printify',
        label: 'Printify',
        capabilities: ['fulfillment'] as ProviderCapability[],
        credentialSource: 'user_or_env',
        runtimeConfigKey: 'printifyApiKey',
        userSettingsKey: 'printifyApiKey',
        envVarName: 'NUXT_PRINTIFY_API_KEY',
        enabled: true,
    },
    {
        id: 'printful',
        label: 'Printful',
        capabilities: ['fulfillment'] as ProviderCapability[],
        credentialSource: 'user_or_env',
        runtimeConfigKey: 'printfulApiKey',
        userSettingsKey: 'printfulApiKey',
        envVarName: 'NUXT_PRINTFUL_API_KEY',
        enabled: true,
    },
]

export default defineNitroPlugin(async (nitroApp) => {
    try {
        const db = useDB()
        const { providers } = schema
        const providerCount = await db.select({ value: count() }).from(providers)

        if (providerCount[0]?.value === 0) {
            console.log('Seeding default providers into the database...')
            const toInsert = INITIAL_PROVIDERS.map(p => ({
                id: p.id,
                label: p.label,
                capabilities: p.capabilities,
                credentialSource: p.credentialSource,
                runtimeConfigKey: p.runtimeConfigKey ?? null,
                userSettingsKey: p.userSettingsKey ?? null,
                envVarName: p.envVarName ?? null,
                models: p.models ?? null,
                enabled: p.enabled ?? true,
            }))
            await db.insert(providers).values(toInsert)
            console.log('Seeding providers completed.')
        } else {
            // Sync capabilities + canonical model lists for existing providers.
            // Also insert any new providers added to the canonical list since the
            // initial seed (so adding a provider to INITIAL_PROVIDERS doesn't
            // require a DB wipe).
            for (const p of INITIAL_PROVIDERS) {
                const existing = await db.query.providers.findFirst({
                    where: eq(providers.id, p.id),
                })
                if (!existing) {
                    await db.insert(providers).values({
                        id: p.id,
                        label: p.label,
                        capabilities: p.capabilities,
                        credentialSource: p.credentialSource,
                        runtimeConfigKey: p.runtimeConfigKey ?? null,
                        userSettingsKey: p.userSettingsKey ?? null,
                        envVarName: p.envVarName ?? null,
                        models: p.models ?? null,
                        enabled: p.enabled ?? true,
                    })
                    continue
                }

                const patch: Record<string, unknown> = {}

                const existingCaps = (existing.capabilities as string[]) ?? []
                const expectedCaps = p.capabilities as string[]
                const capsMatch = expectedCaps.length === existingCaps.length
                    && expectedCaps.every(c => existingCaps.includes(c))
                if (!capsMatch) {
                    patch.capabilities = expectedCaps
                }

                // Always reconcile canonical model catalog (labels, new models) while preserving enabled toggles.
                if (p.models) {
                    const merged = mergeProviderModels(
                        p.models,
                        (existing.models as typeof p.models) ?? [],
                    )
                    const existingJson = JSON.stringify(existing.models ?? [])
                    const mergedJson = JSON.stringify(merged ?? [])
                    if (mergedJson !== existingJson) {
                        patch.models = merged
                    }
                }

                if (Object.keys(patch).length > 0) {
                    await db.update(providers).set(patch).where(eq(providers.id, p.id))
                }
            }
        }

        // Prune deprecated providers removed from the canonical list
        await db.delete(providers).where(inArray(providers.id, DEPRECATED_PROVIDER_IDS))
    } catch (error) {
        console.error('Failed to seed providers:', error)
    }
})
