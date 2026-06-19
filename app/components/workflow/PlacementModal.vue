<script setup lang="ts">
import type { ProductCategory } from '~~/shared/niche-categories'

interface SelectedImage {
  id: string
  imageUrl: string
  promptBgHex?: string
  promptBgName?: string
}

interface CatalogProduct {
  id: string
  provider: string
  category: ProductCategory
  displayName: string
  blueprint: {
    id: string
    blueprintId: string
    title: string
    brandName: string | null
    imageUrl: string | null
    previewImageUrl: string | null
    allImages: string[] | null
    basePrice: number | null
  }
}

interface Variant {
  id: string
  title: string
  colorHex: string
  colorName: string
  isApproximate?: boolean
}

export interface ModalPlacement {
  imageId: string
  blueprintId: string
  category: ProductCategory
  selectedVariantIds: string[]
  defaultVariantId: string | null
}

const props = defineProps<{
  projectId: string
  products: CatalogProduct[]
  images: SelectedImage[]
}>()

const emit = defineEmits<{
  (e: 'done', placements: ModalPlacement[]): void
  (e: 'cancel'): void
}>()

// ─── Wizard state ──────────────────────────────────────────────────────────────

const currentIndex = ref(0)

interface ProductConfig {
  imageId: string
  selectedVariantIds: string[]
  defaultVariantId: string | null
  skipped: boolean
}

const configs = ref<Map<string, ProductConfig>>(new Map())

// Variant cache: blueprintId → variants
const variantCache = ref<Map<string, Variant[]>>(new Map())
const loadingVariants = ref<Set<string>>(new Set())
const variantError = ref<string | null>(null)

const currentProduct = computed(() => props.products[currentIndex.value])
const isFirst = computed(() => currentIndex.value === 0)
const isLast = computed(() => currentIndex.value === props.products.length - 1)

const currentVariants = computed(() =>
  currentProduct.value ? (variantCache.value.get(currentProduct.value.blueprint.blueprintId) ?? []) : [],
)

const isLoadingVariants = computed(() =>
  !!currentProduct.value && loadingVariants.value.has(currentProduct.value.blueprint.blueprintId),
)

function ensureConfig(productId: string): ProductConfig {
  if (!configs.value.has(productId)) {
    configs.value.set(productId, {
      imageId: props.images[0]?.id ?? '',
      selectedVariantIds: [],
      defaultVariantId: null,
      skipped: false,
    })
  }
  return configs.value.get(productId)!
}

const currentConfig = computed(() => {
  const id = currentProduct.value?.id
  if (!id) return { imageId: '', selectedVariantIds: [], defaultVariantId: null, skipped: false }
  return ensureConfig(id)
})

const currentImage = computed(() =>
  props.images.find(i => i.id === currentConfig.value.imageId) ?? props.images[0],
)

// ─── Preview image cycling ─────────────────────────────────────────────────────

// Per-product index into blueprint.allImages for the preview panel
const previewImageIndices = ref<Map<string, number>>(new Map())

function getPreviewIndex(productId: string): number {
  if (previewImageIndices.value.has(productId)) {
    return previewImageIndices.value.get(productId)!
  }
  // Not yet set — find the saved previewImageUrl in allImages so we start on the right image
  const product = props.products.find(p => p.id === productId)
  if (product?.blueprint.previewImageUrl && product.blueprint.allImages) {
    const savedIdx = product.blueprint.allImages.indexOf(product.blueprint.previewImageUrl)
    if (savedIdx >= 0) return savedIdx
  }
  return 0
}

const currentPreviewImage = computed(() => {
  const product = currentProduct.value
  if (!product) return null
  const images = product.blueprint.allImages
  if (!images || images.length === 0) return product.blueprint.previewImageUrl
  const idx = getPreviewIndex(product.id)
  return images[idx] ?? product.blueprint.previewImageUrl
})

const previewImageCount = computed(() => currentProduct.value?.blueprint.allImages?.length ?? 0)

function cyclePreviewImage(dir: 1 | -1) {
  const product = currentProduct.value
  if (!product) return
  const count = product.blueprint.allImages?.length ?? 0
  if (count < 2) return
  const cur = getPreviewIndex(product.id)
  const next = ((cur + dir) + count) % count
  previewImageIndices.value.set(product.id, next)
  // Persist the chosen index so catalog items remember the good image
  void $fetch(`/api/settings/catalog/preview-image`, {
    method: 'PUT',
    body: { blueprintId: product.blueprint.blueprintId, imageIndex: next },
  }).catch(() => {})
}

// ─── Variant loading ────────────────────────────────────────────────────────────

