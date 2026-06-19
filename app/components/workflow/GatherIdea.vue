<script setup lang="ts">
type ThemeItem = {
  id: string
  title: string
  description: string
  targetDemographic?: string | null
  isSelected?: boolean
}

type SourceStatus = {
  source: string
  displayName: string
  status: 'success' | 'partial' | 'failed' | 'skipped'
  message?: string
  signalCount: number
}

const props = defineProps<{
  projectId: string
  project: any
}>()

const emit = defineEmits<{
  (e: 'ready', value: boolean): void
}>()

const ideaDescription = ref(props.project?.description ?? '')
const themeCount = ref(props.project?.themeCount ?? 10)

const themes = ref<ThemeItem[]>([])
const selectedIds = ref<Set<string>>(new Set())
const researchSignalCount = ref(0)
const sourceStatuses = ref<SourceStatus[]>([])
const researchWarnings = ref<string[]>([])

const isGenerating = ref(false)
const isSaving = ref(false)
const isLoadingThemes = ref(false)
const hasSaved = ref(false)
const generatingPhase = ref('')

const errorMessage = ref('')
const infoMessage = ref('')

const canGenerate = computed(() => ideaDescription.value.trim().length >= 10 && !isGenerating.value)
const selectedThemes = computed(() => themes.value.filter(theme => selectedIds.value.has(theme.id)))
const hasUnsavedSelection = computed(() => selectedIds.value.size > 0 && !hasSaved.value)

const readinessLabel = computed(() => {
  if (hasSaved.value && selectedIds.value.size > 0) return 'Shortlist saved and ready for validation'
  if (selectedIds.value.size > 0) return 'Selection changed, save to lock the shortlist'
  if (themes.value.length > 0) return 'Generated ideas ready for curation'
  if (ideaDescription.value.trim().length < 10) return 'Describe your product idea (at least 10 characters)'
  return 'Ready to research and generate theme options'
})

function sourceStatusDetail(status: SourceStatus): string | undefined {
  if (status.message) return status.message
  if (status.signalCount > 0) return `${status.signalCount} signals`
  return undefined
}

watch(hasSaved, (saved) => {
  emit('ready', saved && selectedIds.value.size > 0)
})

function clearMessages() {
  errorMessage.value = ''
  infoMessage.value = ''
}

function parseResearchSnapshot(raw: string | null | undefined) {
  if (!raw) return
  try {
    const parsed = JSON.parse(raw) as {
      signals?: unknown[]
      sourceStatuses?: SourceStatus[]
      warnings?: string[]
    }
    if (parsed.sourceStatuses?.length) sourceStatuses.value = parsed.sourceStatuses
    if (parsed.warnings?.length) researchWarnings.value = parsed.warnings
    if (parsed.signals?.length) researchSignalCount.value = parsed.signals.length
  } catch {
    // ignore invalid snapshot
  }
}

async function loadThemes() {
  isLoadingThemes.value = true
  try {
    const data = await $fetch<{ themes: ThemeItem[] }>(`/api/workflow/${props.projectId}/gather-idea/themes`)
    themes.value = data.themes ?? []

    const selected = themes.value.filter(theme => theme.isSelected)
    selectedIds.value = new Set(selected.map(theme => theme.id))

    if (selected.length > 0) {
      hasSaved.value = true
      emit('ready', true)
    }
  } catch {
    themes.value = []
  } finally {
    isLoadingThemes.value = false
  }
}

onMounted(async () => {
  try {
    const settings = await $fetch<any>('/api/settings')
    if (settings.defaultThemeCount) themeCount.value = settings.defaultThemeCount
  } catch {
    // ignore
  }

  parseResearchSnapshot(props.project?.researchSnapshot)
  await loadThemes()
})

