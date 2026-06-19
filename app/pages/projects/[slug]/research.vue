<script setup lang="ts">
import ResearchSourceStatusBadge from '~/components/workflow/ResearchSourceStatusBadge.vue'
import Tabs from '~/components/ui/tabs/Tabs.vue'
import TabsContent from '~/components/ui/tabs/TabsContent.vue'
import TabsList from '~/components/ui/tabs/TabsList.vue'
import TabsTrigger from '~/components/ui/tabs/TabsTrigger.vue'

type ResearchSignal = {
  label: string
  source: string
  query: string
  title: string
  detail?: string
  score?: number
  url?: string
  error?: string
}

type SourceStatus = {
  source: string
  displayName: string
  status: 'success' | 'partial' | 'failed' | 'skipped'
  message?: string
  signalCount: number
}

type ResearchSnapshot = {
  ideaDescription?: string
  plan?: {
    projectTitle?: string
    inferredAudience?: string
    subreddits?: string[]
    keywords?: {
      google?: string[]
      pinterest?: string[]
      tiktok?: string[]
    }
  }
  signals?: ResearchSignal[]
  sourceStatuses?: SourceStatus[]
  warnings?: string[]
  fetchedAt?: string
}

const route = useRoute()
const projectSlug = computed(() => route.params.slug as string)
const { project, isLoading } = useProject(projectSlug)
const { user } = useUserSession()

const SOURCE_ORDER = ['reddit', 'google-trends', 'pinterest', 'tiktok']

const sourceLabels: Record<string, string> = {
  reddit: 'Reddit',
  'google-trends': 'Google Trends',
  pinterest: 'Pinterest',
  tiktok: 'TikTok',
}

function sourceStatusDetail(status: SourceStatus): string | undefined {
  if (status.message) return status.message
  if (status.signalCount > 0) return `${status.signalCount} signals`
  return undefined
}

const snapshot = computed<ResearchSnapshot | null>(() => {
  const raw = project.value?.researchSnapshot
  if (!raw) return null
  try {
    return JSON.parse(raw) as ResearchSnapshot
  } catch {
    return null
  }
})

const plannedQueries = computed(() => {
  const plan = snapshot.value?.plan
  if (!plan) return []
  return [
    { label: 'Subreddits', items: (plan.subreddits ?? []).map(s => `r/${s.replace(/^r\//, '')}`) },
    { label: 'Google Trends keywords', items: plan.keywords?.google ?? [] },
    { label: 'Pinterest keywords', items: plan.keywords?.pinterest ?? [] },
    { label: 'TikTok keywords', items: plan.keywords?.tiktok ?? [] },
  ].filter(group => group.items.length > 0)
})

const sourceTabs = computed(() => {
  const signals = snapshot.value?.signals ?? []
  const statuses = snapshot.value?.sourceStatuses ?? []
  return SOURCE_ORDER.map((source) => ({
    source,
    label: sourceLabels[source] ?? source,
    status: statuses.find(s => s.source === source) ?? null,
    signals: signals.filter(s => s.source === source),
  }))
})

const activeSourceTab = ref(SOURCE_ORDER[0])

watch(sourceTabs, (tabs) => {
  if (!tabs.some(tab => tab.source === activeSourceTab.value)) {
    activeSourceTab.value = tabs[0]?.source ?? SOURCE_ORDER[0]
  }
})

const totalSignals = computed(() => (snapshot.value?.signals ?? []).length)

const fetchedAtLabel = computed(() => {
  const fetchedAt = snapshot.value?.fetchedAt
  return fetchedAt ? new Date(fetchedAt).toLocaleString() : null
})
</script>

