<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch } from 'vue'
import ImageEditor from '~/components/editor/ImageEditor.vue'

type EditorVariant = { id: string; label: string; url: string }

const editorState = ref<{ open: boolean; imageId: string; sourceUrl: string; title: string; variants: EditorVariant[] }>({
  open: false,
  imageId: '',
  sourceUrl: '',
  title: '',
  variants: [],
})
function openEditor(img: ImageRecord) {
  const variants: EditorVariant[] = []
  if (img.upscaledUrl) variants.push({ id: 'upscaled', label: 'Upscaled', url: img.upscaledUrl })
  if (img.bgRemovedUrl) variants.push({ id: 'bg-removed', label: 'BG removed', url: img.bgRemovedUrl })
  variants.push({ id: 'original', label: 'Original', url: img.imageUrl })

  // Prefer the latest stage so the user sees the final output by default,
  // and can still jump back to earlier stages via the variant selector.
  const primary = variants[0]!

  editorState.value = {
    open: true,
    imageId: img.id,
    sourceUrl: primary.url,
    title: `${img.themeTitle} — ${img.promptText.slice(0, 60)}`,
    variants,
  }
}

const migrationState = ref<{ running: boolean; lastResult: null | { succeeded: number; failed: number; remaining: number } }>(
  { running: false, lastResult: null },
)

const legacyCount = computed(() => images.value.filter((i) => i.hasLegacyOriginal).length)

async function migrateLegacyOriginals() {
  if (migrationState.value.running) return
  migrationState.value.running = true
  migrationState.value.lastResult = null
  try {
    const res = await $fetch<{ succeeded: number; failed: number; remaining: number }>(
      `/api/workflow/${props.projectId}/images/backfill-s3`,
      { method: 'POST' },
    )
    migrationState.value.lastResult = {
      succeeded: res.succeeded,
      failed: res.failed,
      remaining: res.remaining,
    }
    await loadImages()
  } catch (e) {
    console.error('Legacy migration failed', e)
    alert('Failed to migrate originals. See console.')
  } finally {
    migrationState.value.running = false
  }
}

async function selectVariation(img: ImageRecord, variationId: string | null) {
  const previous = img.selectedVariationId
  img.selectedVariationId = variationId
  try {
    await $fetch(`/api/workflow/${props.projectId}/images/${img.id}/select-variation`, {
      method: 'POST',
      body: { variationId },
    })
  } catch (e) {
    img.selectedVariationId = previous
    console.error('Failed to set selected variation', e)
    alert('Failed to set selection. Please try again.')
  }
}

interface ProviderModel {
  id: string
  label: string
  description: string
  cost: string
}

interface ProviderInfo {
  id: string
  label: string
  models: ProviderModel[]
}

interface VariationRecord {
  id: string
  name: string
  kind: string
  format: string
  mimeType: string
  width: number | null
  height: number | null
  fileSize: number | null
  url: string
}

interface ImageRecord {
  id: string
  imageUrl: string
  bgRemovedUrl: string | null
  bgRemovalStatus: string | null
  bgRemovalError: string | null
  upscaledUrl: string | null
  upscaleStatus: string | null
  upscaleError: string | null
  themeId: string
  themeTitle: string
  promptText: string
  selectedVariationId: string | null
  variations: VariationRecord[]
  hasLegacyOriginal: boolean
}

interface ThemeGroup {
  themeId: string
  themeTitle: string
  expanded: boolean
  images: ImageRecord[]
}

const props = defineProps<{
  projectId: string
  project: any
}>()

const emit = defineEmits<{
  (e: 'ready', value: boolean): void
}>()

const images = ref<ImageRecord[]>([])
const themeGroups = ref<ThemeGroup[]>([])
const availableBgProviders = ref<ProviderInfo[]>([])
const availableUpscaleProviders = ref<ProviderInfo[]>([])

const selectedBgProvider = ref('')
const selectedUpscaleProvider = ref('')

interface BatchProgress {
  running: boolean
  current: number
  total: number
  step: 'bg' | 'upscale' | null
  imageId: string | null
  succeeded: number
  failed: number
  finished: boolean
}
const batchProgress = reactive<BatchProgress>({
  running: false,
  current: 0,
  total: 0,
  step: null,
  imageId: null,
  succeeded: 0,
  failed: 0,
  finished: false,
})
const autoDoBg = ref(true)
const autoDoUpscale = ref(true)

