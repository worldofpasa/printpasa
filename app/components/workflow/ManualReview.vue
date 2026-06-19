<script setup lang="ts">
import Badge from '~/components/ui/badge/Badge.vue'
import Button from '~/components/ui/button/Button.vue'
import Tabs from '~/components/ui/tabs/Tabs.vue'
import TabsList from '~/components/ui/tabs/TabsList.vue'
import TabsTrigger from '~/components/ui/tabs/TabsTrigger.vue'
import TabsContent from '~/components/ui/tabs/TabsContent.vue'
import ProductRow from './ManualReviewProductRow.vue'

const props = defineProps<{
  projectId: string
  project: any
}>()

const emit = defineEmits<{
  (e: 'ready', value: boolean): void
  (e: 'project-changed'): void
}>()

type TabKey = 'drafts' | 'published' | 'archived'

const products = ref<any[]>([])
const isLoading = ref(false)
const isPublishing = ref(false)
const isCompleting = ref(false)
const isArchiving = ref<string | null>(null)
const activeTab = ref<TabKey>('drafts')
const selectedForPublish = ref<Set<string>>(new Set())
const previewMockupSrc = ref<string | null>(null)

function openMockupPreview(src: string) {
  previewMockupSrc.value = src
}

function closeMockupPreview() {
  previewMockupSrc.value = null
}

function onGlobalKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && previewMockupSrc.value) closeMockupPreview()
}

onMounted(async () => {
  window.addEventListener('keydown', onGlobalKey)
  emit('ready', true) // Final stage, always ready
  isLoading.value = true
  try {
    const result = await $fetch(`/api/workflow/${props.projectId}/products/list`)
    products.value = (result as any).products ?? []
  } catch {
    // keep products empty on error
  } finally {
    isLoading.value = false
  }
})

onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalKey))

function togglePublish(id: string) {
  if (selectedForPublish.value.has(id)) {
    selectedForPublish.value.delete(id)
  } else {
    selectedForPublish.value.add(id)
  }
  selectedForPublish.value = new Set(selectedForPublish.value)
}

function selectAllDrafts() {
  const draftIds = products.value
    .filter((p: any) => p.status === 'created' || p.status === 'draft')
    .map((p: any) => p.id)
  selectedForPublish.value = new Set(draftIds)
}

async function publishSelected() {
  if (selectedForPublish.value.size === 0) return
  isPublishing.value = true

  try {
    const result = await $fetch(`/api/workflow/${props.projectId}/review/publish`, {
      method: 'POST',
      body: { productIds: Array.from(selectedForPublish.value) },
    })

    // Update product statuses
    const publishResults = (result as any).results
    for (const r of publishResults) {
      const product = products.value.find((p: any) => p.id === r.productId)
      if (product) {
        product.status = r.success ? 'published' : 'failed'
        if (r.error) product.errorMessage = r.error
      }
    }

    selectedForPublish.value = new Set()
  } catch (err: any) {
    alert(err.data?.message ?? 'Publishing failed')
  } finally {
    isPublishing.value = false
  }
}

// Drafts tab holds anything that still needs a decision: fresh drafts, already-created
// Printify drafts, and failed creations (so the user can archive the noise).
const draftsList = computed(() => products.value.filter((p: any) =>
  p.status === 'draft' || p.status === 'created' || p.status === 'failed',
))
const publishedList = computed(() => products.value.filter((p: any) => p.status === 'published'))
const archivedList = computed(() => products.value.filter((p: any) => p.status === 'archived'))

const draftCount = computed(() => draftsList.value.length)
const publishableCount = computed(() =>
  products.value.filter((p: any) => p.status === 'created' || p.status === 'draft').length,
)
const publishedCount = computed(() => publishedList.value.length)
const archivedCount = computed(() => archivedList.value.length)
const isCompleted = computed(() => props.project?.status === 'completed')

