<script setup lang="ts">

interface ProviderModel {
  id: string
  label: string
  description: string
  cost: string
  enabled?: boolean
}

interface ProviderInfo {
  id: string
  label: string
  enabled?: boolean
  hasKey?: boolean
  envVarName?: string | null
  models: ProviderModel[]
}

interface ImageRecord {
  id: string
  imageUrl: string
  thumbnailUrl: string | null
  imageProvider: string
  width: number
  height: number
  generationStatus: string
  providerJobId: string | null
  errorMessage: string | null
  isSelected: boolean
  promptId: string
  promptText: string
  themeId: string
  themeTitle: string
  createdAt: string
  metadata?: string | null
}

interface PromptRecord {
  id: string
  promptText: string
  designLane?: string | null
  sloganText?: string | null
  recommendedModel?: string | null
  themeId: string
  themeTitle: string
}

interface ThemeGroup {
  themeId: string
  themeTitle: string
  expanded: boolean
  cards: ImageRecord[]
  failedCards: ImageRecord[]
  pendingPrompts: PromptRecord[]
  isRegenerating: boolean
}

interface EditState {
  editedPrompt: string
  isEdited: boolean
}

const props = defineProps<{
  projectId: string
  project: any
}>()

const emit = defineEmits<{
  (e: 'ready', value: boolean): void
}>()

const isGenerating = ref(false)
const generatingPromptIds = ref<Set<string>>(new Set())
const images = ref<ImageRecord[]>([])
const prompts = ref<PromptRecord[]>([])
const selectedIds = ref<Set<string>>(new Set())
const previewImage = ref<ImageRecord | null>(null)
const availableProviders = ref<ProviderInfo[]>([])
const selectedProvider = ref('')
const selectedModel = ref('')

// Separate reactive map for edit state — survives computed re-renders
const editStates = reactive<Record<string, EditState>>({})

// Per-prompt provider/model overrides (keyed by promptId). Empty = use batch defaults.
const promptOverrides = reactive<Record<string, { provider: string; model: string }>>({})

function getPromptProvider(promptId: string) {
  return promptOverrides[promptId]?.provider || selectedProvider.value
}
function getPromptModel(promptId: string) {
  return promptOverrides[promptId]?.model || selectedModel.value
}
function setPromptProvider(promptId: string, providerId: string) {
  const provider = availableProviders.value.find(p => p.id === providerId)
  const firstModel = provider?.models.find(m => m.enabled !== false) ?? provider?.models[0]
  promptOverrides[promptId] = { provider: providerId, model: firstModel?.id ?? '' }
}
function setPromptModel(promptId: string, modelId: string) {
  const current = promptOverrides[promptId]?.provider || selectedProvider.value
  promptOverrides[promptId] = { provider: current, model: modelId }
}
function getPromptModels(promptId: string) {
  const pid = getPromptProvider(promptId)
  return availableProviders.value.find(p => p.id === pid)?.models ?? []
}
function isPromptOverridden(promptId: string) {
  const ov = promptOverrides[promptId]
  if (!ov) return false
  return ov.provider !== selectedProvider.value || ov.model !== selectedModel.value
}

// Mutable theme groups — rebuilt from images but preserving expand/regenerating state
const themeGroups = ref<ThemeGroup[]>([])

function getProviderLabel(providerId: string) {
  return availableProviders.value.find((provider) => provider.id === providerId)?.label ?? providerId
}

function getImageModelLabel(img: ImageRecord): string | null {
  if (!img.metadata) return null
  try {
    const parsed = typeof img.metadata === 'string' ? JSON.parse(img.metadata) : img.metadata
    const modelId = parsed?.model
    if (!modelId) return null
    const provider = availableProviders.value.find(p => p.id === img.imageProvider)
    return provider?.models.find(m => m.id === modelId)?.label ?? modelId
  } catch {
    return null
  }
}

// Get current provider's models
const currentProvider = computed(() => availableProviders.value.find(p => p.id === selectedProvider.value))
const currentModels = computed(() => currentProvider.value?.models ?? [])

function providerDisabledReason(p: ProviderInfo): string | null {
  if (p.enabled === false) return 'disabled in Settings → Providers'
  if (p.hasKey === false) return p.envVarName ? `missing ${p.envVarName}` : 'no API key'
  return null
}

