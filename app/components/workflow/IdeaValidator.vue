<script setup lang="ts">
import type { ResearchSourceFetchStatus } from './ResearchSourceStatusBadge.vue'

type EtsyListingHit = { title: string; url?: string; snippet?: string }
type EtsyThemeMarketplace = {
  themeTitle: string
  query: string
  listingCount: number
  saturation: 'low' | 'medium' | 'high' | 'unknown'
  listings: EtsyListingHit[]
  error?: string
}
type ValidationMarketplaceSnapshot = {
  source: 'etsy'
  fetchedAt: string
  status: ResearchSourceFetchStatus
  message?: string
  provider?: string
  themes: EtsyThemeMarketplace[]
}

const props = defineProps<{
  projectId: string
  project: any
}>()

const emit = defineEmits<{
  (e: 'ready', value: boolean): void
}>()

const winnerCount = ref(5)
const isValidating = ref(false)
const themes = ref<any[]>([])
const savedIdeas = ref<any[]>([])
const selectedWinnerIds = ref<Set<string>>(new Set())
const isSaving = ref(false)
const hasSaved = ref(false)

// Real-API gate toggles. Seeded from user settings + key availability.
const useTrademarkApi = ref(false)
const useBrandRiskApi = ref(false)
const hasRapidapiKey = ref(false)
const hasSerpapiKey = ref(false)
const hasSearchKey = ref(false)

const marketplaceSnapshot = ref<ValidationMarketplaceSnapshot | null>(null)
const etsyByTheme = computed(() => {
  const map = new Map<string, EtsyThemeMarketplace>()
  for (const row of marketplaceSnapshot.value?.themes ?? []) {
    map.set(row.themeTitle, row)
  }
  return map
})

function parseValidationSnapshot(raw: string | null | undefined) {
  if (!raw) return
  try {
    const parsed = JSON.parse(raw) as ValidationMarketplaceSnapshot
    if (parsed.source === 'etsy') marketplaceSnapshot.value = parsed
  } catch {
    // ignore invalid snapshot
  }
}

const saturationLabel: Record<EtsyThemeMarketplace['saturation'], string> = {
  low: 'Low competition',
  medium: 'Moderate competition',
  high: 'Saturated',
  unknown: 'No listings found',
}

// Summary of the last run — populated by /validate/run response.
const lastRun = ref<null | {
  gates: { llm: boolean; trademark: boolean; brandRisk: boolean; etsy?: boolean }
  apiCheckedThemeIds: string[]
  candidateCount: number
  rejectedByApi: number
}>(null)
const apiCheckedIdSet = computed(() => new Set(lastRun.value?.apiCheckedThemeIds ?? []))
const sortedThemes = computed(() =>
  [...themes.value].sort((a, b) => (b.trendScore ?? 0) - (a.trendScore ?? 0)),
)

const scrollerEl = ref<HTMLElement | null>(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)
const modalIndex = ref<number | null>(null)
const modalIdea = computed(() => (modalIndex.value != null ? savedIdeas.value[modalIndex.value] : null))

function updateScrollState() {
  const el = scrollerEl.value
  if (!el) return
  canScrollLeft.value = el.scrollLeft > 4
  canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
}

function scrollBy(dir: 'left' | 'right') {
  const el = scrollerEl.value
  if (!el) return
  el.scrollBy({ left: dir === 'left' ? -el.clientWidth * 0.8 : el.clientWidth * 0.8, behavior: 'smooth' })
}

function openIdea(idx: number) {
  modalIndex.value = idx
}

function closeModal() {
  modalIndex.value = null
}

function prevIdea() {
  if (modalIndex.value == null) return
  modalIndex.value = (modalIndex.value - 1 + savedIdeas.value.length) % savedIdeas.value.length
}

function nextIdea() {
  if (modalIndex.value == null) return
  modalIndex.value = (modalIndex.value + 1) % savedIdeas.value.length
}

function onModalKeydown(e: KeyboardEvent) {
  if (modalIndex.value == null) return
  if (e.key === 'Escape') closeModal()
  else if (e.key === 'ArrowLeft') prevIdea()
  else if (e.key === 'ArrowRight') nextIdea()
}

