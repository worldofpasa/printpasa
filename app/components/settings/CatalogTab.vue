<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Card from '~/components/ui/card/Card.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import CardHeader from '~/components/ui/card/CardHeader.vue'
import CardTitle from '~/components/ui/card/CardTitle.vue'
import CardDescription from '~/components/ui/card/CardDescription.vue'

type Category = 'tshirt' | 'hoodie' | 'tanktop' | 'cap' | 'tote' | 'cup'

interface BlueprintRow {
  blueprintId: string
  provider: string
  title: string
  brandName: string | null
  imageUrl: string | null
  isBestseller: boolean
  inCatalog: boolean
}

interface CatalogItem {
  id: string
  provider: string
  category: Category
  displayName: string
  enabled: boolean
  sortOrder: number
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

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'tshirt',  label: 'T-Shirts' },
  { id: 'hoodie',  label: 'Hoodies' },
  { id: 'tanktop', label: 'Tank Tops' },
  { id: 'cap',     label: 'Caps' },
  { id: 'tote',    label: 'Totes' },
  { id: 'cup',     label: 'Cups' },
]

// Browse state
const browseSearch = ref('')
const browseResults = ref<BlueprintRow[]>([])
const browseTotal = ref(0)
const isBrowsing = ref(false)
const browseCategory = ref<Category>('tshirt')
const addingId = ref<string | null>(null)
const addError = ref<string | null>(null)

// Catalog items (user's saved list)
const catalogItems = ref<CatalogItem[]>([])
const isLoadingCatalog = ref(false)
const activeCategory = ref<Category>('tshirt')

const catalogByCategory = computed(() =>
  catalogItems.value.filter(i => i.category === activeCategory.value),
)

// Track which Printify blueprint IDs are already in catalog so browse can mark them
const catalogBlueprintIds = computed(() => new Set(catalogItems.value.map(i => i.blueprint.blueprintId)))

async function loadCatalog() {
  isLoadingCatalog.value = true
  try {
    const data = await $fetch<{ items: CatalogItem[] }>('/api/settings/catalog')
    catalogItems.value = data.items
  } catch {
    // silent
  } finally {
    isLoadingCatalog.value = false
  }
}

let browseTimer: ReturnType<typeof setTimeout> | null = null
function onSearchInput() {
  if (browseTimer) clearTimeout(browseTimer)
  browseTimer = setTimeout(browseCatalog, 350)
}

async function browseCatalog() {
  isBrowsing.value = true
  try {
    const data = await $fetch<{ blueprints: BlueprintRow[]; total: number }>('/api/settings/catalog/browse', {
      query: {
        provider: 'printify',
        search: browseSearch.value,
        category: browseSearch.value.trim() ? '' : browseCategory.value,
        perPage: 48,
      },
    })
    browseResults.value = data.blueprints
    browseTotal.value = data.total
  } catch {
    browseResults.value = []
    browseTotal.value = 0
  } finally {
    isBrowsing.value = false
  }
}

async function addToCategory(bp: BlueprintRow, category: Category) {
  if (catalogBlueprintIds.value.has(bp.blueprintId)) return
  addingId.value = bp.blueprintId
  addError.value = null
  try {
    await $fetch('/api/settings/catalog', {
      method: 'POST',
      body: {
        blueprintId: bp.blueprintId,
        provider: bp.provider,
        title: bp.title,
        imageUrl: bp.imageUrl,
        displayName: bp.brandName ?? undefined,
        category,
      },
    })
    await loadCatalog()
  } catch (err: any) {
    addError.value = err.data?.statusMessage ?? 'Failed to add'
  } finally {
    addingId.value = null
  }
}

async function removeItem(id: string) {
  try {
    await $fetch(`/api/settings/catalog/${id}`, { method: 'DELETE' })
    catalogItems.value = catalogItems.value.filter(i => i.id !== id)
  } catch {
    // silent
  }
}

async function setPreviewImage(item: CatalogItem, imageIndex: number) {
  try {
    await $fetch('/api/settings/catalog/preview-image', {
      method: 'PUT',
      body: { blueprintId: item.blueprint.blueprintId, imageIndex },
    })
    // Update local state
    if (item.blueprint.allImages) {
      item.blueprint.previewImageUrl = item.blueprint.allImages[imageIndex] ?? null
    }
  } catch {
    // silent
  }
}