async function loadVariants(product: CatalogProduct) {
  const bpId = product.blueprint.blueprintId
  if (variantCache.value.has(bpId) || loadingVariants.value.has(bpId)) return
  loadingVariants.value.add(bpId)
  variantError.value = null
  try {
    const data = await $fetch<{ variants: Variant[] }>(
      `/api/workflow/${props.projectId}/products/blueprints/${bpId}/variants`,
    )
    variantCache.value.set(bpId, data.variants)
  } catch {
    variantError.value = 'Failed to load colors for this product.'
  } finally {
    loadingVariants.value.delete(bpId)
  }
}

watch(currentIndex, () => {
  if (currentProduct.value) loadVariants(currentProduct.value)
}, { immediate: true })

// ─── Image selection ────────────────────────────────────────────────────────────

function selectImage(imageId: string) {
  ensureConfig(currentProduct.value!.id).imageId = imageId
}

// ─── Color selection ────────────────────────────────────────────────────────────

function toggleColor(variantId: string) {
  const cfg = ensureConfig(currentProduct.value!.id)
  const isSelected = cfg.selectedVariantIds.includes(variantId)
  if (!isSelected) {
    cfg.selectedVariantIds = [...cfg.selectedVariantIds, variantId]
    cfg.defaultVariantId = variantId
    return
  }
  if (cfg.defaultVariantId !== variantId) {
    cfg.defaultVariantId = variantId
    return
  }
  const next = cfg.selectedVariantIds.filter(id => id !== variantId)
  cfg.selectedVariantIds = next
  cfg.defaultVariantId = next[next.length - 1] ?? null
}

function getDefaultVariant(): Variant | undefined {
  const { defaultVariantId } = currentConfig.value
  if (!defaultVariantId) return undefined
  return currentVariants.value.find(v => v.id === defaultVariantId)
}

// ─── Navigation ─────────────────────────────────────────────────────────────────

function skip() {
  ensureConfig(currentProduct.value!.id).skipped = true
  advance()
}

function saveAndNext() {
  advance()
}

function advance() {
  if (isLast.value) finish()
  else currentIndex.value++
}

function back() {
  if (!isFirst.value) currentIndex.value--
}

function finish() {
  const placements: ModalPlacement[] = []
  for (const product of props.products) {
    const cfg = configs.value.get(product.id)
    if (cfg?.skipped) continue
    if (!cfg?.imageId) continue
    placements.push({
      imageId: cfg.imageId,
      blueprintId: product.blueprint.blueprintId,
      category: product.category,
      selectedVariantIds: cfg.selectedVariantIds,
      defaultVariantId: cfg.defaultVariantId,
    })
  }
  emit('done', placements)
}