<template>
  <div v-if="isLoading" class="flex items-center justify-center py-20">
    <div class="h-10 w-10 animate-spin rounded-full border-4 border-slate-950 border-t-transparent" />
  </div>

  <div v-else-if="project" class="mx-auto max-w-5xl space-y-6 pb-16">
    <section class="space-y-4">
      <NuxtLink
        :to="`/projects/${project.slug}/stage/${project.currentStage}`"
        class="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-950"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back to workflow
      </NuxtLink>

      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="space-y-2">
          <p class="eyebrow">Idea research</p>
          <h1 class="font-serif text-4xl font-semibold tracking-tight text-slate-950">{{ project.name }}</h1>
          <p v-if="fetchedAtLabel" class="text-sm text-slate-500">
            Researched {{ fetchedAtLabel }} · {{ totalSignals }} signal{{ totalSignals === 1 ? '' : 's' }}
          </p>
        </div>

        <NuxtLink
          v-if="user?.isSuperuser"
          :to="{ path: '/audit-logs', query: { projectId: project.id } }"
          class="text-sm font-medium text-slate-500 underline underline-offset-4 transition-colors hover:text-slate-950"
        >
          View run history
        </NuxtLink>
      </div>
    </section>

    <section v-if="!snapshot" class="surface-card p-8 text-center">
      <h2 class="font-serif text-2xl font-semibold text-slate-950">No research yet</h2>
      <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
        This project has no research snapshot. Generate ideas in Stage 1 to research Reddit, Google Trends, Pinterest, and TikTok.
      </p>
      <NuxtLink
        :to="`/projects/${project.slug}/stage/gather-idea`"
        class="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-950/90 active:scale-95"
      >
        Go to Stage 1
      </NuxtLink>
    </section>

    <template v-else>
      <section class="surface-card p-5 sm:p-6">
        <p class="eyebrow">Research plan</p>
        <h2 class="mt-2 font-serif text-2xl font-semibold text-slate-950">
          {{ snapshot.plan?.projectTitle || project.name }}
        </h2>

        <dl class="mt-4 space-y-4">
          <div v-if="snapshot.ideaDescription">
            <dt class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Idea brief</dt>
            <dd class="mt-1 text-sm leading-6 text-slate-700">{{ snapshot.ideaDescription }}</dd>
          </div>
          <div v-if="snapshot.plan?.inferredAudience">
            <dt class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Inferred audience</dt>
            <dd class="mt-1 text-sm leading-6 text-slate-700">{{ snapshot.plan.inferredAudience }}</dd>
          </div>
        </dl>

        <div v-if="plannedQueries.length > 0" class="mt-5 grid gap-4 sm:grid-cols-2">
          <div
            v-for="group in plannedQueries"
            :key="group.label"
            class="rounded-[1.25rem] border border-black/10 bg-slate-50/80 p-4"
          >
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{{ group.label }}</p>
            <div class="mt-2 flex flex-wrap gap-1.5">
              <span
                v-for="item in group.items"
                :key="item"
                class="rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
              >
                {{ item }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section v-if="snapshot.warnings?.length" class="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Warnings</p>
        <ul class="mt-2 space-y-1">
          <li v-for="(warning, idx) in snapshot.warnings" :key="idx" class="text-sm leading-6 text-amber-800">
            {{ warning }}
          </li>
        </ul>
      </section>

      <section class="surface-card p-5 sm:p-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="font-serif text-2xl font-semibold text-slate-950">Research signals</h2>
          <p class="text-sm text-slate-500">
            {{ totalSignals }} signal{{ totalSignals === 1 ? '' : 's' }} across {{ sourceTabs.length }} sources
          </p>
        </div>

        <div v-if="snapshot.sourceStatuses?.length" class="mt-4 flex flex-wrap gap-2">
          <ResearchSourceStatusBadge
            v-for="status in snapshot.sourceStatuses"
            :key="status.source"
            :status="status.status"
            :label="status.displayName"
            :detail="sourceStatusDetail(status)"
            compact
          />
        </div>

        <Tabs v-model="activeSourceTab" class="mt-4 space-y-4">
          <TabsList class="w-full justify-start overflow-x-auto">
            <TabsTrigger
              v-for="group in sourceTabs"
              :key="group.source"
              :value="group.source"
              class="gap-1.5"
            >
              <ResearchSourceStatusBadge
                v-if="group.status"
                icon-only
                :status="group.status.status"
              />
              {{ group.label }}
              <span class="text-xs opacity-70">({{ group.signals.length }})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent
            v-for="group in sourceTabs"
            :key="group.source"
            :value="group.source"
            class="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex flex-wrap items-center gap-3">
                <h3 class="font-serif text-xl font-semibold text-slate-950">{{ group.label }}</h3>
                <ResearchSourceStatusBadge
                  v-if="group.status"
                  :status="group.status.status"
                  :label="group.status.displayName"
                  :detail="sourceStatusDetail(group.status)"
                />
              </div>
              <p class="text-sm text-slate-500">
                {{ group.signals.length }} signal{{ group.signals.length === 1 ? '' : 's' }}
              </p>
            </div>

            <p v-if="group.status?.message" class="mt-2 text-sm leading-6 text-slate-600">
              {{ group.status.message }}
            </p>

            <ul v-if="group.signals.length > 0" class="mt-4 space-y-2">
              <li
                v-for="(signal, index) in group.signals"
                :key="`${signal.label}-${index}`"
                class="rounded-[1rem] border border-black/10 bg-slate-50/80 px-4 py-3 text-sm"
              >
                <div class="flex flex-wrap items-baseline gap-x-2">
                  <span class="font-semibold text-slate-950">{{ signal.label }}</span>
                  <span class="text-xs text-slate-500">searched: {{ signal.query }}</span>
                  <span v-if="signal.score != null" class="text-xs text-slate-500">score: {{ signal.score }}</span>
                </div>
                <p class="mt-1 leading-6 text-slate-700">{{ signal.title }}</p>
                <p v-if="signal.detail" class="mt-0.5 text-xs leading-5 text-slate-500">{{ signal.detail }}</p>
                <p v-if="signal.error" class="mt-0.5 text-xs leading-5 text-rose-600">{{ signal.error }}</p>
                <a
                  v-if="signal.url"
                  :href="signal.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="mt-1 inline-block text-xs text-slate-500 underline underline-offset-2 transition-colors hover:text-slate-950"
                >
                  View source
                </a>
              </li>
            </ul>

            <p v-else class="mt-4 text-sm leading-6 text-slate-500">
              No signals from this source{{ group.status?.message ? '.' : ' yet.' }}
            </p>
          </TabsContent>
        </Tabs>
      </section>
    </template>
  </div>
</template>