const isProcessing = reactive<Record<string, { bg: boolean; upscale: boolean }>>({})
const progressState = reactive<Record<string, { bg: { percent: number; label: string }; upscale: { percent: number; label: string } }>>({})
const previewUrl = ref<string | null>(null)
const previewLabel = ref('')
const previewMeta = ref<{ width: number; height: number; fileSize: string } | null>(null)
const previewLoading = ref(false)

interface ProgressStage {
  label: string
  duration: number // estimated ms for this stage
}

function startProgressSimulation(
  imageId: string,
  type: 'bg' | 'upscale',
  stages: ProgressStage[],
): () => void {
  if (!progressState[imageId]) {
    progressState[imageId] = {
      bg: { percent: 0, label: '' },
      upscale: { percent: 0, label: '' },
    }
  }

  const totalDuration = stages.reduce((sum, s) => sum + s.duration, 0)
  const startTime = Date.now()
  let cancelled = false

  const tick = () => {
    if (cancelled) return
    const elapsed = Date.now() - startTime
    let accumulated = 0
    let currentLabel = stages[0]?.label ?? 'Processing...'

    for (const stage of stages) {
      if (elapsed > accumulated + stage.duration) {
        accumulated += stage.duration
        continue
      }
      currentLabel = stage.label
      break
    }

    // Ease-out curve: fast start, slows near end. Caps at 95% until completion.
    const rawProgress = Math.min(elapsed / totalDuration, 1)
    const eased = 1 - Math.pow(1 - rawProgress, 2)
    const percent = Math.min(Math.round(eased * 95), 95)

    progressState[imageId][type] = { percent, label: currentLabel }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)

  // Return a stop function that jumps to 100%
  return () => {
    cancelled = true
    if (progressState[imageId]) {
      progressState[imageId][type] = { percent: 100, label: 'Done' }
    }
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

async function openPreview(url: string, label: string) {
  previewUrl.value = url
  previewLabel.value = label
  previewMeta.value = null
  previewLoading.value = true

  try {
    const [dimensions, fileSize] = await Promise.all([
      new Promise<{ width: number; height: number }>((resolve) => {
        const img = new Image()
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
        img.onerror = () => resolve({ width: 0, height: 0 })
        img.src = url
      }),
      fetch(url, { method: 'HEAD' })
        .then((res) => {
          const len = res.headers.get('content-length')
          return len ? formatFileSize(Number(len)) : null
        })
        .catch(() => null),
    ])

    // If HEAD didn't return content-length, try GET with range to get full size
    let size = fileSize
    if (!size) {
      try {
        const res = await fetch(url)
        const blob = await res.blob()
        size = formatFileSize(blob.size)
      } catch { /* ignore */ }
    }

    previewMeta.value = {
      width: dimensions.width,
      height: dimensions.height,
      fileSize: size ?? 'Unknown',
    }
  } catch {
    // Silently fail — metadata is informational
  } finally {
    previewLoading.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    loadProviders(),
    loadImages()
  ])
})

async function loadProviders() {
  try {
    const [bgData, upscaleData] = await Promise.all([
      $fetch<{ providers: ProviderInfo[]; defaultProvider: string | null }>('/api/settings/image-providers?capability=background-removal'),
      $fetch<{ providers: ProviderInfo[]; defaultProvider: string | null }>('/api/settings/image-providers?capability=upscale')
    ])
    availableBgProviders.value = bgData.providers
    availableUpscaleProviders.value = upscaleData.providers
    selectedBgProvider.value = bgData.defaultProvider ?? bgData.providers[0]?.id ?? ''
    selectedUpscaleProvider.value = upscaleData.defaultProvider ?? upscaleData.providers[0]?.id ?? ''
  } catch (err) {
    console.error('Failed to load providers', err)
  }
}

async function loadImages() {
  try {
    const result = await $fetch(`/api/workflow/${props.projectId}/images/status`)
    const allImages = (result as any).images || []
    images.value = allImages.filter((img: any) => img.generationStatus === 'completed' && img.isSelected)
    emit('ready', true) // Pass through allowed
  } catch (err) {
    console.error('Failed to load images', err)
  }
}