async function generate() {
  if (!canGenerate.value) return

  isGenerating.value = true
  hasSaved.value = false
  emit('ready', false)
  clearMessages()
  generatingPhase.value = 'Planning research and fetching signals…'

  try {
    const result = await $fetch<{
      themes: ThemeItem[]
      count: number
      research?: {
        title: string
        signals: unknown[]
        sourceStatuses?: SourceStatus[]
        warnings?: string[]
      }
    }>(`/api/workflow/${props.projectId}/gather-idea/generate`, {
      method: 'POST',
      body: {
        ideaDescription: ideaDescription.value.trim(),
        count: themeCount.value,
      },
    })

    generatingPhase.value = 'Generating themes…'

    if (result.research) {
      researchSignalCount.value = result.research.signals?.length ?? 0
      sourceStatuses.value = result.research.sourceStatuses ?? []
      researchWarnings.value = result.research.warnings ?? []
    }

    await loadThemes()
    hasSaved.value = false
    const failedSources = sourceStatuses.value.filter(s => s.status === 'failed').length
    const warnSuffix = failedSources > 0
      ? ` (${failedSources} source${failedSources === 1 ? '' : 's'} failed — themes still generated from available data.)`
      : ''
    infoMessage.value = `Generated ${themes.value.length} theme option${themes.value.length === 1 ? '' : 's'}.${warnSuffix} Save your shortlist when ready.`
  } catch (err: any) {
    errorMessage.value = err.data?.message ?? err.statusMessage ?? 'Failed to generate themes'
  } finally {
    isGenerating.value = false
    generatingPhase.value = ''
  }
}

function toggleSelect(id: string) {
  clearMessages()

  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }

  selectedIds.value = new Set(selectedIds.value)
  hasSaved.value = false
  emit('ready', false)
}

function selectAll() {
  clearMessages()
  selectedIds.value = new Set(themes.value.map(theme => theme.id))
  hasSaved.value = false
  emit('ready', false)
}

function clearSelection() {
  clearMessages()
  selectedIds.value = new Set()
  hasSaved.value = false
  emit('ready', false)
}