watch(savedIdeas, () => nextTick(updateScrollState))
onMounted(() => {
  window.addEventListener('keydown', onModalKeydown)
  nextTick(updateScrollState)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onModalKeydown))

// Load defaults and existing validated themes on mount
onMounted(async () => {
  try {
    const settings = await $fetch<any>('/api/settings')
    if (settings.defaultWinnerCount) winnerCount.value = settings.defaultWinnerCount
    hasRapidapiKey.value = !!settings.hasRapidapiKey
    hasSerpapiKey.value = !!settings.hasSerpapiKey
    hasSearchKey.value = !!(
      settings.hasSerperKey || settings.hasSearchapiKey || settings.hasSerpapiKey
    )
    useTrademarkApi.value = !!settings.useTrademarkApi && hasRapidapiKey.value
    useBrandRiskApi.value = !!settings.useBrandRiskApi && hasSerpapiKey.value
  } catch {}
  parseValidationSnapshot(props.project?.validationSnapshot)
  try {
    const data = await $fetch<{ themes: any[] }>(`/api/workflow/${props.projectId}/gather-idea/themes`)
    if (data.themes?.length) {
      // Only show themes that were selected in stage 1
      const selected = data.themes.filter((t: any) => t.isSelected)
      savedIdeas.value = selected
      if (selected.some((t: any) => t.isValidated)) {
        themes.value = selected
        const winners = selected.filter((t: any) => t.isWinner)
        selectedWinnerIds.value = new Set(winners.map((t: any) => t.id))
        if (winners.length > 0) {
          hasSaved.value = true
          emit('ready', true)
        }
      }
    }
  } catch {
    // No themes yet
  }
})

async function runValidation() {
  isValidating.value = true
  hasSaved.value = false
  emit('ready', false)
  try {
    const result = await $fetch(`/api/workflow/${props.projectId}/validate/run`, {
      method: 'POST',
      body: {
        winnerCount: winnerCount.value,
        useTrademarkApi: useTrademarkApi.value,
        useBrandRiskApi: useBrandRiskApi.value,
      },
    })
    themes.value = (result as any).themes
    lastRun.value = (result as any).validation ?? null
    if ((result as any).validation?.marketplace) {
      marketplaceSnapshot.value = (result as any).validation.marketplace
    }
    // Auto-select AI-chosen winners
    selectedWinnerIds.value = new Set(
      themes.value.filter((t: any) => t.isWinner).map((t: any) => t.id),
    )
  } catch (err: any) {
    alert(err.data?.message ?? 'Validation failed')
  } finally {
    isValidating.value = false
  }
}

function toggleWinner(id: string) {
  if (selectedWinnerIds.value.has(id)) {
    selectedWinnerIds.value.delete(id)
  } else {
    selectedWinnerIds.value.add(id)
  }
  selectedWinnerIds.value = new Set(selectedWinnerIds.value)
  hasSaved.value = false
  emit('ready', false)
}

function isSafe(theme: any): boolean {
  return theme.patentSafe && theme.copyrightSafe && theme.trademarkSafe
}