function rebuildGroups() {
  const groups: Record<string, ThemeGroup> = {}
  for (const img of images.value) {
    const tid = img.themeId
    if (!groups[tid]) {
      // Find existing group to keep expanded state
      const existing = themeGroups.value.find(g => g.themeId === tid)
      groups[tid] = {
        themeId: tid,
        themeTitle: img.themeTitle ?? 'Unknown Theme',
        expanded: existing?.expanded ?? true,
        images: [],
      }
    }
    groups[tid].images.push(img)
    if (!isProcessing[img.id]) {
      isProcessing[img.id] = { bg: false, upscale: false }
    }
  }
  themeGroups.value = Object.values(groups)
}

watch(images, rebuildGroups, { deep: true, immediate: true })

function toggleAccordion(group: ThemeGroup) {
  group.expanded = !group.expanded
}

async function removeBackground(img: ImageRecord) {
  if (!selectedBgProvider.value) return alert('Select a background removal provider first')

  if (!isProcessing[img.id]) isProcessing[img.id] = { bg: false, upscale: false }
  isProcessing[img.id]!.bg = true
  img.bgRemovalError = null

  const stopProgress = startProgressSimulation(img.id, 'bg', [
    { label: 'Sending image...', duration: 2000 },
    { label: 'Removing background...', duration: 8000 },
    { label: 'Uploading result...', duration: 3000 },
  ])

  try {
    const res = await $fetch<{ image: ImageRecord }>(`/api/workflow/${props.projectId}/images/${img.id}/remove-bg`, {
      method: 'POST',
      body: { provider: selectedBgProvider.value }
    })
    stopProgress()
    const index = images.value.findIndex(i => i.id === img.id)
    if (index !== -1) {
      images.value[index] = { ...images.value[index], ...res.image }
    }
  } catch (err: any) {
    img.bgRemovalError = err.data?.message ?? 'Failed to remove background'
  } finally {
    stopProgress()
    if (isProcessing[img.id]) {
      isProcessing[img.id]!.bg = false
    }
  }
}

async function upscaleImage(img: ImageRecord) {
  if (!selectedUpscaleProvider.value) return alert('Select an upscale provider first')

  if (!isProcessing[img.id]) isProcessing[img.id] = { bg: false, upscale: false }
  isProcessing[img.id]!.upscale = true
  img.upscaleError = null

  const stopProgress = startProgressSimulation(img.id, 'upscale', [
    { label: 'Uploading image...', duration: 3000 },
    { label: 'Upscaling pass 1/2...', duration: 18000 },
    { label: 'Upscaling pass 2/2...', duration: 18000 },
    { label: 'Saving to storage...', duration: 5000 },
  ])

  try {
    const res = await $fetch<{ image: ImageRecord }>(`/api/workflow/${props.projectId}/images/${img.id}/upscale`, {
      method: 'POST',
      body: { provider: selectedUpscaleProvider.value }
    })
    stopProgress()
    const index = images.value.findIndex(i => i.id === img.id)
    if (index !== -1) {
      images.value[index] = { ...images.value[index], ...res.image }
    }
  } catch (err: any) {
    img.upscaleError = err.data?.message ?? 'Failed to upscale image'
  } finally {
    stopProgress()
    if (isProcessing[img.id]) {
      isProcessing[img.id]!.upscale = false
    }
  }
}

const pendingImageCount = computed(() =>
  images.value.filter(
    (i) => (autoDoBg.value && !i.bgRemovedUrl) || (autoDoUpscale.value && !i.upscaledUrl),
  ).length,
)

