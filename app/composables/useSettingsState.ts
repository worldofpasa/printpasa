import { ref, reactive, computed, watch } from 'vue'
import {
  PROVIDER_CAPABILITIES,
  isProviderImplemented,
  type ProviderCapability,
} from '~~/shared/types/providers'
import {
  STAGE_TEXT_GLOBAL_DEFAULT,
  TEXT_WORKFLOW_STAGES,
  type StageTextConfig,
  type TextWorkflowStage,
} from '~~/shared/types/text-stages'

export type RegistryCapability = ProviderCapability
export type CredentialSource = 'user_or_env' | 'env_only' | 'service_env'

export type ProviderChoice = {
  id: string
  label: string
  enabled: boolean
}

export type RegistryProviderRow = {
  rowKey: string
  id: string
  label: string
  capabilities: RegistryCapability[]
  implementedCapabilities: RegistryCapability[]
  credentialSource: CredentialSource
  envVarName: string
  runtimeConfigKey: string
  userSettingsKey: string
  enabled: boolean
  models?: Array<{ id: string; label: string; description: string; cost: string; enabled?: boolean }>
}

export const CAPABILITY_LABELS: Record<RegistryCapability, string> = {
  'text-generation': 'Text Generation',
  generation: 'Image Generation',
  upscale: 'Upscaling',
  'background-removal': 'Background Removal',
  fulfillment: 'Fulfillment',
}

export const CAPABILITY_OPTIONS: RegistryCapability[] = [...PROVIDER_CAPABILITIES]

  // --- Singleton module state ---

  const isLoading = ref(true)
  const isSaving = ref(false)
  const hasUnsavedChanges = ref(false)
  const settings = ref<any>({})
  const registryDraft = ref<RegistryProviderRow[]>([])
  const saveNotice = ref<{ type: 'success' | 'error'; message: string } | null>(null)

  const form = reactive({
  defaultAIProvider: 'gemini',
  defaultImageProvider: 'fal',
  defaultUpscaleProvider: 'local',
  defaultBackgroundRemovalProvider: 'local-bg',
  defaultThemeCount: 10,
  defaultWinnerCount: 5,
  defaultPromptsPerTheme: 5,
  defaultImagesPerPrompt: 1,
  maxProductVariants: 5,
  useTrademarkApi: false,
  useBrandRiskApi: false,
  defaultSearchProvider: 'serper' as string,
})

const stageTextConfig = reactive<StageTextConfig>({})

const searchKeyDraft = reactive({
  serperApiKey: '',
  searchapiKey: '',
  serpapiKey: '',
})

let saveNoticeTimer: ReturnType<typeof setTimeout> | null = null
let providerRowKeyCounter = 0
let watcherInstalled = false

function createProviderRowKey() {
  providerRowKeyCounter += 1
  return `provider-row-${providerRowKeyCounter}`
}

function clearSaveNoticeTimer() {
  if (saveNoticeTimer) {
    clearTimeout(saveNoticeTimer)
    saveNoticeTimer = null
  }
}

function showSaveNotice(type: 'success' | 'error', message: string, autoHideMs = 0) {
  clearSaveNoticeTimer()
  saveNotice.value = { type, message }
  if (autoHideMs > 0) {
    saveNoticeTimer = setTimeout(() => {
      saveNotice.value = null
      saveNoticeTimer = null
    }, autoHideMs)
  }
}

function isImplementedForCapability(providerId: string, capability: RegistryCapability) {
  return isProviderImplemented(providerId, capability)
}

