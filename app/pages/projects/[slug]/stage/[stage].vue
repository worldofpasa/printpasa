<script setup lang="ts">
import Badge from '~/components/ui/badge/Badge.vue'
import Button from '~/components/ui/button/Button.vue'
import Input from '~/components/ui/input/Input.vue'
import Progress from '~/components/ui/progress/Progress.vue'
import Textarea from '~/components/ui/textarea/Textarea.vue'
import { WORKFLOW_STAGES, STAGE_LABELS, STAGE_DESCRIPTIONS, STAGE_INDEX, type WorkflowStage } from '~~/shared/types/workflow'
import GatherIdea from '~/components/workflow/GatherIdea.vue'
import IdeaValidator from '~/components/workflow/IdeaValidator.vue'
import ImagePrompts from '~/components/workflow/ImagePrompts.vue'
import ImageGenerate from '~/components/workflow/ImageGenerate.vue'
import ImageOptimization from '~/components/workflow/ImageOptimization.vue'
import ProductPlacement from '~/components/workflow/ProductPlacement.vue'
import ManualReview from '~/components/workflow/ManualReview.vue'

const route = useRoute()
const projectSlug = computed(() => route.params.slug as string)
const currentStage = computed(() => route.params.stage as WorkflowStage)

const { project, isLoading: projectLoading, fetchProject, updateProject } = useProject(projectSlug)
const projectId = computed(() => project.value?.id ?? '')
const projectMaxStage = computed(() => project.value?.currentStage)
const projectStatus = computed(() => project.value?.status)
const isArchived = computed(() => projectStatus.value === 'archived')
const workflow = useWorkflow(projectId, projectSlug, projectMaxStage, projectStatus)

const stageReady = ref(false)
const showForkModal = ref(false)
const forkName = ref('')
const isForking = ref(false)
const isArchiving = ref(false)

const stageComponents: Record<WorkflowStage, any> = {
  'gather-idea': GatherIdea,
  'idea-validator': IdeaValidator,
  'image-prompts': ImagePrompts,
  'image-generate': ImageGenerate,
  'image-optimization': ImageOptimization,
  'product-placement': ProductPlacement,
  'manual-review': ManualReview,
}

const stageComponent = computed(() => stageComponents[currentStage.value])
const hasPrev = computed(() => STAGE_INDEX[currentStage.value] > 0)
const hasNext = computed(() => STAGE_INDEX[currentStage.value] < WORKFLOW_STAGES.length - 1)
const stageProgress = computed(() => Math.round(((STAGE_INDEX[currentStage.value] + 1) / WORKFLOW_STAGES.length) * 100))

const stageStatusText = computed(() => {
  if (isArchived.value) return 'Archived — view only'
  if (projectStatus.value === 'completed') return 'Pipeline completed'
  if (stageReady.value) return 'Ready to continue'
  return 'Action required in this stage'
})

watch(currentStage, (stage) => {
  if (WORKFLOW_STAGES.includes(stage)) {
    workflow.currentStage.value = stage
    stageReady.value = false
  }
}, { immediate: true })

function openForkModal() {
  forkName.value = `${project.value?.name} (Fork)`
  showForkModal.value = true
}

async function confirmFork() {
  if (isForking.value || !forkName.value.trim()) return
  isForking.value = true

  try {
    const data = await $fetch<any>(`/api/workflow/${projectId.value}/fork`, {
      method: 'POST',
      body: {
        targetStage: currentStage.value,
        name: forkName.value.trim(),
      },
    })
    showForkModal.value = false
    navigateTo(`/projects/${data.slug}/stage/${currentStage.value}`)
  } catch (err: any) {
    alert(err.data?.message || 'Failed to fork project')
  } finally {
    isForking.value = false
  }
}

function handleStageNavigate(stage: WorkflowStage) {
  workflow.goToStage(stage)
}

async function handleNext() {
  await workflow.advance()
}

function handleBack() {
  workflow.goBack()
}

function handleStageReady(ready: boolean) {
  stageReady.value = ready
}

async function handleProjectChanged() {
  await fetchProject(projectSlug.value)
}