function modelDisabledReason(p: ProviderInfo | undefined, m: ProviderModel): string | null {
  if (p && providerDisabledReason(p)) return null // provider-level hint already shown
  if (m.enabled === false) return 'disabled'
  return null
}

function isProviderSelectable(p: ProviderInfo) {
  return p.enabled !== false && p.hasKey !== false
}

function isModelSelectable(p: ProviderInfo | undefined, m: ProviderModel) {
  return !!p && isProviderSelectable(p) && m.enabled !== false
}

function selectDefaultModel() {
  const models = currentModels.value
  const preferred = selectedProvider.value === 'fal'
    ? models.find(m => m.id === 'fal-ai/flux/dev' && m.enabled !== false)
    : undefined
  const firstEnabled = preferred ?? models.find(m => m.enabled !== false)
  selectedModel.value = firstEnabled?.id ?? models[0]?.id ?? ''
}

watch(selectedProvider, selectDefaultModel)

const canGenerate = computed(() => {
  const p = currentProvider.value
  const m = currentModels.value.find(x => x.id === selectedModel.value)
  return !!p && !!m && isModelSelectable(p, m)
})

// Load available providers and existing images
onMounted(async () => {
  await loadProviders()
  await loadImages()
})

async function loadProviders() {
  try {
    const data = await $fetch<{ providers: ProviderInfo[]; defaultProvider: string | null }>('/api/settings/image-providers')
    availableProviders.value = data.providers
    const firstSelectable = data.providers.find(isProviderSelectable)
    selectedProvider.value = data.defaultProvider ?? firstSelectable?.id ?? data.providers[0]?.id ?? ''
    selectDefaultModel()
    applyPromptModelDefaults()
  } catch {}
}

function applyPromptModelDefaults() {
  for (const p of prompts.value) {
    if (!p.recommendedModel || promptOverrides[p.id]) continue
    promptOverrides[p.id] = {
      provider: selectedProvider.value || 'fal',
      model: p.recommendedModel,
    }
  }
}

async function loadImages() {
  try {
    const result = await $fetch(`/api/workflow/${props.projectId}/images/status`)
    images.value = (result as any).images || []
    prompts.value = (result as any).prompts || []
    applyPromptModelDefaults()
    selectedIds.value = new Set(
      images.value.filter((img) => img.isSelected).map((img) => img.id),
    )
    emit('ready', selectedIds.value.size > 0)
  } catch {}
}

async function generateImages() {
  if (!selectedProvider.value || !selectedModel.value) {
    alert('Please select a provider and model')
    return
  }
  isGenerating.value = true
  try {
    const overrides = Object.entries(promptOverrides)
      .filter(([, v]) => v.provider !== selectedProvider.value || v.model !== selectedModel.value)
      .map(([promptId, v]) => ({ promptId, provider: v.provider, model: v.model }))
    await $fetch(`/api/workflow/${props.projectId}/images/generate`, {
      method: 'POST',
      body: {
        promptIds: [],
        provider: selectedProvider.value,
        model: selectedModel.value,
        promptOverrides: overrides,
      },
    })
    await loadImages()
  } catch (err: any) {
    alert(err.data?.message ?? 'Image generation failed')
  } finally {
    isGenerating.value = false
  }
}

async function generateSinglePrompt(promptId: string) {
  const provider = getPromptProvider(promptId)
  const model = getPromptModel(promptId)
  if (!provider || !model) {
    alert('Select a provider and model')
    return
  }
  generatingPromptIds.value = new Set([...generatingPromptIds.value, promptId])
  try {
    await $fetch(`/api/workflow/${props.projectId}/images/generate`, {
      method: 'POST',
      body: {
        promptIds: [promptId],
        provider: selectedProvider.value,
        model: selectedModel.value,
        promptOverrides: [{ promptId, provider, model }],
      },
    })
    await loadImages()
  } catch (err: any) {
    alert(err.data?.message ?? 'Image generation failed')
  } finally {
    const next = new Set(generatingPromptIds.value)
    next.delete(promptId)
    generatingPromptIds.value = next
  }
}

