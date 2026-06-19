<script setup lang="ts">
import { getRecommendedCategories, type ProductCategory } from '~~/shared/niche-categories'
import PlacementModal from '~/components/workflow/PlacementModal.vue'

const props = defineProps<{
  projectId: string
  project: any
}>()

const emit = defineEmits<{
  (e: 'ready', value: boolean): void
}>()

// ─── Types ───────────────────────────────────────────────────────────────────

interface CatalogItem {
  id: string
  provider: string
  category: ProductCategory
  displayName: string
  enabled: boolean
  blueprint: {
    id: string
    blueprintId: string
    title: string
    brandName: string | null
    imageUrl: string | null
    previewImageUrl: string | null
    allImages: string[] | null
    basePrice: number | null
    isBestseller: boolean
  }
}

interface SelectedImage {
  id: string
  imageUrl: string
  promptBgHex?: string
  promptBgName?: string
}

// ─── State ───────────────────────────────────────────────────────────────────

const CATEGORIES: { id: ProductCategory; label: string }[] = [
  { id: 'tshirt',  label: 'T-Shirts' },
  { id: 'hoodie',  label: 'Hoodies' },
  { id: 'tanktop', label: 'Tank Tops' },
  { id: 'cap',     label: 'Caps' },
  { id: 'tote',    label: 'Totes' },
  { id: 'cup',     label: 'Cups' },
]

const selectedImages = ref<SelectedImage[]>([])
const catalogItems = ref<CatalogItem[]>([])
const isLoadingCatalog = ref(false)
const activeCategory = ref<ProductCategory>('tshirt')

// Multi-select: set of catalog item IDs the user has checked
const selectedProductIds = ref<Set<string>>(new Set())

// Modal open flag
const showModal = ref(false)

// Products created in this session
const products = ref<any[]>([])

const recommendedCategories = computed(() =>
  getRecommendedCategories(props.project?.niche),
)

const catalogByCategory = computed(() => {
  const items = catalogItems.value.filter(i => i.category === activeCategory.value && i.enabled)
  return [
    ...items.filter(i => i.blueprint.isBestseller),
    ...items.filter(i => !i.blueprint.isBestseller),
  ]
})

const selectedProductList = computed(() =>
  catalogItems.value.filter(i => selectedProductIds.value.has(i.id)),
)

