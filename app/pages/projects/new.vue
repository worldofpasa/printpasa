<script setup lang="ts">
const { createProject, isLoading } = useProject()
const router = useRouter()

const form = reactive({
  name: '',
  description: '',
})

const launchModes = [
  {
    title: 'Trend-led drop',
    description: 'Start with a timely niche, then generate ideas from active signals and short-form references.',
    preset: 'Quick-turn collection focused on a current trend and fast validation.',
  },
  {
    title: 'Evergreen niche',
    description: 'Build a slower, durable pipeline around a stable audience and repeated demand pattern.',
    preset: 'Evergreen collection designed for repeatable ideas and long-tail product testing.',
  },
  {
    title: 'Campaign sprint',
    description: 'Frame the project around a release, season, event, or micro-campaign you want to ship quickly.',
    preset: 'Campaign-focused sprint with clear deadlines, tighter theme choices, and faster publishing.',
  },
] as const

const slugPreview = computed(() => {
  const name = form.name.trim()
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
})

function applyLaunchMode(preset: string) {
  form.description = preset
}

async function handleSubmit() {
  if (!form.name.trim()) return

  const project = await createProject({
    name: form.name.trim(),
    description: form.description.trim() || undefined,
  })

  if (project) {
    router.push(`/projects/${project.slug}/stage/gather-idea`)
  }
}
</script>

<template>
  <div class="grid gap-6 xl:grid-cols-[minmax(20rem,0.88fr)_minmax(0,1.12fr)]">
    <section class="overflow-hidden rounded-[2rem] border border-black/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.96),rgba(30,41,59,0.92)_40%,rgba(120,53,15,0.86))] px-6 py-7 text-white shadow-[0_28px_80px_rgba(15,23,42,0.22)] sm:px-8">
      <button class="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-white" @click="router.back()">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back to dashboard
      </button>

      <div class="mt-8 space-y-4">
        <p class="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/80">New pipeline</p>
        <h1 class="max-w-lg font-serif text-4xl font-semibold leading-tight sm:text-5xl">
          Start a project with a clearer brief and a faster runway into Stage 1.
        </h1>
        <p class="max-w-xl text-sm leading-7 text-slate-200/90 sm:text-base">
          Project creation should feel like opening a production lane, not just filling a form. Use a launch mode for momentum, then shape the details in the workflow.
        </p>
      </div>

      <div class="mt-8 space-y-3">
        <div
          v-for="mode in launchModes"
          :key="mode.title"
          class="rounded-[1.5rem] border border-white/10 bg-white/8 p-4 backdrop-blur-sm"
        >
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="space-y-2">
              <h2 class="text-lg font-semibold">{{ mode.title }}</h2>
              <p class="text-sm leading-6 text-slate-300">{{ mode.description }}</p>
            </div>
            <button
              class="shrink-0 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-white/20"
              @click="applyLaunchMode(mode.preset)"
            >
              Use brief
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-[2rem] border border-black/10 bg-white/82 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-8">
      <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Project setup</p>
          <h2 class="mt-2 font-serif text-3xl font-semibold text-slate-950">Define the pipeline</h2>
          <p class="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Give the project a clear name, then describe the commercial angle, niche, or release context you want the workflow to optimize around.
          </p>
        </div>

        <div v-if="slugPreview" class="rounded-[1.25rem] border border-dashed border-black/10 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
          <p class="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-400">URL slug</p>
          <p class="mt-2 font-medium text-slate-950">/projects/{{ slugPreview }}</p>
        </div>
      </div>

      <form class="mt-8 space-y-5" @submit.prevent="handleSubmit">
        <div class="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div class="space-y-2">
            <label class="text-sm font-medium text-slate-700" for="name">Project name</label>
            <input
              id="name"
              v-model="form.name"
              type="text"
              placeholder="March tournament capsule, gamer drop, spring moms line..."
              class="flex w-full rounded-[1.25rem] border border-black/10 bg-white px-4 py-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-950 focus:outline-none"
              required
            />
          </div>

          <div class="rounded-[1.25rem] border border-black/10 bg-slate-50/80 px-4 py-4">
            <p class="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Good naming</p>
            <p class="mt-3 text-sm leading-6 text-slate-600">
              Keep it short enough to scan on the dashboard, but specific enough that you know the target market at a glance.
            </p>
          </div>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700" for="description">Commercial brief</label>
          <textarea
            id="description"
            v-model="form.description"
            placeholder="Describe the audience, design mood, event timing, or commercial goal for this pipeline."
            rows="6"
            class="flex w-full resize-none rounded-[1.5rem] border border-black/10 bg-white px-4 py-4 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-950 focus:outline-none"
          />
          <p class="text-xs leading-5 text-slate-500">
            This can be lightweight. You can refine the real brief during Gather Idea.
          </p>
        </div>

        <div class="rounded-[1.5rem] border border-black/10 bg-slate-950 px-5 py-5 text-white">
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">What happens next</p>
          <div class="mt-4 grid gap-3 sm:grid-cols-3">
            <div class="rounded-[1.25rem] border border-white/10 bg-white/6 p-4">
              <p class="text-sm font-semibold">1. Gather Idea</p>
              <p class="mt-2 text-xs leading-5 text-slate-300">Set the niche and generate a shortlist of strong themes.</p>
            </div>
            <div class="rounded-[1.25rem] border border-white/10 bg-white/6 p-4">
              <p class="text-sm font-semibold">2. Validate</p>
              <p class="mt-2 text-xs leading-5 text-slate-300">Filter for safer, more commercially viable directions.</p>
            </div>
            <div class="rounded-[1.25rem] border border-white/10 bg-white/6 p-4">
              <p class="text-sm font-semibold">3. Build assets</p>
              <p class="mt-2 text-xs leading-5 text-slate-300">Generate imagery, optimize it, and map it to products.</p>
            </div>
          </div>
        </div>

        <div class="flex flex-col-reverse gap-3 border-t border-black/10 pt-5 sm:flex-row sm:justify-between">
          <button
            type="button"
            class="rounded-full border border-black/10 px-5 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            @click="router.back()"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="!form.name.trim() || isLoading"
            class="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-50"
          >
            {{ isLoading ? 'Creating project...' : 'Create pipeline' }}
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </form>
    </section>
  </div>
</template>