async function toggleSelect(id: string) {
  const willSelect = !selectedIds.value.has(id)

  if (willSelect) {
    selectedIds.value.add(id)
  } else {
    selectedIds.value.delete(id)
  }
  selectedIds.value = new Set(selectedIds.value)
  emit('ready', selectedIds.value.size > 0)

  try {
    await $fetch(`/api/workflow/${props.projectId}/images/update`, {
      method: 'PUT',
      body: { imageId: id, isSelected: willSelect },
    })
    const found = images.value.find(img => img.id === id)
    if (found) {
      found.isSelected = willSelect
    }
  } catch (err: any) {
    console.error('Failed to update image selection', err)
    if (willSelect) selectedIds.value.delete(id)
    else selectedIds.value.add(id)
    selectedIds.value = new Set(selectedIds.value)
    emit('ready', selectedIds.value.size > 0)
  }
}

async function regenerateCard(group: ThemeGroup, img: ImageRecord) {
  const es = editStates[img.id]
  if (!es) return
  group.isRegenerating = true
  try {
    const response = await $fetch<{ image: ImageRecord }>(`/api/workflow/${props.projectId}/images/regenerate`, {
      method: 'POST',
      body: {
        promptId: img.promptId,
        promptText: es.editedPrompt,
        provider: getPromptProvider(img.promptId),
        model: getPromptModel(img.promptId),
      },
    })

    const newImage: ImageRecord = {
      id: response.image.id,
      imageUrl: response.image.imageUrl,
      thumbnailUrl: response.image.thumbnailUrl,
      imageProvider: response.image.imageProvider,
      width: response.image.width,
      height: response.image.height,
      generationStatus: response.image.generationStatus,
      providerJobId: response.image.providerJobId,
      errorMessage: response.image.errorMessage,
      isSelected: response.image.isSelected,
      promptId: response.image.promptId,
      promptText: response.image.promptText,
      themeId: response.image.themeId,
      themeTitle: response.image.themeTitle,
      createdAt: response.image.createdAt,
    }

    // Add the new image to the local images array & group (partial update)
    images.value.push(newImage)
    group.cards.push(newImage)
    initEditState(newImage)

    // Reset original card's edit state
    es.isEdited = false
  } catch (err: any) {
    alert(err.data?.message ?? 'Re-generation failed')
  } finally {
    group.isRegenerating = false
  }
}

const completedImages = computed(() => images.value.filter((img) => img.generationStatus === 'completed'))
const pendingImages = computed(() => images.value.filter((img) => img.generationStatus === 'pending' || img.generationStatus === 'generating'))
const failedImages = computed(() => images.value.filter((img) => img.generationStatus === 'failed'))

// Initialize edit state for an image (only if it doesn't already exist)
function initEditState(img: ImageRecord) {
  if (!editStates[img.id]) {
    editStates[img.id] = { editedPrompt: img.promptText, isEdited: false }
  }
}

// Rebuild theme groups when images change, preserving expand/regenerating state
function rebuildGroups() {
  const existingState = new Map(themeGroups.value.map(g => [g.themeId, { expanded: g.expanded, isRegenerating: g.isRegenerating }]))

  const groups: Record<string, ThemeGroup> = {}

  for (const prompt of prompts.value) {
    const tid = prompt.themeId
    if (!groups[tid]) {
      const prev = existingState.get(tid)
      groups[tid] = {
        themeId: tid,
        themeTitle: prompt.themeTitle ?? 'Unknown Theme',
        expanded: prev?.expanded ?? true,
        cards: [],
        failedCards: [],
        pendingPrompts: [],
        isRegenerating: prev?.isRegenerating ?? false,
      }
    }
    // If no image has been generated yet for this prompt, it's pending
    const hasImage = images.value.some(img => img.promptId === prompt.id)
    if (!hasImage) {
      groups[tid].pendingPrompts.push(prompt)
    }
  }

  for (const img of images.value) {
    const tid = img.themeId
    if (!groups[tid]) {
      const prev = existingState.get(tid)
      groups[tid] = {
        themeId: tid,
        themeTitle: img.themeTitle ?? 'Unknown Theme',
        expanded: prev?.expanded ?? true,
        cards: [],
        failedCards: [],
        pendingPrompts: [],
        isRegenerating: prev?.isRegenerating ?? false,
      }
    }
    initEditState(img)
    if (img.generationStatus === 'completed') {
      groups[tid].cards.push(img)
    } else if (img.generationStatus === 'failed') {
      groups[tid].failedCards.push(img)
    }
  }
  themeGroups.value = Object.values(groups)
}