async function processAllImages(force = false) {
  if (batchProgress.running) return
  if (!autoDoBg.value && !autoDoUpscale.value) {
    return alert('Select at least one stage (background removal or upscaling).')
  }
  if (autoDoBg.value && !selectedBgProvider.value) return alert('Select a background removal provider first')
  if (autoDoUpscale.value && !selectedUpscaleProvider.value) return alert('Select an upscale provider first')

  const queue = images.value
    .map((img) => img.id)
    .filter((id) => {
      const img = images.value.find((i) => i.id === id)
      if (!img) return false
      if (force) return true
      return (autoDoBg.value && !img.bgRemovedUrl) || (autoDoUpscale.value && !img.upscaledUrl)
    })

  if (queue.length === 0) {
    alert('Nothing to process. Enable at least one stage or use "Re-process all".')
    return
  }

  batchProgress.running = true
  batchProgress.finished = false
  batchProgress.total = queue.length
  batchProgress.current = 0
  batchProgress.succeeded = 0
  batchProgress.failed = 0
  batchProgress.step = null
  batchProgress.imageId = null

  for (const imageId of queue) {
    batchProgress.current += 1
    batchProgress.imageId = imageId

    // Re-fetch the image from the reactive array on each iteration — prior
    // steps may have replaced the object (handlers do images.value[i] = {...}).
    let img = images.value.find((i) => i.id === imageId)
    if (!img) { batchProgress.failed += 1; continue }

    let failed = false
    if (autoDoBg.value && (force || !img.bgRemovedUrl)) {
      batchProgress.step = 'bg'
      await removeBackground(img)
      img = images.value.find((i) => i.id === imageId)
      if (!img || img.bgRemovalError || !img.bgRemovedUrl) failed = true
    }

    if (!failed && autoDoUpscale.value) {
      img = images.value.find((i) => i.id === imageId)
      if (img && (force || !img.upscaledUrl)) {
        batchProgress.step = 'upscale'
        await upscaleImage(img)
        img = images.value.find((i) => i.id === imageId)
        if (!img || img.upscaleError || !img.upscaledUrl) failed = true
      }
    }

    if (failed) batchProgress.failed += 1
    else batchProgress.succeeded += 1
  }

  batchProgress.step = null
  batchProgress.imageId = null
  batchProgress.running = false
  batchProgress.finished = true
}