async function archiveProduct(id: string, unarchive = false) {
  if (isArchiving.value) return
  isArchiving.value = id
  try {
    await $fetch(`/api/workflow/${props.projectId}/review/archive`, {
      method: 'POST',
      body: { productIds: [id], unarchive },
    })
    const product = products.value.find((p: any) => p.id === id)
    // Un-archive restores to 'created' — the only publishable draft state. If the row was
    // originally 'failed', it stays that way on the server; users can re-archive.
    if (product) product.status = unarchive ? 'created' : 'archived'
    if (!unarchive) {
      selectedForPublish.value.delete(id)
      selectedForPublish.value = new Set(selectedForPublish.value)
    }
  } catch (err: any) {
    alert(err.data?.message ?? 'Failed to update product')
  } finally {
    isArchiving.value = null
  }
}

async function markPipelineComplete() {
  if (isCompleting.value || !props.project?.slug) return
  if (!confirm('Mark this pipeline as completed? You can still revisit stages, but the project will be flagged as done.')) return
  isCompleting.value = true
  try {
    await $fetch(`/api/projects/${props.project.slug}`, {
      method: 'PUT',
      body: { status: 'completed' },
    })
    emit('project-changed')
  } catch (err: any) {
    alert(err.data?.message ?? 'Failed to mark project complete')
  } finally {
    isCompleting.value = false
  }
}

