<script setup lang="ts">
import Badge from '~/components/ui/badge/Badge.vue'
import Checkbox from '~/components/ui/checkbox/Checkbox.vue'

interface Mockup { src: string; variantIds: string[]; position?: string; isDefault?: boolean }

const props = defineProps<{
  product: any
  selected: boolean
  isArchiving: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle', id: string): void
  (e: 'archive', id: string): void
  (e: 'unarchive', id: string): void
  (e: 'preview', src: string): void
}>()

function statusVariant(status: string): 'outline' | 'accent' | 'success' | 'destructive' | 'muted' {
  if (status === 'published') return 'success'
  if (status === 'failed') return 'destructive'
  if (status === 'created' || status === 'draft') return 'accent'
  if (status === 'archived') return 'muted'
  return 'outline'
}

function statusLabel(status: string): string {
  if (status === 'published') return 'Published'
  if (status === 'failed') return 'Failed'
  if (status === 'created' || status === 'draft') return 'Draft Created'
  if (status === 'archived') return 'Archived'
  return status
}

function canArchive(status: string): boolean {
  return status === 'draft' || status === 'created' || status === 'failed'
}

function parseMockups(): Mockup[] {
  if (!props.product?.mockupImages) return []
  try {
    const raw = props.product.mockupImages
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const frontMockups = computed<Mockup[]>(() => {
  const all = parseMockups()
  if (all.length === 0) return []
  const score = (m: Mockup) =>
    (m.position === 'front' ? 4 : 0) + (!m.position ? 2 : 0) + (m.isDefault ? 1 : 0)
  const byColor = new Map<string, Mockup>()
  for (const m of all) {
    const key = [...(m.variantIds ?? [])].sort().join(',') || m.src
    const existing = byColor.get(key)
    if (!existing || score(m) > score(existing)) byColor.set(key, m)
  }
  return Array.from(byColor.values())
})

const hasMetadataFallback = computed(() => {
  if (!props.product?.metadata) return false
  try {
    const raw = props.product.metadata
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return parsed?.metadataFallback === true
  } catch {
    return false
  }
})

const showCheckbox = computed(() =>
  props.product.status === 'created' || props.product.status === 'draft',
)
</script>

<template>
  <div
    class="rounded-[1.5rem] border bg-white p-4 transition-all sm:p-5"
    :class="[
      selected
        ? 'border-slate-950 shadow-soft ring-1 ring-slate-950/10'
        : 'border-black/10 hover:border-slate-950/15',
      product.status === 'archived' ? 'opacity-70' : '',
    ]"
  >
    <div class="flex items-start gap-4">
      <div v-if="showCheckbox" class="pt-1">
        <Checkbox :model-value="selected" @update:model-value="emit('toggle', product.id)" />
      </div>

      <div class="min-w-0 flex-1">
        <div class="space-y-2">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <h4 class="text-base font-semibold text-slate-950">{{ product.title }}</h4>
            <div class="flex items-center gap-2">
              <button
                v-if="canArchive(product.status)"
                type="button"
                class="text-xs font-medium text-slate-500 underline-offset-2 transition-colors hover:text-rose-700 hover:underline disabled:opacity-50"
                :disabled="isArchiving"
                title="Archive — keeps the Printify draft, hides it from this workflow"
                @click="emit('archive', product.id)"
              >
                {{ isArchiving ? 'Archiving…' : 'Archive' }}
              </button>
              <button
                v-else-if="product.status === 'archived'"
                type="button"
                class="text-xs font-medium text-slate-500 underline-offset-2 transition-colors hover:text-slate-950 hover:underline disabled:opacity-50"
                :disabled="isArchiving"
                @click="emit('unarchive', product.id)"
              >
                {{ isArchiving ? 'Restoring…' : 'Unarchive' }}
              </button>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <Badge :variant="statusVariant(product.status)">{{ statusLabel(product.status) }}</Badge>
            <Badge variant="outline" class="capitalize">{{ product.fulfillmentProvider }}</Badge>
            <code class="rounded-full border border-black/10 bg-slate-50 px-2.5 py-1 font-mono text-[10px] tracking-wide text-slate-600">{{ product.sku }}</code>
            <Badge v-if="hasMetadataFallback" variant="outline" title="AI metadata generation failed; placeholder title and description were used — review before publishing.">
              Placeholder metadata
            </Badge>
          </div>
          <p class="text-sm leading-6 text-slate-600">{{ product.description }}</p>
        </div>

        <div v-if="frontMockups.length > 0" class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <button
            v-for="(mockup, idx) in frontMockups"
            :key="mockup.src + idx"
            type="button"
            class="group relative aspect-square overflow-hidden rounded-[1rem] border border-black/10 bg-slate-50 transition-all hover:border-slate-950/30 hover:shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
            title="Click to enlarge"
            @click="emit('preview', mockup.src)"
          >
            <img
              :src="mockup.src"
              class="h-full w-full object-contain transition-transform group-hover:scale-[1.02]"
              loading="lazy"
              alt="Product mockup"
            />
            <span
              v-if="mockup.isDefault"
              class="absolute bottom-1.5 left-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white"
            >
              Default
            </span>
          </button>
        </div>
        <p
          v-else-if="product.status === 'created' || product.status === 'draft'"
          class="mt-4 rounded-[1rem] border border-dashed border-black/10 bg-slate-50/70 px-3 py-2 text-xs text-slate-500"
        >
          Mockups still rendering on Printify. Refresh in a moment to see them.
        </p>

        <p v-if="product.errorMessage" class="mt-3 rounded-[1rem] border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">
          {{ product.errorMessage }}
        </p>
      </div>
    </div>
  </div>
</template>
