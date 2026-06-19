<script setup lang="ts">
import Badge from '~/components/ui/badge/Badge.vue'
import Input from '~/components/ui/input/Input.vue'
import Select from '~/components/ui/select/Select.vue'
import SelectContent from '~/components/ui/select/SelectContent.vue'
import SelectItem from '~/components/ui/select/SelectItem.vue'
import SelectTrigger from '~/components/ui/select/SelectTrigger.vue'
import SelectValue from '~/components/ui/select/SelectValue.vue'
import { useAuditLogs } from '~/composables/useAuditLogs'

const { user } = useUserSession()
const router = useRouter()

const {
  logs,
  total,
  isLoading,
  error,
  filterOptions,
  filters,
  fetchLogs,
  fetchFilterOptions,
  fetchLogDetail,
  setFilter,
  clearFilters,
} = useAuditLogs()

const showJsonModal = ref(false)
const selectedLogId = ref<string | null>(null)
const selectedMetadata = ref<Record<string, unknown> | null>(null)
const isLoadingDetail = ref(false)
const searchInput = ref(filters.value.q)

let searchDebounce: ReturnType<typeof setTimeout> | null = null

function actorVariant(actor: string) {
  if (actor === 'USER') return 'accent'
  if (actor === 'CRON' || actor === 'TELEGRAM' || actor === 'SYSTEM' || actor === 'SERVICE') return 'muted'
  return 'outline'
}

function levelVariant(level: string | null) {
  if (level === 'error') return 'destructive'
  if (level === 'warning') return 'warning'
  if (level === 'success') return 'success'
  return 'muted'
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString()
}

async function openMetadata(id: string) {
  selectedLogId.value = id
  showJsonModal.value = true
  isLoadingDetail.value = true
  selectedMetadata.value = null
  try {
    const detail = await fetchLogDetail(id)
    selectedMetadata.value = detail.metadata
  } finally {
    isLoadingDetail.value = false
  }
}

function closeModal() {
  showJsonModal.value = false
  selectedLogId.value = null
  selectedMetadata.value = null
}

function onSearchInput(value: string | number) {
  searchInput.value = String(value)
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    setFilter('q', searchInput.value)
  }, 300)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && showJsonModal.value) {
    closeModal()
  }
}

watch(filters, () => {
  if (searchInput.value !== filters.value.q) {
    searchInput.value = filters.value.q
  }
  fetchLogs()
}, { deep: true })

onMounted(async () => {
  if (!user.value?.isSuperuser) {
    await router.replace('/')
    return
  }
  window.addEventListener('keydown', onKeydown)
  await Promise.all([fetchFilterOptions(), fetchLogs(false)])
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  if (searchDebounce) clearTimeout(searchDebounce)
})
</script>