async function saveSelection() {
  if (selectedIds.value.size === 0) return

  isSaving.value = true
  clearMessages()

  try {
    await $fetch(`/api/workflow/${props.projectId}/gather-idea/select`, {
      method: 'POST',
      body: { themeIds: Array.from(selectedIds.value) },
    })
    hasSaved.value = true
    infoMessage.value = 'Shortlist saved. You can continue to Idea Validator.'
    emit('ready', true)
  } catch (err: any) {
    errorMessage.value = err.data?.message ?? 'Failed to save selection'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="space-y-8">
    <div class="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
      <section class="rounded-[1.75rem] border border-black/10 bg-[#fffaf2] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Creative brief</p>
            <h3 class="mt-2 font-serif text-2xl font-semibold text-slate-950">Describe your product idea.</h3>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              We research Reddit, Google Trends, Pinterest, and TikTok, then generate theme options grounded in real signals.
            </p>
          </div>

          <button
            class="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-50"
            :disabled="!canGenerate"
            @click="generate"
          >
            <svg v-if="isGenerating" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ isGenerating ? 'Researching…' : 'Generate Theme Ideas' }}
          </button>
        </div>

        <div v-if="isGenerating && generatingPhase" class="mt-4 text-sm text-slate-500">
          {{ generatingPhase }}
        </div>

        <div class="mt-6 grid gap-4 md:grid-cols-[1fr_auto]">
          <div class="space-y-2 md:col-span-2">
            <label class="text-sm font-medium text-slate-700">Idea description</label>
            <textarea
              v-model="ideaDescription"
              placeholder="e.g. Ultimate packing checklist for new dads — diaper bag essentials, hospital go-bag humor, first-time parent identity"
              rows="6"
              class="flex w-full resize-y rounded-[1.25rem] border border-black/10 bg-white px-4 py-4 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-950 focus:outline-none"
            />
            <p class="text-xs text-slate-500">{{ ideaDescription.trim().length }} characters (minimum 10)</p>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-slate-700">Theme count</label>
            <input
              v-model.number="themeCount"
              type="number"
              min="1"
              max="50"
              class="flex w-full rounded-[1.15rem] border border-black/10 bg-white px-4 py-3 text-sm text-slate-950 focus:border-slate-950 focus:outline-none"
            />
          </div>
        </div>

        <div
          v-if="sourceStatuses.length > 0 || researchSignalCount > 0 || researchWarnings.length > 0"
          class="mt-5 rounded-[1.5rem] border border-black/10 bg-white p-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div v-if="sourceStatuses.length > 0" class="flex flex-wrap gap-2">
              <ResearchSourceStatusBadge
                v-for="status in sourceStatuses"
                :key="status.source"
                :status="status.status"
                :label="status.displayName"
                :detail="sourceStatusDetail(status)"
                compact
              />
            </div>
            <NuxtLink
              v-if="props.project?.slug && researchSignalCount > 0"
              :to="`/projects/${props.project.slug}/research`"
              class="shrink-0 text-xs font-semibold text-slate-600 underline underline-offset-2 transition-colors hover:text-slate-950"
            >
              View {{ researchSignalCount }} signals →
            </NuxtLink>
          </div>

          <div v-if="researchWarnings.length > 0" class="mt-3 space-y-1">
            <p
              v-for="(warning, idx) in researchWarnings"
              :key="idx"
              class="text-xs leading-5 text-amber-700"
            >
              {{ warning }}
            </p>
          </div>
        </div>
      </section>

      <aside class="space-y-4 xl:sticky xl:top-28 xl:self-start">
        <section class="rounded-[1.75rem] border border-black/10 bg-slate-950 p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">Stage status</p>
          <h3 class="mt-2 text-xl font-semibold">{{ readinessLabel }}</h3>

          <div class="mt-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div class="rounded-[1.25rem] border border-white/10 bg-white/6 px-4 py-3">
              <p class="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Options</p>
              <p class="mt-2 text-2xl font-semibold">{{ themes.length }}</p>
            </div>
            <div class="rounded-[1.25rem] border border-white/10 bg-white/6 px-4 py-3">
              <p class="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Selected</p>
              <p class="mt-2 text-2xl font-semibold">{{ selectedIds.size }}</p>
            </div>
            <div class="rounded-[1.25rem] border border-white/10 bg-white/6 px-4 py-3">
              <p class="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Signals</p>
              <p class="mt-2 text-2xl font-semibold">{{ researchSignalCount }}</p>
            </div>
          </div>
        </section>

        <section class="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Shortlist</p>
              <h3 class="mt-2 text-lg font-semibold text-slate-950">
                {{ selectedIds.size > 0 ? `${selectedIds.size} selected` : 'No themes selected yet' }}
              </h3>
            </div>
            <div
              class="rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em]"
              :class="hasSaved ? 'bg-emerald-100 text-emerald-700' : hasUnsavedSelection ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'"
            >
              {{ hasSaved ? 'Saved' : hasUnsavedSelection ? 'Unsaved' : 'Waiting' }}
            </div>
          </div>

          <div v-if="selectedThemes.length > 0" class="mt-4 space-y-2">
            <div
              v-for="theme in selectedThemes.slice(0, 4)"
              :key="theme.id"
              class="rounded-[1.1rem] border border-black/10 bg-slate-50/80 px-3 py-3"
            >
              <p class="text-sm font-semibold text-slate-950">{{ theme.title }}</p>
              <p class="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{{ theme.description }}</p>
            </div>
            <p v-if="selectedThemes.length > 4" class="text-xs font-medium text-slate-500">
              +{{ selectedThemes.length - 4 }} more selected themes
            </p>
          </div>
          <p v-else class="mt-4 text-sm leading-6 text-slate-600">
            Pick the strongest directions from the generated pool, then save them before moving forward.
          </p>

          <div class="mt-5 flex flex-col gap-3">
            <button
              class="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-50"
              :disabled="selectedIds.size === 0 || isSaving"
              @click="saveSelection"
            >
              {{ isSaving ? 'Saving shortlist...' : `Save shortlist (${selectedIds.size})` }}
            </button>

            <div class="flex flex-wrap gap-2">
              <button
                class="rounded-full border border-black/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 transition-colors hover:bg-slate-100"
                :disabled="themes.length === 0"
                @click="selectAll"
              >
                Select all
              </button>
              <button
                class="rounded-full border border-black/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 transition-colors hover:bg-slate-100"
                :disabled="selectedIds.size === 0"
                @click="clearSelection"
              >
                Clear
              </button>
            </div>
          </div>
        </section>
      </aside>
    </div>

    <div v-if="errorMessage" class="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-700">
      {{ errorMessage }}
    </div>

    <div v-else-if="infoMessage" class="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm leading-6 text-emerald-700">
      {{ infoMessage }}
    </div>

    <section
      v-if="themes.length > 0"
      class="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
    >
      <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Theme options</p>
          <h3 class="mt-2 font-serif text-2xl font-semibold text-slate-950">Compare, curate, and save the strongest directions.</h3>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span>{{ themes.length }} generated</span>
          <span class="text-slate-300">•</span>
          <span>{{ selectedIds.size }} selected</span>
        </div>
      </div>

      <div class="mt-6 grid gap-4 md:grid-cols-2">
        <button
          v-for="theme in themes"
          :key="theme.id"
          class="group rounded-[1.5rem] border p-5 text-left transition-all duration-200"
          :class="selectedIds.has(theme.id)
            ? 'border-slate-950 bg-slate-950 text-white shadow-[0_18px_40px_rgba(15,23,42,0.12)]'
            : 'border-black/10 bg-[#fffaf2] hover:-translate-y-0.5 hover:border-slate-950/20 hover:bg-white'"
          @click="toggleSelect(theme.id)"
        >
          <div class="flex items-start gap-4">
            <div
              class="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs"
              :class="selectedIds.has(theme.id)
                ? 'border-white/20 bg-white/10 text-white'
                : 'border-black/10 bg-white text-slate-500'"
            >
              <svg v-if="selectedIds.has(theme.id)" class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h4 class="font-semibold leading-6">{{ theme.title }}</h4>
                  <p class="mt-2 text-sm leading-6" :class="selectedIds.has(theme.id) ? 'text-slate-200' : 'text-slate-600'">
                    {{ theme.description }}
                  </p>
                </div>
                <span
                  class="inline-flex rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em]"
                  :class="selectedIds.has(theme.id)
                    ? 'bg-white/10 text-slate-200'
                    : 'bg-white text-slate-500'"
                >
                  {{ selectedIds.has(theme.id) ? 'Selected' : 'Available' }}
                </span>
              </div>

              <div class="mt-4 flex flex-wrap gap-2">
                <span
                  v-if="theme.targetDemographic"
                  class="inline-flex rounded-full px-3 py-1 text-xs font-medium"
                  :class="selectedIds.has(theme.id)
                    ? 'bg-white/10 text-slate-100'
                    : 'bg-slate-100 text-slate-600'"
                >
                  {{ theme.targetDemographic }}
                </span>
              </div>
            </div>
          </div>
        </button>
      </div>
    </section>

    <section
      v-else-if="!isLoadingThemes"
      class="rounded-[1.75rem] border border-dashed border-black/10 bg-white/75 px-6 py-14 text-center shadow-[0_18px_40px_rgba(15,23,42,0.05)]"
    >
      <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">No ideas yet</p>
      <h3 class="mt-3 font-serif text-3xl font-semibold text-slate-950">Describe your idea and generate themes.</h3>
      <p class="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        We research Reddit, Google Trends, Pinterest, and TikTok in parallel, then generate theme options grounded in those signals.
      </p>
    </section>
  </div>
</template>