function toggleProduct(id: string) {
  const next = new Set(selectedProductIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedProductIds.value = next
}

function isRecommended(category: ProductCategory) {
  return recommendedCategories.value.includes(category)
}

function formatPrice(cents: number | null): string {
  if (cents == null) return ''
  return `$${(cents / 100).toFixed(2)}`
}

// ─── Load data ───────────────────────────────────────────────────────────────

onMounted(async () => {
  await Promise.all([loadImages(), loadCatalog()])

  try {
    const existing = await $fetch<{ products: any[] }>(`/api/workflow/${props.projectId}/products/list`)
    products.value = existing.products ?? []
    if (products.value.some(p => ['created', 'draft', 'published'].includes(p.status))) {
      emit('ready', true)
    }
  } catch {}
})

async function loadImages() {
  try {
    const result = await $fetch(`/api/workflow/${props.projectId}/images/status`)
    const images = (result as any).images
    selectedImages.value = images
      .filter((img: any) => img.isSelected && img.generationStatus === 'completed')
      .map((img: any) => {
        const selected = img.selectedVariationId
          ? (img.variations ?? []).find((v: any) => v.id === img.selectedVariationId)
          : null
        return {
          id: img.id,
          imageUrl: selected?.url ?? img.upscaledUrl ?? img.bgRemovedUrl ?? img.imageUrl,
          promptBgHex: img.promptBgHex,
          promptBgName: img.promptBgName,
        }
      })
  } catch {}
}

async function loadCatalog() {
  isLoadingCatalog.value = true
  try {
    const data = await $fetch<{ items: CatalogItem[] }>('/api/settings/catalog')
    catalogItems.value = data.items
  } catch {} finally {
    isLoadingCatalog.value = false
  }
}

// ─── Modal ───────────────────────────────────────────────────────────────────

import type { ModalPlacement } from '~/components/workflow/PlacementModal.vue'

function openModal() {
  if (selectedProductIds.value.size === 0) return
  showModal.value = true
}

function onModalDone(placements: ModalPlacement[]) {
  showModal.value = false
  if (placements.length > 0) {
    // Show review queue instead of immediately creating
    pendingPlacements.value = placements
  }
}

function onModalCancel() {
  showModal.value = false
}

// ─── Review queue + sequential creation ──────────────────────────────────────

interface QueuedPlacement extends ModalPlacement {
  _key: string              // unique key for list rendering
  status: 'pending' | 'creating' | 'done' | 'failed'
  errorMessage?: string
  productTitle?: string
  productSku?: string
}

const pendingPlacements = ref<ModalPlacement[]>([])
const queue = ref<QueuedPlacement[]>([])
const isCreating = ref(false)

// Derived: true once we have a queue (review mode)
const hasQueue = computed(() => queue.value.length > 0)
const pendingCount = computed(() => queue.value.filter(q => q.status === 'pending').length)
const doneCount = computed(() => queue.value.filter(q => q.status === 'done').length)
const failedCount = computed(() => queue.value.filter(q => q.status === 'failed').length)

// Map each queued placement to a label for display
function placementLabel(p: ModalPlacement): string {
  const img = selectedImages.value.find(i => i.id === p.imageId)
  const cat = CATEGORIES.find(c => c.id === p.category)
  const bp = catalogItems.value.find(i => i.blueprint.blueprintId === p.blueprintId)
  const imgLabel = img ? `Image ${selectedImages.value.indexOf(img) + 1}` : 'Image'
  const productLabel = bp?.blueprint.brandName ?? bp?.displayName ?? p.blueprintId
  const catLabel = cat?.label ?? p.category
  return `${imgLabel} → ${productLabel} (${catLabel})`
}

function buildQueue(placements: ModalPlacement[]) {
  queue.value = placements.map((p, i) => ({
    ...p,
    _key: `${i}-${p.imageId}-${p.blueprintId}`,
    status: 'pending',
  }))
  pendingPlacements.value = []
}

function cancelQueue() {
  queue.value = []
  pendingPlacements.value = []
}

async function createAllSequentially() {
  if (isCreating.value) return
  isCreating.value = true

  for (const item of queue.value) {
    if (item.status !== 'pending') continue
    item.status = 'creating'

    try {
      const result = await $fetch<{ products: any[] }>(`/api/workflow/${props.projectId}/products/create`, {
        method: 'POST',
        body: {
          placements: [{
            imageId: item.imageId,
            blueprintId: item.blueprintId,
            category: item.category,
            variantIds: item.selectedVariantIds.length > 0 ? item.selectedVariantIds : undefined,
            defaultVariantId: item.defaultVariantId ?? undefined,
          }],
        },
      })
      const created = (result as any).products?.[0]
      item.status = created?.status === 'failed' ? 'failed' : 'done'
      item.errorMessage = created?.errorMessage
      item.productTitle = created?.title
      item.productSku = created?.sku
      // Accumulate
      if (created) products.value = [...products.value, created]
    } catch (err: any) {
      item.status = 'failed'
      item.errorMessage = err.data?.statusMessage ?? err.message ?? 'Unknown error'
    }
  }

  isCreating.value = false

  const anyDone = queue.value.some(q => q.status === 'done')
  if (anyDone) emit('ready', true)
}

async function retryFailed() {
  // Reset failed items back to pending so createAllSequentially picks them up
  for (const item of queue.value) {
    if (item.status === 'failed') item.status = 'pending'
  }
  await createAllSequentially()
}

function skipStage() {
  emit('ready', true)
}
</script>

<template>
  <div class="space-y-6">

    <!-- ── Review queue (after modal, before creation) ───────────────────── -->
    <div v-if="pendingPlacements.length > 0 && !hasQueue" class="space-y-4">
      <div class="flex items-center justify-between gap-3">
        <h3 class="font-semibold">Review Before Creating</h3>
        <span class="text-sm text-muted-foreground">{{ pendingPlacements.length }} product{{ pendingPlacements.length === 1 ? '' : 's' }}</span>
      </div>

      <div class="space-y-2">
        <div
          v-for="(p, i) in pendingPlacements"
          :key="i"
          class="flex items-center gap-3 rounded-lg border border-black/8 bg-white p-3"
        >
          <!-- Composite preview: product photo + design overlaid -->
          <div class="relative h-16 w-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            <img
              v-if="catalogItems.find(item => item.blueprint.blueprintId === p.blueprintId)?.blueprint.previewImageUrl ?? catalogItems.find(item => item.blueprint.blueprintId === p.blueprintId)?.blueprint.imageUrl"
              :src="(catalogItems.find(item => item.blueprint.blueprintId === p.blueprintId)!.blueprint.previewImageUrl ?? catalogItems.find(item => item.blueprint.blueprintId === p.blueprintId)!.blueprint.imageUrl)!"
              class="h-full w-full object-cover"
            />
            <img
              v-if="selectedImages.find(img => img.id === p.imageId)"
              :src="selectedImages.find(img => img.id === p.imageId)!.imageUrl"
              class="absolute top-[30%] left-1/2 -translate-x-1/2 w-[45%] object-contain pointer-events-none drop-shadow-sm"
            />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ placementLabel(p) }}</p>
            <p class="text-xs text-muted-foreground">
              {{ p.selectedVariantIds.length > 0 ? `${p.selectedVariantIds.length} color${p.selectedVariantIds.length === 1 ? '' : 's'}` : 'All colors' }}
              · {{ CATEGORIES.find(c => c.id === p.category)?.label }}
            </p>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3 pt-1">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
          @click="buildQueue(pendingPlacements)"
        >
          Create {{ pendingPlacements.length }} Product{{ pendingPlacements.length === 1 ? '' : 's' }}
        </button>
        <button
          type="button"
          class="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted"
          @click="cancelQueue"
        >
          Go back
        </button>
      </div>
    </div>

    <!-- ── Creation queue progress ────────────────────────────────────────── -->
    <div v-else-if="hasQueue" class="space-y-4">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <h3 class="font-semibold">Creating Products</h3>
        <div class="flex items-center gap-3 text-sm">
          <span v-if="doneCount > 0" class="text-emerald-600 font-medium">{{ doneCount }} done</span>
          <span v-if="failedCount > 0" class="text-red-600 font-medium">{{ failedCount }} failed</span>
          <span v-if="pendingCount > 0" class="text-muted-foreground">{{ pendingCount }} remaining</span>
        </div>
      </div>

      <div class="space-y-2">
        <div
          v-for="item in queue"
          :key="item._key"
          class="flex items-center gap-3 rounded-lg border p-3 transition-colors"
          :class="{
            'border-black/8 bg-white': item.status === 'pending',
            'border-blue-200 bg-blue-50': item.status === 'creating',
            'border-emerald-200 bg-emerald-50': item.status === 'done',
            'border-red-200 bg-red-50': item.status === 'failed',
          }"
        >
          <!-- Status icon -->
          <div class="flex-shrink-0 w-6 flex items-center justify-center">
            <svg v-if="item.status === 'creating'" class="h-4 w-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <svg v-else-if="item.status === 'done'" class="h-4 w-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
            <svg v-else-if="item.status === 'failed'" class="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
            <span v-else class="h-2 w-2 rounded-full bg-slate-300" />
          </div>

          <!-- Composite preview: product photo + design overlaid -->
          <div class="relative h-12 w-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            <img
              v-if="catalogItems.find(c => c.blueprint.blueprintId === item.blueprintId)?.blueprint.previewImageUrl ?? catalogItems.find(c => c.blueprint.blueprintId === item.blueprintId)?.blueprint.imageUrl"
              :src="(catalogItems.find(c => c.blueprint.blueprintId === item.blueprintId)!.blueprint.previewImageUrl ?? catalogItems.find(c => c.blueprint.blueprintId === item.blueprintId)!.blueprint.imageUrl)!"
              class="h-full w-full object-cover"
            />
            <img
              v-if="selectedImages.find(img => img.id === item.imageId)"
              :src="selectedImages.find(img => img.id === item.imageId)!.imageUrl"
              class="absolute top-[30%] left-1/2 -translate-x-1/2 w-[45%] object-contain pointer-events-none drop-shadow-sm"
            />
          </div>

          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">
              {{ item.productTitle ?? placementLabel(item) }}
            </p>
            <div class="flex items-center gap-2 mt-0.5">
              <span v-if="item.productSku" class="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{{ item.productSku }}</span>
              <span v-if="item.errorMessage" class="text-xs text-red-600">{{ item.errorMessage }}</span>
              <span v-else-if="item.status === 'creating'" class="text-xs text-blue-600">Sending to Printify…</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Queue actions -->
      <div class="flex items-center gap-3 flex-wrap pt-1">
        <button
          v-if="!isCreating && pendingCount > 0"
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
          @click="createAllSequentially"
        >
          Start Creating
        </button>
        <button
          v-if="!isCreating && failedCount > 0 && pendingCount === 0"
          type="button"
          class="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-all hover:bg-red-100 active:scale-95"
          @click="retryFailed"
        >
          Retry {{ failedCount }} failed
        </button>
        <span v-if="isCreating" class="text-sm text-muted-foreground">Creating one at a time…</span>
        <button
          v-if="doneCount > 0"
          type="button"
          class="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm text-muted-foreground transition-all hover:bg-muted active:scale-95 ml-auto"
          @click="skipStage"
        >
          Continue to Manual Review →
        </button>
      </div>
    </div>

    <!-- ── Normal selection view ──────────────────────────────────────────── -->
    <template v-else>
      <!-- Images strip -->
      <div v-if="selectedImages.length > 0" class="flex flex-wrap gap-2">
        <div
          v-for="img in selectedImages"
          :key="img.id"
          class="h-16 w-16 rounded-lg overflow-hidden border bg-muted flex-shrink-0"
        >
          <img :src="img.imageUrl" class="h-full w-full object-cover" />
        </div>
        <div class="flex items-center text-sm text-muted-foreground ml-1">
          {{ selectedImages.length }} image{{ selectedImages.length === 1 ? '' : 's' }} selected
        </div>
      </div>
      <div v-else class="rounded-lg border bg-muted/50 p-6 text-center text-sm text-muted-foreground">
        No images selected from the previous stage.
      </div>

      <!-- Product catalog -->
      <div class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h3 class="font-semibold">Choose Products</h3>
          <span v-if="selectedProductIds.size > 0" class="text-sm text-muted-foreground">
            {{ selectedProductIds.size }} product{{ selectedProductIds.size === 1 ? '' : 's' }} selected
          </span>
        </div>

        <div v-if="!isLoadingCatalog && catalogItems.length === 0" class="rounded-lg border bg-amber-50 border-amber-200 p-6 text-center text-sm">
          <p class="text-amber-800 font-medium">Your product catalog is empty.</p>
          <p class="text-amber-700 mt-1">
            Go to <a href="/settings?tab=catalog" class="underline">Settings → Catalog</a> to add products.
          </p>
        </div>

        <div v-else class="space-y-3">
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="cat in CATEGORIES"
              :key="cat.id"
              type="button"
              class="relative rounded-full border px-3 py-1 text-xs font-medium transition-all"
              :class="activeCategory === cat.id
                ? 'border-slate-950 bg-slate-950 text-white'
                : 'border-black/10 bg-white text-slate-600 hover:bg-slate-50'"
              @click="activeCategory = cat.id"
            >
              {{ cat.label }}
              <span class="ml-1 opacity-60">{{ catalogItems.filter(i => i.category === cat.id && i.enabled).length }}</span>
              <span
                v-if="isRecommended(cat.id) && activeCategory !== cat.id"
                class="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-400"
                title="Recommended for this project's niche"
              />
            </button>
          </div>

          <div v-if="isLoadingCatalog" class="text-sm text-muted-foreground py-4 text-center">Loading catalog…</div>
          <div v-else-if="catalogByCategory.length === 0" class="text-sm text-muted-foreground py-4 text-center italic">
            No {{ CATEGORIES.find(c => c.id === activeCategory)?.label.toLowerCase() }} in your catalog.
          </div>

          <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            <button
              v-for="item in catalogByCategory"
              :key="item.id"
              type="button"
              class="relative flex flex-col rounded-lg border text-left transition-all hover:border-primary/50 hover:shadow-sm active:scale-95 overflow-hidden bg-white"
              :class="selectedProductIds.has(item.id) ? 'ring-2 ring-primary border-primary' : 'border-black/10'"
              @click="toggleProduct(item.id)"
            >
              <!-- Badges (stacked top-left) -->
              <div class="absolute top-1.5 left-1.5 z-10 flex flex-col gap-1">
                <span
                  v-if="item.blueprint.isBestseller"
                  class="rounded-full bg-orange-500 px-1.5 py-0.5 text-[9px] font-bold text-white leading-none"
                >
                  🔥 Bestseller
                </span>
                <span
                  v-if="isRecommended(item.category)"
                  class="rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold text-white leading-none"
                >
                  ★ Rec
                </span>
              </div>
              <!-- Selected check -->
              <div v-if="selectedProductIds.has(item.id)" class="absolute top-1.5 right-1.5 z-10 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                <svg class="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="aspect-square w-full bg-muted overflow-hidden">
                <img
                  v-if="item.blueprint.previewImageUrl ?? item.blueprint.imageUrl"
                  :src="(item.blueprint.previewImageUrl ?? item.blueprint.imageUrl)!"
                  :alt="item.displayName"
                  class="h-full w-full object-cover"
                  loading="lazy"
                />
                <div v-else class="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">No image</div>
              </div>
              <div class="p-2 space-y-0.5 flex-1">
                <p class="text-[11px] font-semibold leading-tight line-clamp-1">
                  {{ item.blueprint.brandName ?? item.displayName }}
                </p>
                <p class="text-[10px] text-muted-foreground leading-tight line-clamp-1">{{ item.blueprint.title }}</p>
                <p class="text-[10px] font-medium text-slate-600">
                  {{ item.blueprint.basePrice ? formatPrice(item.blueprint.basePrice) + ' base' : 'No price yet' }}
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-wrap items-center gap-3">
        <button
          class="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50"
          :disabled="selectedProductIds.size === 0 || selectedImages.length === 0"
          @click="openModal"
        >
          Configure {{ selectedProductIds.size || '' }} product{{ selectedProductIds.size === 1 ? '' : 's' }} →
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2.5 text-sm text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95"
          @click="skipStage"
        >
          {{ products.length > 0 ? 'Skip to Manual Review' : 'Skip product creation' }}
        </button>
      </div>

      <!-- Previously created products -->
      <div v-if="products.length > 0" class="space-y-2">
        <p class="text-sm text-muted-foreground">{{ products.length }} product{{ products.length === 1 ? '' : 's' }} created previously</p>
        <div
          v-for="product in products"
          :key="product.id"
          class="rounded-lg border p-3 text-sm"
          :class="{ 'border-green-200 bg-green-50': product.status === 'created', 'border-red-200 bg-red-50': product.status === 'failed' }"
        >
          <p class="font-medium">{{ product.title }}</p>
          <div class="mt-1 flex items-center gap-2">
            <span class="text-xs font-mono bg-muted px-2 py-0.5 rounded">{{ product.sku }}</span>
            <span class="text-xs px-2 py-0.5 rounded-full" :class="{ 'bg-green-100 text-green-700': product.status === 'created', 'bg-red-100 text-red-700': product.status === 'failed' }">{{ product.status }}</span>
          </div>
          <p v-if="product.errorMessage" class="mt-1 text-xs text-red-600">{{ product.errorMessage }}</p>
        </div>
      </div>
    </template>

    <!-- Placement Modal -->
    <PlacementModal
      v-if="showModal"
      :project-id="projectId"
      :products="selectedProductList"
      :images="selectedImages"
      @done="onModalDone"
      @cancel="onModalCancel"
    />
  </div>
</template>