</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between border-b pb-6">
      <!-- Background Removal Settings -->
      <div class="space-y-3">
        <h3 class="font-semibold text-sm">Background Removal Default</h3>
        <div class="flex items-center gap-3">
          <select v-model="selectedBgProvider" class="rounded-lg border bg-background px-3 py-2 text-sm">
            <option value="" disabled>Provider</option>
            <option v-for="p in availableBgProviders" :key="p.id" :value="p.id">{{ p.label }}</option>
          </select>
        </div>
      </div>

      <!-- Upscale Settings -->
      <div class="space-y-3">
        <h3 class="font-semibold text-sm">Upscaling Default</h3>
        <div class="flex items-center gap-3">
          <select v-model="selectedUpscaleProvider" class="rounded-lg border bg-background px-3 py-2 text-sm">
            <option value="" disabled>Provider</option>
            <option v-for="p in availableUpscaleProviders" :key="p.id" :value="p.id">{{ p.label }}</option>
          </select>
        </div>
      </div>

      <!-- Auto-process all -->
      <div class="space-y-3 md:ml-auto">
        <h3 class="font-semibold text-sm">Auto-process</h3>
        <div class="flex flex-col items-start gap-2">
          <div class="flex items-center gap-4 text-xs">
            <label class="flex items-center gap-1.5">
              <input v-model="autoDoBg" type="checkbox" :disabled="batchProgress.running" class="h-3.5 w-3.5 accent-primary" />
              Remove BG
            </label>
            <label class="flex items-center gap-1.5">
              <input v-model="autoDoUpscale" type="checkbox" :disabled="batchProgress.running" class="h-3.5 w-3.5 accent-primary" />
              Upscale
            </label>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition-all hover:bg-primary/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="batchProgress.running || pendingImageCount === 0 || (autoDoBg && !selectedBgProvider) || (autoDoUpscale && !selectedUpscaleProvider) || (!autoDoBg && !autoDoUpscale)"
              @click="processAllImages(false)"
            >
              <span v-if="batchProgress.running">
                Processing {{ batchProgress.current }} / {{ batchProgress.total }}
                {{ batchProgress.step === 'bg' ? '— Removing BG' : batchProgress.step === 'upscale' ? '— Upscaling' : '' }}…
              </span>
              <span v-else-if="pendingImageCount > 0">
                Auto-process {{ pendingImageCount }} image{{ pendingImageCount === 1 ? '' : 's' }}
              </span>
              <span v-else>All images processed</span>
            </button>
            <button
              v-if="!batchProgress.running && pendingImageCount === 0 && images.length > 0"
              type="button"
              class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-all hover:bg-slate-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="(autoDoBg && !selectedBgProvider) || (autoDoUpscale && !selectedUpscaleProvider) || (!autoDoBg && !autoDoUpscale)"
              @click="processAllImages(true)"
            >
              Re-process all {{ images.length }}
            </button>
          </div>
          <p
            v-if="batchProgress.finished && !batchProgress.running"
            class="text-xs"
            :class="batchProgress.failed > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'"
          >
            Done. {{ batchProgress.succeeded }} succeeded{{ batchProgress.failed > 0 ? `, ${batchProgress.failed} failed` : '' }}.
          </p>
          <p v-else-if="!batchProgress.running && pendingImageCount > 0" class="text-xs text-slate-500">
            Runs selected stages on each image sequentially.
          </p>
        </div>
      </div>
    </div>

    <!-- Legacy-original migration banner -->
    <div
      v-if="legacyCount > 0"
      class="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <div class="flex items-start justify-between gap-4">
        <div class="space-y-0.5">
          <p class="font-medium">
            {{ legacyCount }} original{{ legacyCount === 1 ? '' : 's' }} still on the provider CDN.
          </p>
          <p class="text-xs text-amber-900/80">
            Migrate to S3 to enable in-browser editing. Provider URLs expire after ~24h.
          </p>
          <p v-if="migrationState.lastResult" class="text-xs text-amber-900/80">
            Last run — succeeded: {{ migrationState.lastResult.succeeded }}, failed:
            {{ migrationState.lastResult.failed }}<span v-if="migrationState.lastResult.remaining">,
            remaining: {{ migrationState.lastResult.remaining }}</span>.
          </p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-md bg-amber-900 px-3 py-1.5 text-xs text-amber-50 transition-all hover:bg-amber-900/90 active:scale-95 disabled:opacity-60"
          :disabled="migrationState.running"
          @click="migrateLegacyOriginals"
        >
          {{ migrationState.running ? 'Migrating…' : 'Migrate now' }}
        </button>
      </div>
    </div>

    <!-- No images state -->
    <div v-if="images.length === 0" class="rounded-lg border bg-muted/50 p-6 text-center text-sm text-muted-foreground">
      No generated images selected in the previous stage.
    </div>

    <!-- Theme Groups -->
    <div v-else class="space-y-6">
      <div v-for="group in themeGroups" :key="group.themeId" class="space-y-3">
        <!-- Accordion Header -->
        <button
          class="flex w-full items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left rounded-lg border"
          @click="toggleAccordion(group)"
        >
          <div class="flex items-center gap-3">
            <svg class="h-4 w-4 shrink-0 transition-transform duration-200" :class="{ 'rotate-90': group.expanded }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            <h4 class="font-semibold text-sm">{{ group.themeTitle }}</h4>
          </div>
          <span class="text-xs text-muted-foreground">{{ group.images.length }} image(s)</span>
        </button>

        <!-- Accordion Body -->
        <div v-show="group.expanded" class="space-y-4 pt-2">
          <div v-for="img in group.images" :key="img.id" class="rounded-lg border bg-card p-4">
            <div class="mb-4 flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <p class="text-sm font-medium">Prompt</p>
                  <span
                    v-if="img.bgRemovedUrl && img.upscaledUrl"
                    class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800"
                    title="Background removed and upscaled"
                  >
                    <svg class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-8 8a1 1 0 01-1.408 0l-4-4a1 1 0 111.408-1.42L8 12.58l7.296-7.29a1 1 0 011.408 0z" clip-rule="evenodd" />
                    </svg>
                    Processed
                  </span>
                </div>
                <p class="text-xs text-muted-foreground mt-1">{{ img.promptText }}</p>
              </div>
              <button
                type="button"
                class="shrink-0 rounded-md border px-3 py-1.5 text-xs transition-all hover:bg-muted active:scale-95"
                @click="openEditor(img)"
              >
                ✎ Edit
              </button>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <!-- 1. Original Image -->
              <div class="space-y-3">
                <div class="text-sm font-medium flex items-center gap-2">
                  <span class="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">1</span>
                  Original Image
                </div>
                <div class="aspect-square rounded-lg border bg-muted overflow-hidden relative group cursor-pointer" @click="openPreview(img.imageUrl, img.themeTitle + ' — Original')">
                  <img :src="img.imageUrl" class="h-full w-full object-cover" />
                </div>
              </div>

              <!-- 2. Background Removal -->
              <div class="space-y-3">
                <div class="text-sm font-medium flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">2</span>
                    Remove Background
                    <span
                      v-if="img.bgRemovedUrl && !img.bgRemovalError"
                      class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white"
                      title="Background removed"
                    >
                      <svg class="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-8 8a1 1 0 01-1.408 0l-4-4a1 1 0 111.408-1.42L8 12.58l7.296-7.29a1 1 0 011.408 0z" clip-rule="evenodd" /></svg>
                    </span>
                    <span
                      v-else-if="img.bgRemovalError"
                      class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white"
                      :title="img.bgRemovalError"
                    >
                      <svg class="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                    </span>
                  </div>
                  <button
                    v-if="!isProcessing[img.id]?.bg"
                    @click="removeBackground(img)"
                    class="text-xs bg-secondary text-secondary-foreground hover:bg-secondary/80 px-2 py-1 rounded transition-all active:scale-95"
                  >
                    {{ img.bgRemovedUrl ? 'Re-run' : 'Run' }}
                  </button>
                </div>
                
                <div class="aspect-square rounded-lg border border-dashed bg-muted/30 flex flex-col items-center justify-center relative overflow-hidden">
                  <template v-if="img.bgRemovedUrl">
                    <img :src="img.bgRemovedUrl" class="h-full w-full object-contain p-2 cursor-pointer" :class="{ 'opacity-40': isProcessing[img.id]?.bg }" @click="!isProcessing[img.id]?.bg && openPreview(img.bgRemovedUrl!, img.themeTitle + ' — BG Removed')" />
                  </template>
                  <template v-if="isProcessing[img.id]?.bg">
                    <div class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/40">
                      <svg class="h-6 w-6 animate-spin text-primary" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      <div class="w-3/4 space-y-1.5">
                        <div class="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div class="h-full rounded-full bg-primary transition-all duration-300 ease-out" :style="{ width: (progressState[img.id]?.bg?.percent ?? 0) + '%' }" />
                        </div>
                        <div class="flex justify-between text-[10px] text-muted-foreground">
                          <span>{{ progressState[img.id]?.bg?.label ?? 'Processing...' }}</span>
                          <span>{{ progressState[img.id]?.bg?.percent ?? 0 }}%</span>
                        </div>
                      </div>
                    </div>
                  </template>
                  <template v-if="!img.bgRemovedUrl && !isProcessing[img.id]?.bg">
                    <span class="text-xs text-muted-foreground">Optional Step</span>
                  </template>
                </div>
                <p v-if="img.bgRemovalError" class="text-xs text-destructive">{{ img.bgRemovalError }}</p>
              </div>

              <!-- 3. Upscale -->
              <div class="space-y-3">
                <div class="text-sm font-medium flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">3</span>
                    Upscale
                    <span
                      v-if="img.upscaledUrl && !img.upscaleError"
                      class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white"
                      title="Upscaled"
                    >
                      <svg class="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-8 8a1 1 0 01-1.408 0l-4-4a1 1 0 111.408-1.42L8 12.58l7.296-7.29a1 1 0 011.408 0z" clip-rule="evenodd" /></svg>
                    </span>
                    <span
                      v-else-if="img.upscaleError"
                      class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white"
                      :title="img.upscaleError"
                    >
                      <svg class="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                    </span>
                  </div>
                  <button
                    v-if="!isProcessing[img.id]?.upscale"
                    @click="upscaleImage(img)"
                    class="text-xs bg-secondary text-secondary-foreground hover:bg-secondary/80 px-2 py-1 rounded transition-all active:scale-95"
                  >
                    {{ img.upscaledUrl ? 'Re-run' : 'Run' }}
                  </button>
                </div>
                
                <div class="aspect-square rounded-lg border border-dashed bg-muted/30 flex flex-col items-center justify-center relative overflow-hidden">
                  <template v-if="img.upscaledUrl">
                    <img :src="img.upscaledUrl" class="h-full w-full object-cover cursor-pointer" :class="{ 'opacity-40': isProcessing[img.id]?.upscale }" @click="!isProcessing[img.id]?.upscale && openPreview(img.upscaledUrl!, img.themeTitle + ' — Upscaled')" />
                  </template>
                  <template v-if="isProcessing[img.id]?.upscale">
                    <div class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/40">
                      <svg class="h-6 w-6 animate-spin text-primary" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      <div class="w-3/4 space-y-1.5">
                        <div class="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div class="h-full rounded-full bg-primary transition-all duration-300 ease-out" :style="{ width: (progressState[img.id]?.upscale?.percent ?? 0) + '%' }" />
                        </div>
                        <div class="flex justify-between text-[10px] text-muted-foreground">
                          <span>{{ progressState[img.id]?.upscale?.label ?? 'Processing...' }}</span>
                          <span>{{ progressState[img.id]?.upscale?.percent ?? 0 }}%</span>
                        </div>
                      </div>
                    </div>
                  </template>
                  <template v-if="!img.upscaledUrl && !isProcessing[img.id]?.upscale">
                    <span class="text-xs text-muted-foreground">Optional Step</span>
                  </template>
                </div>
                <p v-if="img.upscaleError" class="text-xs text-destructive">{{ img.upscaleError }}</p>
              </div>
            </div>

            <!-- Variation strip: original + saved variations; click to select for Stage 6 -->
            <div class="mt-4 space-y-2">
              <div class="flex items-center justify-between">
                <div class="text-xs font-medium text-muted-foreground">Use for product</div>
                <div v-if="img.selectedVariationId" class="text-[10px] text-muted-foreground">
                  Selected: custom variation
                </div>
                <div v-else class="text-[10px] text-muted-foreground">Selected: default (upscaled → bg-removed → original)</div>
              </div>
              <div class="flex gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  class="group relative flex shrink-0 flex-col items-center gap-1 rounded-md border p-1.5 transition-all hover:bg-muted"
                  :class="img.selectedVariationId === null ? 'ring-2 ring-primary' : ''"
                  @click="selectVariation(img, null)"
                >
                  <img :src="img.imageUrl" class="h-14 w-14 rounded border object-cover" />
                  <span class="text-[10px] text-muted-foreground">Default</span>
                </button>
                <button
                  v-for="v in img.variations"
                  :key="v.id"
                  type="button"
                  class="group relative flex shrink-0 flex-col items-center gap-1 rounded-md border p-1.5 transition-all hover:bg-muted"
                  :class="img.selectedVariationId === v.id ? 'ring-2 ring-primary' : ''"
                  @click="selectVariation(img, v.id)"
                >
                  <img :src="v.url" class="h-14 w-14 rounded border bg-white object-contain" />
                  <span class="max-w-[56px] truncate text-[10px] text-muted-foreground">{{ v.name }}</span>
                  <span class="text-[9px] uppercase text-muted-foreground/70">{{ v.format }} · {{ v.kind }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Image Preview Modal -->
    <Teleport to="body">
      <div v-if="previewUrl" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80" @click="previewUrl = null; previewMeta = null">
        <div class="relative max-h-[90vh] max-w-[90vw]" @click.stop>
          <button class="absolute -right-3 -top-3 z-10 rounded-full bg-background p-1.5 shadow-lg" @click="previewUrl = null; previewMeta = null">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img :src="previewUrl" :alt="previewLabel" class="max-h-[85vh] rounded-lg" />
          <div class="mt-2 text-center text-sm text-white">
            <div>{{ previewLabel }}</div>
            <div v-if="previewLoading" class="text-xs text-white/60 mt-1">Loading metadata...</div>
            <div v-else-if="previewMeta" class="text-xs text-white/60 mt-1">
              <span v-if="previewMeta.width">{{ previewMeta.width }} x {{ previewMeta.height }}px</span>
              <span v-if="previewMeta.width && previewMeta.fileSize"> &middot; </span>
              <span v-if="previewMeta.fileSize">{{ previewMeta.fileSize }}</span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <ImageEditor
      v-if="editorState.open"
      :open="editorState.open"
      :project-id="projectId"
      :image-id="editorState.imageId"
      :source-url="editorState.sourceUrl"
      :title="editorState.title"
      :variants="editorState.variants"
      @update:open="editorState.open = $event"
      @saved="loadImages()"
    />
  </div>
</template>