async function toggleItem(item: CatalogItem) {
  try {
    await $fetch(`/api/settings/catalog/${item.id}`, {
      method: 'PUT',
      body: { enabled: !item.enabled },
    })
    item.enabled = !item.enabled
  } catch {
    // silent
  }
}

function formatPrice(cents: number | null): string {
  if (cents == null) return ''
  return `$${(cents / 100).toFixed(2)}`
}

onMounted(async () => {
  await Promise.all([loadCatalog(), browseCatalog()])
})
</script>

<template>
  <div class="space-y-6">
    <Card class="overflow-hidden border-black/10 bg-white/90 shadow-panel">
      <CardHeader class="gap-2 border-b border-black/5 bg-[#fffaf2]/80">
        <div>
          <CardTitle class="font-serif text-[1.85rem]">Product Catalog</CardTitle>
          <CardDescription class="mt-1 text-sm leading-6">
            Browse Printify products and add them to your curated catalog.
            These appear in the product placement screen when creating products.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent class="p-5 space-y-6">
        <!-- Browse section -->
        <div class="space-y-3">
          <div class="flex flex-wrap items-center gap-3">
            <h3 class="text-sm font-semibold text-slate-800">Browse Printify Products</h3>
            <div class="relative flex-1 min-w-[200px]">
              <input
                v-model="browseSearch"
                type="text"
                placeholder="Search by name…"
                class="w-full rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
                @input="onSearchInput"
              />
            </div>
            <span v-if="isBrowsing" class="text-xs text-muted-foreground">Loading…</span>
            <span v-else-if="browseTotal > 0" class="text-xs text-muted-foreground">
              {{ browseResults.length }} of {{ browseTotal }}
            </span>
          </div>

          <!-- Category filter tabs -->
          <div class="flex flex-wrap gap-1">
            <button
              v-for="cat in CATEGORIES"
              :key="cat.id"
              type="button"
              class="rounded-full border px-3 py-1 text-xs font-medium transition-all"
              :class="browseCategory === cat.id
                ? 'border-slate-950 bg-slate-950 text-white'
                : 'border-black/10 bg-white text-slate-600 hover:bg-slate-50'"
              @click="browseCategory = cat.id; browseSearch = ''; browseCatalog()"
            >
              {{ cat.label }}
            </button>
          </div>

          <p class="text-xs text-muted-foreground">
            Click a product to add it to <strong>{{ CATEGORIES.find(c => c.id === browseCategory)?.label }}</strong>.
          </p>

          <div v-if="addError" class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">{{ addError }}</div>

          <div v-if="isBrowsing" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            <div v-for="n in 12" :key="n" class="rounded-lg bg-muted animate-pulse aspect-square" />
          </div>

          <div v-else-if="browseResults.length === 0" class="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            No products found. Make sure your Printify API key is configured in Settings → Providers.
          </div>

          <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-80 overflow-y-auto pr-1">
            <button
              v-for="bp in browseResults"
              :key="bp.blueprintId"
              type="button"
              :disabled="catalogBlueprintIds.has(bp.blueprintId) || addingId === bp.blueprintId"
              class="relative flex flex-col rounded-lg border bg-white text-left transition-all hover:border-slate-400 hover:shadow-sm active:scale-95 disabled:cursor-default overflow-hidden"
              :class="catalogBlueprintIds.has(bp.blueprintId)
                ? 'border-emerald-300 bg-emerald-50 opacity-60'
                : 'border-black/10 hover:border-slate-400'"
              :title="bp.title"
              @click="addToCategory(bp, browseCategory)"
            >
              <div class="relative aspect-square w-full bg-muted overflow-hidden">
                <img v-if="bp.imageUrl" :src="bp.imageUrl" :alt="bp.title" class="h-full w-full object-cover" loading="lazy" />
                <div v-else class="h-full w-full flex items-center justify-center text-muted-foreground text-[10px]">No image</div>
                <span
                  v-if="bp.isBestseller"
                  class="absolute top-1 left-1 rounded-full bg-orange-500 px-1.5 py-0.5 text-[8px] font-bold text-white leading-none"
                >🔥</span>
              </div>
              <div class="p-1.5 space-y-0.5">
                <p class="text-[10px] font-semibold leading-tight line-clamp-1 text-slate-800">{{ bp.brandName ?? bp.title }}</p>
                <p v-if="bp.brandName" class="text-[9px] leading-tight line-clamp-1 text-slate-500">{{ bp.title }}</p>
              </div>
              <!-- Already added check -->
              <div v-if="catalogBlueprintIds.has(bp.blueprintId)" class="absolute top-1 right-1 h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center">
                <svg class="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
              <!-- Loading spinner -->
              <div v-if="addingId === bp.blueprintId" class="absolute inset-0 flex items-center justify-center bg-white/70">
                <svg class="h-4 w-4 animate-spin text-slate-600" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            </button>
          </div>
        </div>

        <!-- Curated catalog -->
        <div class="space-y-3">
          <h3 class="text-sm font-semibold text-slate-800">Your Curated Catalog</h3>

          <div class="flex flex-wrap gap-1">
            <button
              v-for="cat in CATEGORIES"
              :key="cat.id"
              type="button"
              class="rounded-full border px-3 py-1 text-xs font-medium transition-all"
              :class="activeCategory === cat.id
                ? 'border-slate-950 bg-slate-950 text-white'
                : 'border-black/10 bg-white text-slate-600 hover:bg-slate-50'"
              @click="activeCategory = cat.id"
            >
              {{ cat.label }}
              <span class="ml-1 opacity-60">{{ catalogItems.filter(i => i.category === cat.id).length }}</span>
            </button>
          </div>

          <div v-if="isLoadingCatalog" class="text-sm text-muted-foreground py-4 text-center">Loading…</div>

          <div v-else-if="catalogByCategory.length === 0" class="rounded-lg border bg-muted/30 p-5 text-center text-sm text-muted-foreground">
            No {{ CATEGORIES.find(c => c.id === activeCategory)?.label.toLowerCase() }} added yet.
          </div>

          <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            <div
              v-for="item in catalogByCategory"
              :key="item.id"
              class="rounded-lg border overflow-hidden bg-white"
              :class="item.enabled ? 'border-black/10' : 'border-black/5 opacity-50'"
            >
              <!-- Main preview image (current selection) -->
              <div class="aspect-square bg-muted overflow-hidden relative">
                <img
                  v-if="item.blueprint.previewImageUrl ?? item.blueprint.imageUrl"
                  :src="item.blueprint.previewImageUrl ?? item.blueprint.imageUrl ?? ''"
                  class="h-full w-full object-cover"
                  loading="lazy"
                />
                <div v-else class="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">No image</div>
              </div>

              <!-- Image strip picker: scroll through all images to pick the preview -->
              <div v-if="item.blueprint.allImages && item.blueprint.allImages.length > 1" class="flex gap-1 overflow-x-auto p-1.5 bg-slate-50 border-t border-black/5">
                <button
                  v-for="(imgUrl, idx) in item.blueprint.allImages"
                  :key="idx"
                  type="button"
                  class="flex-shrink-0 h-8 w-8 rounded border-2 overflow-hidden transition-all"
                  :class="imgUrl === (item.blueprint.previewImageUrl ?? item.blueprint.imageUrl)
                    ? 'border-primary'
                    : 'border-transparent hover:border-slate-300'"
                  :title="`Use image ${idx + 1} as preview`"
                  @click="setPreviewImage(item, idx)"
                >
                  <img :src="imgUrl" class="h-full w-full object-cover" loading="lazy" />
                </button>
              </div>

              <div class="p-2 space-y-1">
                <p class="text-[11px] font-semibold leading-tight line-clamp-1">{{ item.blueprint.brandName ?? item.displayName }}</p>
                <p class="text-[10px] text-muted-foreground leading-tight line-clamp-1">{{ item.blueprint.title }}</p>
                <p v-if="item.blueprint.basePrice" class="text-[10px] text-slate-500">{{ formatPrice(item.blueprint.basePrice) }} base</p>
                <div class="flex items-center justify-between gap-1 pt-1">
                  <button type="button" class="text-[10px] text-slate-500 hover:text-slate-800 transition-colors" @click="toggleItem(item)">
                    {{ item.enabled ? 'Disable' : 'Enable' }}
                  </button>
                  <button type="button" class="text-[10px] text-red-400 hover:text-red-600 transition-colors" @click="removeItem(item.id)">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