</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-4 sm:grid-cols-3">
      <div class="rounded-[1.35rem] border border-black/10 bg-slate-50/80 p-4 text-center">
        <div class="text-3xl font-semibold text-slate-950">{{ products.length }}</div>
        <div class="mt-1 text-sm text-slate-500">Total products</div>
      </div>
      <div class="rounded-[1.35rem] border border-black/10 bg-slate-50/80 p-4 text-center">
        <div class="text-3xl font-semibold text-sky-700">{{ draftCount }}</div>
        <div class="mt-1 text-sm text-slate-500">Ready to publish</div>
      </div>
      <div class="rounded-[1.35rem] border border-black/10 bg-slate-50/80 p-4 text-center">
        <div class="text-3xl font-semibold text-emerald-700">{{ publishedCount }}</div>
        <div class="mt-1 text-sm text-slate-500">Published</div>
      </div>
    </div>

    <div class="rounded-[1.5rem] border border-black/10 bg-[#fffaf2] p-4 shadow-soft">
      <p class="eyebrow">Publishing desk</p>
      <h3 class="mt-2 font-serif text-2xl font-semibold text-slate-950">Choose the products that should go live next.</h3>
      <p class="mt-2 text-sm leading-6 text-slate-600">
        Review drafts, bulk-select ready items, and publish only the set you want to push to the storefront.
      </p>
    </div>

    <div v-if="isLoading" class="flex items-center justify-center py-8">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>

    <Tabs v-else-if="products.length > 0" v-model="activeTab" class="space-y-4">
      <TabsList>
        <TabsTrigger value="drafts">Drafts ({{ draftCount }})</TabsTrigger>
        <TabsTrigger value="published">Published ({{ publishedCount }})</TabsTrigger>
        <TabsTrigger value="archived" :disabled="archivedCount === 0">Archived ({{ archivedCount }})</TabsTrigger>
      </TabsList>

      <TabsContent value="drafts" class="space-y-3">
        <div v-if="publishableCount > 0" class="flex flex-wrap items-center gap-3">
          <Button variant="outline" @click="selectAllDrafts">Select all drafts</Button>
          <Button
            :disabled="selectedForPublish.size === 0 || isPublishing"
            @click="publishSelected"
          >
            <svg v-if="isPublishing" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ isPublishing ? 'Publishing...' : `Publish ${selectedForPublish.size} Products` }}
          </Button>
        </div>

        <div v-if="draftsList.length === 0" class="rounded-[1.5rem] border border-dashed border-black/10 bg-slate-50/70 px-6 py-10 text-center">
          <p class="eyebrow">No drafts</p>
          <p class="mt-3 text-sm leading-6 text-slate-600">Every product has been published or archived.</p>
        </div>
        <ProductRow
          v-for="product in draftsList"
          :key="product.id"
          :product="product"
          :selected="selectedForPublish.has(product.id)"
          :is-archiving="isArchiving === product.id"
          @toggle="togglePublish"
          @archive="(id) => archiveProduct(id)"
          @unarchive="(id) => archiveProduct(id, true)"
          @preview="openMockupPreview"
        />
      </TabsContent>

      <TabsContent value="published" class="space-y-3">
        <div v-if="publishedList.length === 0" class="rounded-[1.5rem] border border-dashed border-black/10 bg-slate-50/70 px-6 py-10 text-center">
          <p class="eyebrow">Nothing live yet</p>
          <p class="mt-3 text-sm leading-6 text-slate-600">Published products will appear here after you publish from the Drafts tab.</p>
        </div>
        <ProductRow
          v-for="product in publishedList"
          :key="product.id"
          :product="product"
          :selected="false"
          :is-archiving="false"
          @preview="openMockupPreview"
        />
      </TabsContent>

      <TabsContent value="archived" class="space-y-3">
        <div v-if="archivedList.length === 0" class="rounded-[1.5rem] border border-dashed border-black/10 bg-slate-50/70 px-6 py-10 text-center">
          <p class="eyebrow">Nothing archived</p>
          <p class="mt-3 text-sm leading-6 text-slate-600">Archive a draft or failed item to stash it here without deleting it from Printify.</p>
        </div>
        <ProductRow
          v-for="product in archivedList"
          :key="product.id"
          :product="product"
          :selected="false"
          :is-archiving="isArchiving === product.id"
          @unarchive="(id) => archiveProduct(id, true)"
          @preview="openMockupPreview"
        />
      </TabsContent>
    </Tabs>

    <div v-if="!isLoading && products.length === 0" class="rounded-[1.5rem] border border-dashed border-black/10 bg-slate-50/70 px-6 py-10 text-center">
      <p class="eyebrow">Nothing to publish</p>
      <p class="mt-3 text-sm leading-6 text-slate-600">No products created yet. Go back to Product Placement before using this stage.</p>
    </div>

    <div
      v-if="!isLoading && products.length > 0"
      class="rounded-[1.5rem] border p-5"
      :class="isCompleted
        ? 'border-emerald-200 bg-emerald-50'
        : 'border-black/10 bg-[#fffaf2]'"
    >
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="eyebrow" :class="isCompleted ? 'text-emerald-700' : ''">
            {{ isCompleted ? 'Pipeline completed' : 'Wrap up' }}
          </p>
          <h3 class="mt-2 font-serif text-xl font-semibold text-slate-950">
            {{ isCompleted ? 'This project is marked as done.' : 'Finished publishing?' }}
          </h3>
          <p class="mt-1 text-sm leading-6 text-slate-600">
            {{ isCompleted
              ? 'You can still revisit any stage — archived and draft products remain in Printify.'
              : 'Mark this pipeline complete when you are done iterating. Drafts and archived products stay in Printify.' }}
          </p>
        </div>
        <Button
          v-if="!isCompleted"
          variant="outline"
          :disabled="isCompleting"
          @click="markPipelineComplete"
        >
          <svg v-if="isCompleting" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isCompleting ? 'Completing...' : 'Mark pipeline complete' }}
        </Button>
        <Badge v-else variant="success">Completed</Badge>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="previewMockupSrc"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      @click.self="closeMockupPreview"
    >
      <button
        type="button"
        class="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        title="Close"
        @click="closeMockupPreview"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <img
        :src="previewMockupSrc"
        class="max-h-[90vh] max-w-[90vw] rounded-[1.5rem] object-contain shadow-panel"
        alt="Mockup preview"
      />
    </div>
  </Teleport>
</template>