<template>
  <div class="mx-auto max-w-[90rem] space-y-8 pb-16">
    <section class="space-y-2">
      <h1 class="font-serif text-4xl font-semibold tracking-tight text-slate-950">System Audit Logs</h1>
      <p class="max-w-3xl text-sm leading-6 text-slate-600">
        Full system trail of authentication, workflow runs, and pipeline activity. Newest events appear first.
      </p>
    </section>

    <section class="surface-card overflow-hidden">
      <div class="border-b border-black/5 px-6 py-5">
        <div class="flex items-center gap-2">
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950/5 text-slate-700">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
            </svg>
          </div>
          <div>
            <p class="eyebrow">Audit Trail</p>
            <p class="text-sm text-slate-500">{{ total }} event{{ total === 1 ? '' : 's' }}</p>
          </div>
        </div>

        <div class="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(10rem,0.5fr))]">
          <div class="relative">
            <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <circle cx="11" cy="11" r="7" />
              <path stroke-linecap="round" d="m20 20-3.5-3.5" />
            </svg>
            <Input
              :model-value="searchInput"
              class="rounded-2xl border-black/10 bg-slate-50/80 pl-10"
              placeholder="Filter by action, target, actor, or run ID..."
              @update:model-value="onSearchInput"
            />
          </div>

          <Select
            :model-value="filters.projectId || 'all'"
            @update:model-value="setFilter('projectId', $event === 'all' ? '' : String($event))"
          >
            <SelectTrigger class="rounded-2xl border-black/10 bg-slate-50/80">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              <SelectItem
                v-for="project in filterOptions?.projects ?? []"
                :key="project.id"
                :value="project.id"
              >
                {{ project.name }}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            :model-value="filters.stage || 'all'"
            @update:model-value="setFilter('stage', $event === 'all' ? '' : String($event))"
          >
            <SelectTrigger class="rounded-2xl border-black/10 bg-slate-50/80">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              <SelectItem
                v-for="stage in filterOptions?.stages ?? []"
                :key="stage.id"
                :value="stage.id"
              >
                {{ stage.label }}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            :model-value="filters.actor || 'all'"
            @update:model-value="setFilter('actor', $event === 'all' ? '' : String($event))"
          >
            <SelectTrigger class="rounded-2xl border-black/10 bg-slate-50/80">
              <SelectValue placeholder="Actor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actors</SelectItem>
              <SelectItem
                v-for="actor in filterOptions?.actors ?? []"
                :key="actor"
                :value="actor"
              >
                {{ actor }}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            :model-value="filters.level || 'all'"
            @update:model-value="setFilter('level', $event === 'all' ? '' : String($event))"
          >
            <SelectTrigger class="rounded-2xl border-black/10 bg-slate-50/80">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem
                v-for="level in filterOptions?.levels ?? []"
                :key="level"
                :value="level"
              >
                {{ level }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="mt-3 flex justify-end">
          <button
            class="rounded-full border border-black/10 px-4 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
            @click="clearFilters"
          >
            Clear filters
          </button>
        </div>
      </div>

      <div v-if="isLoading" class="flex items-center justify-center py-16">
        <div class="h-10 w-10 animate-spin rounded-full border-4 border-slate-950 border-t-transparent" />
      </div>

      <div v-else-if="error" class="px-6 py-12 text-center text-sm text-red-600">
        {{ error }}
      </div>

      <div v-else-if="logs.length === 0" class="px-6 py-12 text-center text-sm text-slate-500">
        No audit logs match the current filters.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead class="border-b border-black/5 bg-[#fffaf2]/70 text-xs uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th class="px-6 py-4 font-semibold">Timestamp</th>
              <th class="px-4 py-4 font-semibold">Actor</th>
              <th class="px-4 py-4 font-semibold">Action</th>
              <th class="px-4 py-4 font-semibold">Target</th>
              <th class="px-4 py-4 font-semibold">Metadata</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="log in logs"
              :key="log.id"
              class="border-b border-black/5 transition-colors hover:bg-slate-50/70"
            >
              <td class="whitespace-nowrap px-6 py-4 text-slate-600">
                {{ formatTimestamp(log.createdAt) }}
              </td>
              <td class="px-4 py-4">
                <Badge :variant="actorVariant(log.actor)">{{ log.actor }}</Badge>
              </td>
              <td class="px-4 py-4">
                <div class="space-y-1">
                  <p class="font-medium text-slate-950">{{ log.action }}</p>
                  <Badge v-if="log.level" :variant="levelVariant(log.level)" class="text-[0.65rem]">
                    {{ log.level }}
                  </Badge>
                </div>
              </td>
              <td class="max-w-xs truncate px-4 py-4 font-mono text-xs text-slate-600">
                {{ log.target || '—' }}
              </td>
              <td class="px-4 py-4">
                <button
                  v-if="log.hasMetadata"
                  class="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
                  @click="openMetadata(log.id)"
                >
                  View JSON
                </button>
                <span v-else class="text-xs text-slate-400">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>

  <Teleport to="body">
    <div
      v-if="showJsonModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-md"
      @click="closeModal"
    >
      <div
        class="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-[1.75rem] border border-black/10 bg-[#fffaf2] p-6 shadow-[0_25px_70px_rgba(15,23,42,0.18)]"
        role="dialog"
        aria-modal="true"
        @click.stop
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="font-serif text-2xl font-semibold text-slate-950">Event metadata</h3>
            <p class="mt-1 font-mono text-xs text-slate-500">{{ selectedLogId }}</p>
          </div>
          <button
            class="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
            @click="closeModal"
          >
            Close
          </button>
        </div>

        <div class="mt-5 min-h-0 flex-1 overflow-auto rounded-[1.1rem] border border-black/10 bg-slate-950 p-4">
          <div v-if="isLoadingDetail" class="flex justify-center py-10">
            <div class="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
          </div>
          <pre v-else class="font-mono text-xs leading-6 text-emerald-100">{{ JSON.stringify(selectedMetadata, null, 2) }}</pre>
        </div>
      </div>
    </div>
  </Teleport>
</template>