async function saveWinners() {
  if (selectedWinnerIds.value.size === 0) return
  isSaving.value = true
  try {
    await $fetch(`/api/workflow/${props.projectId}/validate/select`, {
      method: 'POST',
      body: { winnerIds: Array.from(selectedWinnerIds.value) },
    })
    hasSaved.value = true
    emit('ready', true)
  } catch (err: any) {
    alert(err.data?.message ?? 'Failed to save winners')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Saved Ideas from Stage 1 -->
    <div v-if="savedIdeas.length > 0" class="space-y-2">
      <h3 class="text-sm font-medium text-muted-foreground">Ideas saved in Stage 1 ({{ savedIdeas.length }})</h3>
      <div class="relative">
        <button
          v-if="canScrollLeft"
          type="button"
          class="absolute left-0 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 -translate-x-2 items-center justify-center rounded-full border bg-background shadow transition-all hover:bg-muted active:scale-95"
          aria-label="Scroll left"
          @click="scrollBy('left')"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          v-if="canScrollRight"
          type="button"
          class="absolute right-0 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 translate-x-2 items-center justify-center rounded-full border bg-background shadow transition-all hover:bg-muted active:scale-95"
          aria-label="Scroll right"
          @click="scrollBy('right')"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div
          ref="scrollerEl"
          class="flex gap-3 overflow-x-auto pb-2 snap-x scroll-smooth"
          @scroll="updateScrollState"
        >
          <button
            v-for="(idea, idx) in savedIdeas"
            :key="idea.id"
            type="button"
            class="w-64 shrink-0 snap-start rounded-lg border bg-muted/30 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow active:scale-[0.99]"
            @click="openIdea(idx)"
          >
            <h4 class="text-sm font-medium line-clamp-2">{{ idea.title }}</h4>
            <p v-if="idea.description" class="mt-1 text-xs text-muted-foreground line-clamp-3">
              {{ idea.description }}
            </p>
            <span v-if="idea.targetDemographic" class="mt-2 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px]">
              {{ idea.targetDemographic }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Idea Modal -->
    <div
      v-if="modalIdea"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="closeModal"
    >
      <div class="relative w-full max-w-xl rounded-xl border bg-background p-6 shadow-lg">
        <button
          type="button"
          class="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted"
          aria-label="Close"
          @click="closeModal"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <p class="text-xs text-muted-foreground">
          Idea {{ (modalIndex ?? 0) + 1 }} of {{ savedIdeas.length }}
        </p>
        <h3 class="mt-1 text-xl font-semibold">{{ modalIdea.title }}</h3>
        <p v-if="modalIdea.description" class="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
          {{ modalIdea.description }}
        </p>
        <div class="mt-4 flex flex-wrap gap-1.5">
          <span v-if="modalIdea.targetDemographic" class="rounded-full bg-muted px-2 py-0.5 text-xs">
            {{ modalIdea.targetDemographic }}
          </span>
        </div>

        <div class="mt-6 flex items-center justify-between">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-all hover:bg-muted active:scale-95 disabled:opacity-50"
            :disabled="savedIdeas.length < 2"
            @click="prevIdea"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-all hover:bg-muted active:scale-95 disabled:opacity-50"
            :disabled="savedIdeas.length < 2"
            @click="nextIdea"
          >
            Next
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Validation mode -->
    <div class="rounded-lg border p-4 space-y-3">
      <div>
        <h3 class="text-sm font-semibold">Validation mode</h3>
        <p class="text-xs text-muted-foreground">
          LLM scoring always runs. Optional real-API gates refine <em>Trademark</em> and <em>Copyright</em> verdicts on top candidates.
        </p>
      </div>
      <div class="grid gap-2 sm:grid-cols-2">
        <label
          class="flex items-start gap-2 rounded-md border p-3 cursor-pointer transition-all hover:bg-muted/40"
          :class="{ 'opacity-50 cursor-not-allowed hover:bg-transparent': !hasRapidapiKey, 'border-primary bg-primary/5': useTrademarkApi && hasRapidapiKey }"
          :title="hasRapidapiKey ? '' : 'Add NUXT_RAPIDAPI_KEY to enable'"
        >
          <input
            v-model="useTrademarkApi"
            type="checkbox"
            :disabled="!hasRapidapiKey"
            class="mt-0.5 h-4 w-4 rounded border"
          />
          <div class="text-sm">
            <div class="font-medium">Trademark check</div>
            <div class="text-xs text-muted-foreground">RapidAPI · USPTO class 025</div>
          </div>
        </label>
        <label
          class="flex items-start gap-2 rounded-md border p-3 cursor-pointer transition-all hover:bg-muted/40"
          :class="{ 'opacity-50 cursor-not-allowed hover:bg-transparent': !hasSerpapiKey, 'border-primary bg-primary/5': useBrandRiskApi && hasSerpapiKey }"
          :title="hasSerpapiKey ? '' : 'Add NUXT_SERPAPI_KEY to enable'"
        >
          <input
            v-model="useBrandRiskApi"
            type="checkbox"
            :disabled="!hasSerpapiKey"
            class="mt-0.5 h-4 w-4 rounded border"
          />
          <div class="text-sm">
            <div class="font-medium">Brand-risk check</div>
            <div class="text-xs text-muted-foreground">SerpAPI · branded-media heuristic</div>
          </div>
        </label>
      </div>
      <p v-if="!useTrademarkApi && !useBrandRiskApi" class="text-xs text-muted-foreground">
        No real-API gates selected — themes will be judged by the LLM only.
      </p>
      <div class="rounded-md border bg-muted/20 px-3 py-2 text-xs space-y-1">
        <div class="flex flex-wrap items-center gap-2">
          <span class="font-medium">Etsy marketplace check</span>
          <ResearchSourceStatusBadge
            :status="hasSearchKey ? 'success' : 'skipped'"
            compact
            :label="hasSearchKey ? 'Search provider ready' : 'No search key'"
          />
        </div>
        <p class="text-muted-foreground">
          Runs automatically on validation via Google search (<code class="text-[0.65rem]">site:etsy.com</code>).
          Uses Serper, SearchAPI, or SerpAPI — same keys as Stage 1 research.
        </p>
      </div>
    </div>

    <!-- Controls -->
    <div class="flex flex-wrap items-end gap-4">
      <div class="space-y-2">
        <label class="text-sm font-medium">Number of Winners</label>
        <input
          v-model.number="winnerCount"
          type="number"
          min="1"
          max="20"
          class="w-32 rounded-lg border bg-background px-3 py-2.5 text-sm"
        />
      </div>
      <button
        class="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        :disabled="isValidating"
        @click="runValidation"
      >
        <svg v-if="isValidating" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {{ isValidating ? 'Validating ideas...' : 'Run Validation' }}
      </button>
    </div>

    <!-- Validated Themes -->
    <div v-if="themes.length > 0" class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">Validated Themes</h3>
        <span class="text-sm text-muted-foreground">{{ selectedWinnerIds.size }} winners selected</span>
      </div>

      <!-- Run summary -->
      <div v-if="lastRun" class="rounded-md border bg-muted/20 px-3 py-2 text-xs space-y-1">
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="text-muted-foreground">Gates run:</span>
          <span v-if="lastRun.gates.llm" class="rounded-full bg-primary/10 text-primary px-2 py-0.5 font-medium">LLM</span>
          <span v-if="lastRun.gates.trademark" class="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 font-medium">Trademark · RapidAPI</span>
          <span v-if="lastRun.gates.brandRisk" class="rounded-full bg-purple-100 text-purple-700 px-2 py-0.5 font-medium">Brand-risk · SerpAPI</span>
          <span v-if="lastRun.gates.etsy" class="rounded-full bg-orange-100 text-orange-800 px-2 py-0.5 font-medium">Etsy · Search</span>
          <span v-if="!lastRun.gates.trademark && !lastRun.gates.brandRisk && !lastRun.gates.etsy" class="text-muted-foreground italic">LLM only</span>
        </div>
        <div v-if="marketplaceSnapshot" class="flex flex-wrap items-center gap-2 text-muted-foreground">
          <ResearchSourceStatusBadge
            :status="marketplaceSnapshot.status"
            label="Etsy"
            :detail="marketplaceSnapshot.provider ? `via ${marketplaceSnapshot.provider}` : marketplaceSnapshot.message"
            compact
          />
        </div>
        <div v-if="lastRun.gates.trademark || lastRun.gates.brandRisk" class="text-muted-foreground">
          {{ lastRun.rejectedByApi }} of {{ lastRun.candidateCount }} candidates rejected by real-API checks
        </div>
      </div>

      <div class="space-y-3">
        <div
          v-for="theme in sortedThemes"
          :key="theme.id"
          class="rounded-lg border p-4 transition-all"
          :class="{
            'border-green-300 bg-green-50': selectedWinnerIds.has(theme.id) && isSafe(theme),
            'border-yellow-300 bg-yellow-50': selectedWinnerIds.has(theme.id) && !isSafe(theme),
            'opacity-60': !selectedWinnerIds.has(theme.id) && !isSafe(theme),
          }"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-start gap-3 flex-1">
              <button
                class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border"
                :class="{
                  'bg-primary border-primary text-primary-foreground': selectedWinnerIds.has(theme.id),
                }"
                @click="toggleWinner(theme.id)"
              >
                <svg v-if="selectedWinnerIds.has(theme.id)" class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
              </button>

              <div class="min-w-0 flex-1">
                <h4 class="font-medium">{{ theme.title }}</h4>
                <p v-if="theme.contextNotes" class="mt-1 text-sm text-muted-foreground">
                  {{ theme.contextNotes }}
                </p>
                <p v-if="theme.validationNotes" class="mt-1 text-xs text-muted-foreground italic">
                  {{ theme.validationNotes }}
                </p>
                <div
                  v-if="etsyByTheme.get(theme.title)"
                  class="mt-2 rounded-md border border-orange-200/80 bg-orange-50/50 px-2.5 py-2 text-xs space-y-1"
                >
                  <div class="flex flex-wrap items-center gap-2 font-medium text-orange-900">
                    <span>Etsy</span>
                    <span class="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                      {{ saturationLabel[etsyByTheme.get(theme.title)!.saturation] }}
                    </span>
                    <span class="font-normal text-orange-800/80">
                      {{ etsyByTheme.get(theme.title)!.listingCount }} listings sampled
                    </span>
                  </div>
                  <ul v-if="etsyByTheme.get(theme.title)!.listings.length" class="space-y-0.5 text-orange-900/90">
                    <li v-for="(listing, li) in etsyByTheme.get(theme.title)!.listings.slice(0, 3)" :key="li" class="line-clamp-1">
                      <a
                        v-if="listing.url"
                        :href="listing.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="underline decoration-orange-300/80 hover:text-orange-950"
                      >
                        {{ listing.title }}
                      </a>
                      <span v-else>{{ listing.title }}</span>
                    </li>
                  </ul>
                  <p v-else-if="etsyByTheme.get(theme.title)!.error" class="text-rose-700">
                    {{ etsyByTheme.get(theme.title)!.error }}
                  </p>
                </div>
                <div class="mt-2 flex flex-wrap gap-1.5">
                  <span v-if="theme.targetDemographic" class="rounded-full bg-muted px-2 py-0.5 text-xs">
                    {{ theme.targetDemographic }}
                  </span>
                </div>
              </div>
            </div>

            <div class="flex flex-col items-end gap-1.5 shrink-0">
              <!-- Trend Score -->
              <div class="text-right">
                <div class="text-xs text-muted-foreground">Score</div>
                <div class="text-lg font-bold" :class="{ 'text-green-600': theme.trendScore >= 0.7, 'text-yellow-600': theme.trendScore >= 0.4 && theme.trendScore < 0.7, 'text-red-600': theme.trendScore < 0.4 }">
                  {{ (theme.trendScore * 100).toFixed(0) }}
                </div>
              </div>

              <!-- IP Safety Badges -->
              <div class="flex gap-1">
                <span class="rounded px-1.5 py-0.5 text-xs font-medium" :class="theme.patentSafe ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                  Pat {{ theme.patentSafe ? '&#10003;' : '&#10007;' }}
                </span>
                <span
                  class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium"
                  :class="theme.copyrightSafe ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
                  :title="lastRun?.gates.brandRisk && apiCheckedIdSet.has(theme.id) ? 'Verified by SerpAPI brand-risk check' : 'LLM-only verdict'"
                >
                  Copy {{ theme.copyrightSafe ? '&#10003;' : '&#10007;' }}
                  <svg v-if="lastRun?.gates.brandRisk && apiCheckedIdSet.has(theme.id)" class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clip-rule="evenodd" />
                  </svg>
                </span>
                <span
                  class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium"
                  :class="theme.trademarkSafe ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
                  :title="lastRun?.gates.trademark && apiCheckedIdSet.has(theme.id) ? 'Verified by RapidAPI USPTO trademark check' : 'LLM-only verdict'"
                >
                  TM {{ theme.trademarkSafe ? '&#10003;' : '&#10007;' }}
                  <svg v-if="lastRun?.gates.trademark && apiCheckedIdSet.has(theme.id)" class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clip-rule="evenodd" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Save Winners -->
      <div class="flex items-center gap-3">
        <button
          class="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          :disabled="selectedWinnerIds.size === 0 || isSaving"
          @click="saveWinners"
        >
          {{ isSaving ? 'Saving...' : `Save Winners (${selectedWinnerIds.size})` }}
        </button>
        <span v-if="hasSaved" class="inline-flex items-center gap-1 text-sm text-green-600">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Winners saved
        </span>
      </div>
    </div>
  </div>
</template>