function formatPrice(cents: number | null): string {
  if (cents == null) return ''
  return `$${(cents / 100).toFixed(2)}`
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('cancel')
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('cancel')" />

      <!-- Modal panel — wider to fit preview -->
      <div class="relative z-10 w-full max-w-5xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[92vh]">

        <!-- Header -->
        <div class="px-6 py-4 border-b border-black/5 bg-[#fffaf2]/80 flex items-center justify-between gap-4 flex-shrink-0">
          <div>
            <p class="text-xs text-muted-foreground">Product {{ currentIndex + 1 }} of {{ products.length }}</p>
            <h2 class="font-semibold text-lg leading-tight mt-0.5">
              {{ currentProduct?.blueprint.brandName ?? currentProduct?.displayName }}
            </h2>
            <p class="text-sm text-muted-foreground">
              {{ currentProduct?.blueprint.title }}
              <span v-if="currentProduct?.blueprint.basePrice" class="ml-2 text-slate-400">
                · {{ formatPrice(currentProduct.blueprint.basePrice) }} base
              </span>
            </p>
          </div>
          <button
            type="button"
            class="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors flex-shrink-0"
            @click="$emit('cancel')"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body: two columns -->
        <div class="flex-1 overflow-hidden flex min-h-0">

          <!-- Left column: controls -->
          <div class="w-[55%] flex-shrink-0 overflow-y-auto p-6 space-y-5 border-r border-black/5">

            <!-- Image selector -->
            <div class="space-y-2">
              <h3 class="text-sm font-semibold">Select Image</h3>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="img in images"
                  :key="img.id"
                  type="button"
                  class="relative h-16 w-16 rounded-lg overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 flex-shrink-0"
                  :class="currentConfig.imageId === img.id
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-transparent hover:border-primary/40'"
                  @click="selectImage(img.id)"
                >
                  <img :src="img.imageUrl" class="h-full w-full object-cover" />
                  <div
                    v-if="currentConfig.imageId === img.id"
                    class="absolute inset-0 bg-primary/10 flex items-center justify-center"
                  >
                    <svg class="h-5 w-5 text-primary drop-shadow" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                  </div>
                </button>
              </div>
            </div>

            <!-- Color picker -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold">
                  Select Colors
                  <span class="text-xs font-normal text-muted-foreground ml-1">
                    ({{ currentConfig.selectedVariantIds.length }} selected · first click = default)
                  </span>
                </h3>
                <button
                  v-if="currentConfig.selectedVariantIds.length > 0"
                  type="button"
                  class="text-xs text-muted-foreground hover:text-foreground"
                  @click="() => { const c = ensureConfig(currentProduct!.id); c.selectedVariantIds = []; c.defaultVariantId = null }"
                >
                  Clear all
                </button>
              </div>

              <div v-if="isLoadingVariants" class="flex flex-wrap gap-2">
                <div v-for="n in 24" :key="n" class="h-7 w-7 rounded-full bg-muted animate-pulse" />
              </div>

              <div v-else-if="variantError" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {{ variantError }}
              </div>

              <div v-else-if="currentVariants.length === 0" class="text-sm text-muted-foreground italic">
                No color variants available.
              </div>

              <div v-else class="flex flex-wrap gap-1.5">
                <button
                  v-for="v in currentVariants"
                  :key="v.id"
                  type="button"
                  class="relative h-7 w-7 rounded-full border border-black/10 shadow-sm transition-all hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                  :class="{
                    'ring-2 ring-primary ring-offset-1': currentConfig.selectedVariantIds.includes(v.id),
                    'ring-[3px] ring-primary ring-offset-2': currentConfig.defaultVariantId === v.id,
                  }"
                  :style="{ backgroundColor: v.colorHex }"
                  :title="`${v.colorName}${v.isApproximate ? ' (~approximate)' : ''}${currentConfig.defaultVariantId === v.id ? ' — default' : ''}`"
                  @click="toggleColor(v.id)"
                >
                  <svg
                    v-if="currentConfig.defaultVariantId === v.id"
                    class="absolute inset-0 m-auto h-3.5 w-3.5"
                    :class="/^#[fFeEdDcCbB]/.test(v.colorHex) ? 'text-black' : 'text-white'"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                  <span
                    v-else-if="v.isApproximate && !currentConfig.selectedVariantIds.includes(v.id)"
                    class="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-400 text-[8px] leading-[12px] text-center text-white font-bold"
                  >~</span>
                </button>
              </div>

              <div v-if="getDefaultVariant()" class="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span class="h-3 w-3 rounded-full border border-black/10 flex-shrink-0" :style="{ backgroundColor: getDefaultVariant()!.colorHex }" />
                Default: {{ getDefaultVariant()!.colorName }}
              </div>
            </div>
          </div>

          <!-- Right column: preview -->
          <div class="flex-1 flex flex-col items-center justify-center p-4 bg-slate-50/50">
            <p class="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-3">Preview <span class="normal-case font-normal">(approximate)</span></p>

            <!-- Cap aspect ratio warning -->
            <div v-if="currentProduct?.category === 'cap'" class="w-full mb-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
              Caps have a wide, rectangular print area. Square logos may appear smaller — consider using a wider design for best results.
            </div>

            <!-- Product + design overlay — fills the column -->
            <div class="relative w-full flex-1 min-h-0">
              <img
                v-if="currentPreviewImage"
                :src="currentPreviewImage"
                class="w-full h-full object-contain"
                alt="Product"
              />
              <div
                v-else
                class="w-full h-full rounded-2xl"
                :style="{ backgroundColor: '#f3f4f6', outline: '2px dashed #d1d5db' }"
              />

              <!-- Design on front print area: centered horizontally, ~38% from top -->
              <img
                v-if="currentImage"
                :src="currentImage.imageUrl"
                class="absolute left-1/2 -translate-x-1/2 w-[32%] object-contain pointer-events-none drop-shadow-md"
                style="top: 38%; max-height: 30%;"
                alt="Your design"
              />

              <!-- Default color label — bottom of image -->
              <div v-if="getDefaultVariant()" class="absolute bottom-2 left-0 right-0 flex justify-center">
                <span class="inline-flex items-center gap-1.5 text-[11px] bg-black/70 text-white px-2.5 py-1 rounded-full">
                  <span class="h-2.5 w-2.5 rounded-full border border-white/30 flex-shrink-0" :style="{ backgroundColor: getDefaultVariant()!.colorHex }" />
                  {{ getDefaultVariant()!.colorName }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-black/5 bg-white flex items-center justify-between gap-3 flex-shrink-0">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-4 py-2 text-sm text-slate-600 transition-all hover:bg-muted disabled:opacity-40 active:scale-95"
            :disabled="isFirst"
            @click="back"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <button
            type="button"
            class="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted"
            @click="skip"
          >
            Skip this product
          </button>

          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
            @click="saveAndNext"
          >
            {{ isLast ? 'Create Products' : 'Save & Next' }}
            <svg v-if="!isLast" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