function getCapabilityOptions(capability: RegistryCapability): ProviderChoice[] {
  return registryDraft.value
    .filter((provider) => provider.capabilities.includes(capability))
    .filter((provider) => isImplementedForCapability(provider.id, capability))
    .map((provider) => ({
      id: provider.id,
      label: provider.enabled ? provider.label : `${provider.label} (disabled)`,
      enabled: provider.enabled,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

const textOptions = computed(() => getCapabilityOptions('text-generation'))
const generationOptions = computed(() => getCapabilityOptions('generation'))
const upscaleOptions = computed(() => getCapabilityOptions('upscale'))
const backgroundOptions = computed(() => getCapabilityOptions('background-removal'))
const fulfillmentOptions = computed(() => getCapabilityOptions('fulfillment'))

function normalizeRegistryProvider(rawProvider: any): RegistryProviderRow {
  return {
    rowKey: createProviderRowKey(),
    id: String(rawProvider.id ?? '').trim(),
    label: String(rawProvider.label ?? '').trim(),
    capabilities: (rawProvider.capabilities ?? []).filter((capability: string) =>
      CAPABILITY_OPTIONS.includes(capability as RegistryCapability)
      && isProviderImplemented(String(rawProvider.id ?? ''), capability as RegistryCapability),
    ),
    implementedCapabilities: (rawProvider.implementedCapabilities ?? []).filter((capability: string) =>
      CAPABILITY_OPTIONS.includes(capability as RegistryCapability),
    ),
    credentialSource: (['user_or_env', 'env_only', 'service_env'].includes(rawProvider.credentialSource)
      ? rawProvider.credentialSource
      : 'env_only') as CredentialSource,
    envVarName: String(rawProvider.envVarName ?? ''),
    runtimeConfigKey: String(rawProvider.runtimeConfigKey ?? ''),
    userSettingsKey: String(rawProvider.userSettingsKey ?? ''),
    enabled: rawProvider.enabled !== false,
    models: Array.isArray(rawProvider.models) ? rawProvider.models : [],
  }
}

function resolveDefaultSelection(current: string | undefined, options: ProviderChoice[], fallback: string) {
  const enabled = options.filter((option) => option.enabled)
  if (current && enabled.some((option) => option.id === current)) return current
  if (enabled.some((option) => option.id === fallback)) return fallback
  return enabled[0]?.id ?? options[0]?.id ?? fallback
}

async function loadSettings() {
  settings.value = await $fetch('/api/settings')
  registryDraft.value = ((settings.value?.providerRegistry ?? []) as any[]).map(normalizeRegistryProvider)
  
  for (let i = 0; i < registryDraft.value.length; i++) {
    sortProviderModels(i)
  }

  form.defaultAIProvider = resolveDefaultSelection(
    settings.value.defaultAIProvider,
    textOptions.value,
    'gemini',
  )
  form.defaultImageProvider = resolveDefaultSelection(settings.value.defaultImageProvider, generationOptions.value, 'fal')
  form.defaultUpscaleProvider = resolveDefaultSelection(settings.value.defaultUpscaleProvider, upscaleOptions.value, 'local')
  form.defaultBackgroundRemovalProvider = resolveDefaultSelection(settings.value.defaultBackgroundRemovalProvider, backgroundOptions.value, 'local-bg')
  form.defaultFulfillmentProvider = resolveDefaultSelection(settings.value.defaultFulfillmentProvider, fulfillmentOptions.value, 'printify')
  form.defaultThemeCount = settings.value.defaultThemeCount ?? 10
  form.defaultWinnerCount = settings.value.defaultWinnerCount ?? 5
  form.defaultPromptsPerTheme = settings.value.defaultPromptsPerTheme ?? 5
  form.defaultImagesPerPrompt = settings.value.defaultImagesPerPrompt ?? 1
  form.maxProductVariants = settings.value.maxProductVariants ?? 5
  form.useTrademarkApi = !!settings.value.useTrademarkApi
  form.useBrandRiskApi = !!settings.value.useBrandRiskApi
  form.defaultSearchProvider = settings.value.defaultSearchProvider ?? 'serper'
  searchKeyDraft.serperApiKey = ''
  searchKeyDraft.searchapiKey = ''
  searchKeyDraft.serpapiKey = ''

  for (const stage of TEXT_WORKFLOW_STAGES) {
    const binding = (settings.value.stageTextConfig as StageTextConfig)?.[stage]
    if (binding) {
      stageTextConfig[stage] = { ...binding }
    } else {
      delete stageTextConfig[stage]
    }
  }
}

function modelsForTextProvider(providerId: string) {
  const provider = registryDraft.value.find((p) => p.id === providerId)
  return (provider?.models ?? []).filter((m) => m.enabled !== false)
}

function isGlobalStageProvider(providerId: string) {
  return !providerId || providerId === STAGE_TEXT_GLOBAL_DEFAULT
}

function stageTextProviderSelectValue(stage: TextWorkflowStage) {
  return stageTextConfig[stage]?.provider ?? STAGE_TEXT_GLOBAL_DEFAULT
}

function stageTextModelSelectValue(stage: TextWorkflowStage) {
  const binding = stageTextConfig[stage]
  if (!binding?.provider) return undefined
  if (binding.model) return binding.model
  return modelsForTextProvider(binding.provider)[0]?.id
}

function setStageTextProvider(stage: TextWorkflowStage, providerId: string) {
  if (isGlobalStageProvider(providerId)) {
    delete stageTextConfig[stage]
    return
  }
  // Preserve the existing custom model string when switching providers;
  // only clear it if the user was previously on a different provider.
  const current = stageTextConfig[stage]
  const keepModel = current?.provider === providerId ? current.model : undefined
  stageTextConfig[stage] = keepModel
    ? { provider: providerId, model: keepModel }
    : { provider: providerId }
}

function setStageTextModel(stage: TextWorkflowStage, modelId: string) {
  const current = stageTextConfig[stage]
  if (!current?.provider) return
  const mId = modelId.trim()
  if (!mId) {
    // Empty string → remove the model override, fall back to provider default
    const { model: _removed, ...rest } = current
    stageTextConfig[stage] = rest
  } else {
    stageTextConfig[stage] = { ...current, model: mId }
  }
}

/** Returns a short human-readable summary for a stage config, e.g. "DeepInfra — google/gemma-4-31B-it" */
function stageTextSummary(stage: TextWorkflowStage): string | null {
  const binding = stageTextConfig[stage]
  if (!binding?.provider) return null
  const providerLabel = registryDraft.value.find(p => p.id === binding.provider)?.label ?? binding.provider
  return binding.model ? `${providerLabel} — ${binding.model}` : providerLabel
}

function buildStageTextConfigPayload(): StageTextConfig {
  const payload: StageTextConfig = {}
  for (const stage of TEXT_WORKFLOW_STAGES) {
    const binding = stageTextConfig[stage]
    if (!binding?.provider) continue
    payload[stage] = binding.model
      ? { provider: binding.provider, model: binding.model }
      : { provider: binding.provider }
  }
  return payload
}

function clearStageTextConfig(stage: TextWorkflowStage) {
  delete stageTextConfig[stage]
}

function sortProviderModels(providerIndex: number) {
  const provider = registryDraft.value[providerIndex]
  if (!provider?.models || provider.models.length <= 1) return
  
  const defaultModel = provider.models[0]
  const rest = provider.models.slice(1)
  rest.sort((a, b) => a.id.localeCompare(b.id))
  
  provider.models = [defaultModel!, ...rest]
}

function makeDefaultModel(providerIndex: number, modelIndex: number) {
  const provider = registryDraft.value[providerIndex]
  if (provider?.models && modelIndex > 0 && modelIndex < provider.models.length) {
    const model = provider.models.splice(modelIndex, 1)[0]
    provider.models.unshift(model!)
    sortProviderModels(providerIndex)
    save()
  }
}

function addModelToProvider(providerIndex: number, modelId: string) {
  const provider = registryDraft.value[providerIndex]
  if (!provider) return
  if (!provider.models) provider.models = []
  if (!provider.models.some((m) => m.id === modelId)) {
    provider.models.push({
      id: modelId,
      label: modelId,
      description: 'Added manually',
      cost: '',
      enabled: true,
    })
    sortProviderModels(providerIndex)
    save()
  }
}

function removeModel(providerIndex: number, modelIndex: number) {
  const provider = registryDraft.value[providerIndex]
  if (provider?.models) {
    provider.models.splice(modelIndex, 1)
    save()
  }
}

function setModelEnabled(providerIndex: number, modelIndex: number, enabled: boolean) {
  const provider = registryDraft.value[providerIndex]
  if (!provider?.models) return
  const model = provider.models[modelIndex]
  if (!model) return
  provider.models.splice(modelIndex, 1, { ...model, enabled })
  save()
}

function addProvider() {
  registryDraft.value.push({
    rowKey: createProviderRowKey(),
    id: `provider-${Date.now()}`,
    label: 'New Provider',
    capabilities: ['generation'],
    implementedCapabilities: [],
    credentialSource: 'env_only',
    envVarName: '',
    runtimeConfigKey: '',
    userSettingsKey: '',
    enabled: true,
    models: [],
  })
  save()
}

function removeProvider(index: number) {
  registryDraft.value.splice(index, 1)
  save()
}

function setProviderCapability(index: number, capability: RegistryCapability, enabled: boolean) {
  const target = registryDraft.value[index]
  if (!target || !isProviderImplemented(target.id, capability)) return
  if (enabled) {
    if (!target.capabilities.includes(capability)) target.capabilities.push(capability)
    return
  }
  target.capabilities = target.capabilities.filter((item) => item !== capability)
}

function providerImplementationText(provider: RegistryProviderRow) {
  const implemented = CAPABILITY_OPTIONS.filter((capability) => isImplementedForCapability(provider.id, capability))
  if (implemented.length === 0) return 'No runtime implementation yet'
  return `Implemented: ${implemented.map((capability) => CAPABILITY_LABELS[capability]).join(', ')}`
}

function buildProviderRegistryPayload() {
  const seenIds = new Set<string>()
  return registryDraft.value.map((provider, index) => {
    const id = provider.id.trim()
    const label = provider.label.trim()
    const capabilities = [...new Set(provider.capabilities)]

    if (!id) throw new Error(`Provider row ${index + 1} is missing an id.`)
    if (!label) throw new Error(`Provider ${id} is missing a label.`)
    if (seenIds.has(id)) throw new Error(`Duplicate provider id: ${id}`)
    seenIds.add(id)
    if (provider.enabled && capabilities.length === 0) throw new Error(`Provider ${id} must have at least one capability.`)

    return {
      id,
      label,
      capabilities,
      credentialSource: provider.credentialSource,
      runtimeConfigKey: provider.runtimeConfigKey.trim() || undefined,
      userSettingsKey: provider.userSettingsKey.trim() || undefined,
      envVarName: provider.envVarName.trim() || undefined,
      enabled: provider.enabled,
      models: provider.models?.length ? provider.models : undefined,
    }
  })
}

async function save() {
  if (isSaving.value) return
  isSaving.value = true
  saveNotice.value = null
  try {
    const providerRegistry = buildProviderRegistryPayload()
    const body: Record<string, any> = {
      defaultAIProvider: form.defaultAIProvider,
      defaultImageProvider: form.defaultImageProvider,
      defaultUpscaleProvider: form.defaultUpscaleProvider,
      defaultBackgroundRemovalProvider: form.defaultBackgroundRemovalProvider,
      defaultFulfillmentProvider: form.defaultFulfillmentProvider,
      defaultThemeCount: form.defaultThemeCount,
      defaultWinnerCount: form.defaultWinnerCount,
      defaultPromptsPerTheme: form.defaultPromptsPerTheme,
      defaultImagesPerPrompt: form.defaultImagesPerPrompt,
      maxProductVariants: form.maxProductVariants,
      useTrademarkApi: form.useTrademarkApi,
      useBrandRiskApi: form.useBrandRiskApi,
      defaultSearchProvider: form.defaultSearchProvider,
      providerRegistry,
      stageTextConfig: buildStageTextConfigPayload(),
    }
    if (searchKeyDraft.serperApiKey) body.serperApiKey = searchKeyDraft.serperApiKey
    if (searchKeyDraft.searchapiKey) body.searchapiKey = searchKeyDraft.searchapiKey
    if (searchKeyDraft.serpapiKey) body.serpapiKey = searchKeyDraft.serpapiKey
    await $fetch('/api/settings', { method: 'PUT', body })
    hasUnsavedChanges.value = false
    showSaveNotice('success', 'Settings saved', 3000)
  } catch (err: any) {
    showSaveNotice('error', err.data?.message ?? err.message ?? 'Failed to save')
  } finally {
    isSaving.value = false
  }
}


function installWatcherOnce() {
  if (watcherInstalled) return
  watcherInstalled = true
  // Track unsaved changes for the Save button indicator
  watch([form, registryDraft, searchKeyDraft, stageTextConfig], () => {
    if (!isLoading.value) hasUnsavedChanges.value = true
  }, { deep: true })
}

export function useSettingsState() {
  installWatcherOnce()
  return {
    // state
    isLoading,
    isSaving,
    hasUnsavedChanges,
    settings,
    registryDraft,
    saveNotice,
    form,
    searchKeyDraft,
    stageTextConfig,
    // computed
    textOptions,
    generationOptions,
    upscaleOptions,
    backgroundOptions,
    fulfillmentOptions,
    // methods
    loadSettings,
    save,
    clearSaveNoticeTimer,
    clearStageTextConfig,
    setModelEnabled,
    makeDefaultModel,
    addModelToProvider,
    removeModel,
    addProvider,
    removeProvider,
    setProviderCapability,
    providerImplementationText,
    isImplementedForCapability,
    modelsForTextProvider,
    stageTextProviderSelectValue,
    stageTextModelSelectValue,
    stageTextSummary,
    setStageTextProvider,
    setStageTextModel,
  }
}