watch([images, prompts], rebuildGroups, { deep: true, immediate: true })

function toggleAccordion(group: ThemeGroup) {
  group.expanded = !group.expanded
}

function onPromptEdit(imgId: string) {
  const es = editStates[imgId]
  const img = images.value.find(i => i.id === imgId)
  if (es && img) {
    es.isEdited = es.editedPrompt !== img.promptText
  }
}

// Helper to safely get edit state for template use
function getEditState(imgId: string): EditState | null {
  return editStates[imgId] ?? null
}

// Computed description tooltip for the selected model
const selectedModelDescription = computed(() => {
  return currentModels.value.find(m => m.id === selectedModel.value)?.description ?? ''
})
</script>

<template>
  <div class="space-y-6">
    <!-- Controls — aligned row -->
    <div class="flex items-end gap-4 flex-wrap">
      <!-- Provider Selector -->
      <div class="space-y-1.5">
        <label class="text-sm font-medium">Provider</label>
        <select
          v-model="selectedProvider"
          class="flex w-44 rounded-lg border bg-background px-3 py-2.5 text-sm"
        >
          <option v-if="availableProviders.length === 0" value="" disabled>No providers configured</option>
          <option
            v-for="p in availableProviders"
            :key="p.id"
            :value="p.id"
            :disabled="!isProviderSelectable(p)"
          >
            {{ p.label }}<template v-if="providerDisabledReason(p)"> ({{ providerDisabledReason(p) }})</template>
          </option>
        </select>
      </div>

      <!-- Model Selector -->
      <div class="space-y-1.5">
        <label class="text-sm font-medium">Model</label>
        <div class="flex items-center gap-1.5">
          <select
            v-model="selectedModel"
            class="flex w-56 rounded-lg border bg-background px-3 py-2.5 text-sm"
            :disabled="currentModels.length === 0 || !currentProvider || !isProviderSelectable(currentProvider)"
          >
            <option
              v-for="m in currentModels"
              :key="m.id"
              :value="m.id"
              :disabled="!isModelSelectable(currentProvider, m)"
            >
              {{ m.label }}<template v-if="m.cost"> ({{ m.cost }})</template><template v-if="modelDisabledReason(currentProvider, m)"> — {{ modelDisabledReason(currentProvider, m) }}</template>
            </option>
          </select>
          <!-- Info icon with tooltip for model description -->
          <span
            v-if="selectedModelDescription"
            class="shrink-0 cursor-help text-muted-foreground hover:text-foreground transition-colors"
            :title="selectedModelDescription"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
        </div>
      </div>

      <!-- Generate Button -->
      <div>
        <button
          class="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          :disabled="isGenerating || !selectedProvider || !selectedModel || !canGenerate"
          :title="!canGenerate ? 'Enable a provider/model with a valid API key in Settings' : ''"
          @click="generateImages"
        >
          <svg v-if="isGenerating" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isGenerating ? 'Generating...' : 'Generate Images' }}
        </button>
      </div>

      <span v-if="images.length > 0" class="text-sm text-muted-foreground pb-0.5">
        {{ completedImages.length }} completed, {{ pendingImages.length }} pending, {{ failedImages.length }} failed
      </span>
    </div>

    <!-- Loading Skeletons -->
    <div v-if="isGenerating && themeGroups.length === 0" class="space-y-4 mt-6">
      <div v-for="g in 3" :key="'skel-g'+g" class="rounded-lg border">
        <div class="flex items-center gap-3 px-4 py-3 bg-muted/40">
          <div class="h-5 w-5 rounded bg-muted animate-pulse" />
          <div class="h-4 w-40 rounded bg-muted animate-pulse" />
        </div>
        <div class="p-4">
          <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div class="rounded-lg border overflow-hidden">
              <div class="aspect-square bg-muted animate-pulse" />
              <div class="p-3 space-y-2">
                <div class="h-3 w-full bg-muted/50 animate-pulse rounded" />
                <div class="h-3 w-3/4 bg-muted/50 animate-pulse rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Theme Accordion Groups -->
    <div v-else-if="themeGroups.length > 0" class="space-y-3 mt-6">
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-semibold">Generated Images ({{ completedImages.length }})</h3>
        <span class="text-sm text-muted-foreground">{{ selectedIds.size }} selected for products</span>
      </div>

      <div
        v-for="group in themeGroups"
        :key="group.themeId"
        class="rounded-lg border overflow-hidden"
      >
        <!-- Accordion Header -->
        <button
          class="flex w-full items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
          @click="toggleAccordion(group)"
        >
          <div class="flex items-center gap-3">
            <svg
              class="h-4 w-4 shrink-0 transition-transform duration-200"
              :class="{ 'rotate-90': group.expanded }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            <h4 class="font-semibold text-sm">{{ group.themeTitle }}</h4>
            <span class="text-xs text-muted-foreground">
              {{ group.cards.length }} image{{ group.cards.length !== 1 ? 's' : '' }}
            </span>
          </div>
          <span class="text-xs text-muted-foreground">
            {{ group.cards.filter(c => selectedIds.has(c.id)).length }}/{{ group.cards.length }} selected
          </span>
        </button>

        <!-- Accordion Body -->
        <div v-show="group.expanded" class="p-4">
          <!-- Regenerating indicator -->
          <div v-if="group.isRegenerating" class="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
            <svg class="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Re-generating image...
          </div>

          <!-- Cards Grid: Image on top, Prompt on bottom -->
          <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="img in group.cards"
              :key="img.id"
              class="group relative rounded-lg border overflow-hidden transition-all"
              :class="{ 'ring-2 ring-primary': selectedIds.has(img.id) }"
            >
              <!-- Image Section (top) -->
              <div class="aspect-square bg-muted relative cursor-pointer" @click="previewImage = img">
                <img
                  :src="img.imageUrl"
                  :alt="group.themeTitle"
                  class="h-full w-full object-cover"
                  loading="lazy"
                />
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

                <!-- Selection checkbox -->
                <button
                  class="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded border bg-background/80 backdrop-blur text-xs z-10"
                  :class="{ 'bg-primary border-primary text-primary-foreground': selectedIds.has(img.id) }"
                  @click.stop="toggleSelect(img.id)"
                >
                  <svg v-if="selectedIds.has(img.id)" class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>

              <!-- Prompt Section (bottom) -->
              <div v-if="getEditState(img.id)" class="p-3 space-y-2.5">
                <div class="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {{ getProviderLabel(img.imageProvider) }}<template v-if="getImageModelLabel(img)"> · {{ getImageModelLabel(img) }}</template>
                  </span>
                  <span>{{ img.width }}×{{ img.height }}</span>
                </div>

                <!-- Editable prompt -->
                <textarea
                  v-model="getEditState(img.id)!.editedPrompt"
                  class="w-full rounded-md border bg-muted/30 px-2.5 py-2 text-xs leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-primary min-h-[4.5rem] max-h-[9rem]"
                  rows="3"
                  @input="onPromptEdit(img.id)"
                />

                <!-- Per-card provider/model override (visible when editing) -->
                <div v-if="getEditState(img.id)?.isEdited" class="flex items-center gap-1.5">
                  <select
                    class="flex-1 min-w-0 rounded border bg-background px-1.5 py-1 text-[11px]"
                    :value="getPromptProvider(img.promptId)"
                    @change="setPromptProvider(img.promptId, ($event.target as HTMLSelectElement).value)"
                  >
                    <option
                      v-for="p in availableProviders"
                      :key="p.id"
                      :value="p.id"
                      :disabled="!isProviderSelectable(p)"
                    >{{ p.label }}</option>
                  </select>
                  <select
                    class="flex-1 min-w-0 rounded border bg-background px-1.5 py-1 text-[11px]"
                    :value="getPromptModel(img.promptId)"
                    @change="setPromptModel(img.promptId, ($event.target as HTMLSelectElement).value)"
                  >
                    <option
                      v-for="m in getPromptModels(img.promptId)"
                      :key="m.id"
                      :value="m.id"
                      :disabled="m.enabled === false"
                    >{{ m.label }}</option>
                  </select>
                </div>

                <!-- Re-generate button — only shows when prompt is edited -->
                <button
                  v-if="getEditState(img.id)?.isEdited"
                  class="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                  :disabled="group.isRegenerating"
                  @click="regenerateCard(group, img)"
                >
                  <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Re-generate
                </button>
              </div>
            </div>

            <!-- Loading skeleton for regeneration -->
            <div
              v-if="group.isRegenerating"
              class="rounded-lg border overflow-hidden"
            >
              <div class="aspect-square bg-muted animate-pulse" />
              <div class="p-3 space-y-2">
                <div class="h-2.5 w-full bg-muted/50 animate-pulse rounded" />
                <div class="h-2.5 w-3/4 bg-muted/50 animate-pulse rounded" />
              </div>
            </div>

            <!-- Placeholders for pending prompts -->
            <div
              v-for="prompt in group.pendingPrompts"
              :key="prompt.id"
              class="group relative rounded-lg border border-dashed border-muted-foreground/30 text-muted-foreground overflow-hidden flex flex-col p-4 min-h-[16rem]"
            >
              <div class="flex flex-col items-center flex-1 justify-center text-center">
                <svg class="mb-3 h-8 w-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p class="text-xs mb-2 w-full line-clamp-3 leading-relaxed" :title="prompt.promptText">
                  {{ prompt.promptText }}
                </p>
              </div>
              <div class="mt-2 space-y-1.5">
                <div class="flex items-center gap-1.5">
                  <select
                    class="flex-1 min-w-0 rounded border bg-background px-1.5 py-1 text-[11px]"
                    :value="getPromptProvider(prompt.id)"
                    @change="setPromptProvider(prompt.id, ($event.target as HTMLSelectElement).value)"
                  >
                    <option
                      v-for="p in availableProviders"
                      :key="p.id"
                      :value="p.id"
                      :disabled="!isProviderSelectable(p)"
                    >{{ p.label }}</option>
                  </select>
                  <select
                    class="flex-1 min-w-0 rounded border bg-background px-1.5 py-1 text-[11px]"
                    :value="getPromptModel(prompt.id)"
                    @change="setPromptModel(prompt.id, ($event.target as HTMLSelectElement).value)"
                  >
                    <option
                      v-for="m in getPromptModels(prompt.id)"
                      :key="m.id"
                      :value="m.id"
                      :disabled="m.enabled === false"
                    >{{ m.label }}</option>
                  </select>
                </div>
                <button
                  class="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                  :disabled="generatingPromptIds.has(prompt.id) || !getPromptProvider(prompt.id) || !getPromptModel(prompt.id)"
                  @click="generateSinglePrompt(prompt.id)"
                >
                  <svg v-if="generatingPromptIds.has(prompt.id)" class="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {{ generatingPromptIds.has(prompt.id) ? 'Generating…' : 'Generate' }}
                </button>
                <div class="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider opacity-50">
                  <span>Pending Generation</span>
                  <span v-if="isPromptOverridden(prompt.id)" class="text-primary/70 normal-case tracking-normal">custom</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Failed images for this theme -->
          <div v-if="group.failedCards.length > 0" class="mt-3 space-y-2">
            <p class="text-xs font-medium text-destructive">{{ group.failedCards.length }} failed</p>
            <div v-for="fc in group.failedCards" :key="fc.id" class="rounded border border-destructive/30 bg-destructive/5 p-3 text-xs text-muted-foreground">
              {{ fc.errorMessage }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Image Preview Modal -->
    <Teleport to="body">
      <div v-if="previewImage" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80" @click="previewImage = null">
        <div class="relative max-h-[90vh] max-w-[90vw]" @click.stop>
          <button class="absolute -right-3 -top-3 z-10 rounded-full bg-background p-1.5 shadow-lg" @click="previewImage = null">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img :src="previewImage.imageUrl" :alt="previewImage.themeTitle" class="max-h-[85vh] rounded-lg" />
          <div class="mt-2 text-center text-sm text-white">
            {{ previewImage.themeTitle }} &mdash; {{ previewImage.width }}x{{ previewImage.height }}
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