async function toggleArchive() {
  if (isArchiving.value || !project.value) return
  isArchiving.value = true
  try {
    const newStatus = project.value.status === 'archived' ? 'active' : 'archived'
    await updateProject(project.value.slug, { status: newStatus })
  } catch (err: any) {
    alert(err.data?.message || 'Failed to update project status')
  } finally {
    isArchiving.value = false
  }
}
</script>

<template>
  <div v-if="projectLoading" class="flex items-center justify-center py-20">
    <div class="h-10 w-10 animate-spin rounded-full border-4 border-slate-950 border-t-transparent" />
  </div>

  <div v-else-if="project" class="space-y-6">
    <section class="relative overflow-hidden rounded-[2rem] border border-black/10 bg-[linear-gradient(145deg,rgba(27,41,58,0.98),rgba(42,57,75,0.94)_48%,rgba(166,112,47,0.82))] px-6 py-6 text-white shadow-panel sm:px-8">
      <div class="quiet-grid absolute inset-0 opacity-10" />

      <div class="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div class="space-y-5">
          <NuxtLink to="/" class="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-white">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to dashboard
          </NuxtLink>

          <div class="space-y-3">
            <div class="flex flex-wrap items-center gap-2">
              <Badge class="border-white/10 bg-white/10 text-slate-100">
                Stage {{ STAGE_INDEX[currentStage] + 1 }} of {{ WORKFLOW_STAGES.length }}
              </Badge>
              <Badge
                :variant="project.status === 'completed' ? 'success' : stageReady ? 'accent' : 'warning'"
                :class="project.status === 'completed' ? '' : stageReady ? 'border-white/10 bg-white/10 text-slate-100' : ''"
              >
                {{ stageStatusText }}
              </Badge>
            </div>
            <div>
              <h1 class="font-serif text-3xl font-semibold sm:text-4xl">{{ project.name }}</h1>
              <p class="mt-2 max-w-2xl text-sm leading-7 text-slate-200/90">
                {{ project.description || 'This project has no description yet. Use the workflow stages to shape the brief and push it toward publishable products.' }}
              </p>
            </div>
          </div>

          <div class="max-w-2xl rounded-[1.5rem] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
            <div class="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              <span>{{ STAGE_LABELS[currentStage] }}</span>
              <span>{{ stageProgress }}%</span>
            </div>
            <Progress
              class="mt-3 bg-white/12"
              :indicator-class="project.status === 'completed'
                ? 'bg-[linear-gradient(90deg,#34d399_0%,#10b981_50%,#047857_100%)]'
                : 'bg-[linear-gradient(90deg,#f4e6cb_0%,#ffffff_45%,#c58c3f_100%)]'"
              :model-value="project.status === 'completed' ? 100 : stageProgress"
            />
            <p class="mt-3 text-sm leading-6 text-slate-200">{{ STAGE_DESCRIPTIONS[currentStage] }}</p>
          </div>
        </div>

        <div class="flex flex-col items-start gap-3 sm:flex-row xl:flex-col xl:items-end">
          <Button
            v-if="!isArchived"
            variant="outline"
            class="border-white/15 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            @click="openForkModal"
            title="Fork project from this stage backwards"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7l-2 2m2-2l2 2m4 4l2-2m-2 2l-2-2" /></svg>
            Fork project
          </Button>

          <Button
            variant="outline"
            class="border-white/15 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            :disabled="isArchiving"
            @click="toggleArchive"
          >
            {{ project.status === 'archived' ? 'Unarchive' : 'Archive' }}
          </Button>

          <NuxtLink v-if="project.researchSnapshot" :to="`/projects/${project.slug}/research`">
            <Button
              variant="outline"
              class="border-white/15 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              title="View the research signals behind this project"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" /></svg>
              View research
            </Button>
          </NuxtLink>
        </div>
      </div>
    </section>

    <section
      v-if="isArchived"
      class="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4 shadow-soft"
    >
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-sm font-semibold text-amber-950">This project is archived</p>
          <p class="mt-1 text-sm leading-6 text-amber-900/80">
            You can browse every stage, but edits and pipeline actions are disabled until you unarchive.
          </p>
        </div>
        <Button
          :disabled="isArchiving"
          @click="toggleArchive"
        >
          {{ isArchiving ? 'Updating...' : 'Unarchive project' }}
        </Button>
      </div>
    </section>

    <section class="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
      <aside class="space-y-4 xl:sticky xl:top-28 xl:self-start">
        <div class="surface-card p-5">
          <p class="eyebrow">Pipeline map</p>
          <h2 class="mt-2 font-serif text-2xl font-semibold text-slate-950">Workflow stages</h2>
          <p class="mt-2 text-sm leading-6 text-slate-600">
            Move backward freely, or jump to accessible stages to review earlier decisions.
          </p>

          <div class="mt-5">
            <WorkflowStepper
              :current-stage="currentStage"
              :project-id="projectId"
              :project-max-stage="project.currentStage"
              :project-status="project.status"
              @navigate="handleStageNavigate"
            />
          </div>
        </div>
      </aside>

      <div class="space-y-6">
        <section class="surface-card p-5 sm:p-6">
          <h2 class="font-serif text-3xl font-semibold text-slate-950">{{ STAGE_LABELS[currentStage] }}</h2>
          <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{{ STAGE_DESCRIPTIONS[currentStage] }}</p>
        </section>

        <section class="surface-card p-5 sm:p-6" :class="isArchived ? 'pointer-events-none opacity-60' : ''">
          <component
            :is="stageComponent"
            :project-id="projectId"
            :project="project"
            @ready="handleStageReady"
            @project-changed="handleProjectChanged"
          />
        </section>

        <div
          v-if="workflow.transitionError.value"
          class="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-700 shadow-soft"
        >
          {{ workflow.transitionError.value }}
        </div>

        <section v-if="!isArchived" class="sticky bottom-4 z-20">
          <div class="rounded-[1.75rem] border border-black/10 bg-[#fffaf2]/94 p-4 shadow-panel backdrop-blur-xl">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div class="space-y-1">
                <p class="text-sm font-semibold text-slate-950">{{ stageStatusText }}</p>
                <p class="text-sm leading-6 text-slate-600">
                  {{ hasNext ? `Complete this stage to unlock ${STAGE_LABELS[WORKFLOW_STAGES[STAGE_INDEX[currentStage] + 1] as WorkflowStage]}.` : 'You are at the final workflow stage.' }}
                </p>
              </div>

              <div class="flex flex-col gap-3 sm:flex-row">
                <Button
                  v-if="hasPrev"
                  variant="outline"
                  @click="handleBack"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous stage
                </Button>

                <Button
                  v-if="hasNext"
                  :disabled="!stageReady || workflow.isTransitioning.value"
                  @click="handleNext"
                >
                  {{ workflow.isTransitioning.value ? 'Advancing...' : `Continue to ${STAGE_LABELS[WORKFLOW_STAGES[STAGE_INDEX[currentStage] + 1] as WorkflowStage]}` }}
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  </div>

  <Teleport to="body">
    <div v-if="showForkModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-md">
      <div class="w-full max-w-md rounded-[1.75rem] border border-black/10 bg-[#fffaf2] p-6 shadow-panel">
        <Badge variant="muted">Duplicate workflow</Badge>
        <h3 class="mt-4 font-serif text-2xl font-semibold text-slate-950">Fork project</h3>
        <p class="mt-3 text-sm leading-6 text-slate-600">
          Create a duplicate workspace up to <strong>{{ STAGE_LABELS[currentStage] }}</strong>. Later-stage work will not be copied into the new branch of the project.
        </p>

        <div class="mt-6 space-y-2">
          <label class="field-label">New project name</label>
          <Input
            v-model="forkName"
            type="text"
            placeholder="E.g. Vintage Cars (Fork)"
            class="w-full"
            @keyup.enter="confirmFork"
          />
        </div>

        <div class="mt-6 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            :disabled="isForking"
            @click="showForkModal = false"
          >
            Cancel
          </Button>
          <Button
            :disabled="isForking || !forkName.trim()"
            @click="confirmFork"
          >
            <svg v-if="isForking" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {{ isForking ? 'Forking...' : 'Create fork' }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
