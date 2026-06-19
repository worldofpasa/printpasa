<script setup lang="ts">
import type { Project } from '~~/shared/types/project'
import { STAGE_INDEX, STAGE_LABELS, WORKFLOW_STAGES } from '~~/shared/types/workflow'

const { projects, isLoading, fetchProjects, deleteProject, updateProject } = useProject()

type DashboardFilter = 'all' | 'active' | 'review' | 'completed' | 'archived'

const filter = ref<DashboardFilter>('active')
const creatorFilter = ref('all')
const dateStart = ref('')
const dateEnd = ref('')
const dateDetailsRef = ref<HTMLDetailsElement | null>(null)
const activeMenuNode = ref<string | null>(null)
const isUpdating = ref(false)

const showEditModal = ref(false)
const editState = ref({ slug: '', name: '', description: '' })

const showDeleteModal = ref(false)
const projectToDelete = ref<Project | null>(null)
const isDeleting = ref(false)

function stageProgress(project: Project): number {
  return Math.round(((STAGE_INDEX[project.currentStage as keyof typeof STAGE_INDEX] + 1) / WORKFLOW_STAGES.length) * 100)
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function statusTone(project: Project): string {
  if (project.status === 'archived') return 'text-slate-500'
  if (project.status === 'completed') return 'text-emerald-700'
  if (project.currentStage === 'manual-review') return 'text-amber-700'
  return 'text-sky-700'
}

function stageChip(project: Project): string {
  if (project.status === 'archived') return 'Archived'
  if (project.status === 'completed') return 'Published'
  if (project.currentStage === 'manual-review') return 'Needs review'
  return 'In production'
}

const filters = [
  { id: 'all', label: 'All projects' },
  { id: 'active', label: 'Active' },
  { id: 'review', label: 'Needs review' },
  { id: 'completed', label: 'Completed' },
  { id: 'archived', label: 'Archived' },
] as const

function originLabel(project: Project): string {
  if (project.originActor) return project.originActor
  if (project.originSource === 'cron') return 'Cron'
  if (project.originSource === 'telegram') return 'Telegram'
  return 'Portal'
}

const creatorOptions = computed(() => {
  const actors = new Set<string>()
  for (const project of projects.value) {
    actors.add(originLabel(project))
  }
  return Array.from(actors).sort((a, b) => a.localeCompare(b))
})

function matchesStatusFilter(project: Project): boolean {
  if (filter.value === 'all') return true
  if (filter.value === 'active') return project.status === 'active' && project.currentStage !== 'manual-review'
  if (filter.value === 'review') return project.status === 'active' && project.currentStage === 'manual-review'
  if (filter.value === 'completed') return project.status === 'completed'
  return project.status === 'archived'
}

function parseLocalDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function startOfDay(date: Date): number {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value.getTime()
}

function endOfDay(date: Date): number {
  const value = new Date(date)
  value.setHours(23, 59, 59, 999)
  return value.getTime()
}

function formatFilterDate(isoDate: string): string {
  return parseLocalDate(isoDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const dateFilterLabel = computed(() => {
  if (!dateStart.value && !dateEnd.value) return 'Any date'
  if (dateStart.value && dateEnd.value) {
    if (dateStart.value === dateEnd.value) return formatFilterDate(dateStart.value)
    return `${formatFilterDate(dateStart.value)} – ${formatFilterDate(dateEnd.value)}`
  }
  return formatFilterDate(dateStart.value || dateEnd.value)
})

const hasDateFilter = computed(() => Boolean(dateStart.value || dateEnd.value))

function matchesDateFilter(project: Project): boolean {
  if (!dateStart.value && !dateEnd.value) return true

  const createdAt = new Date(project.createdAt).getTime()
  const startIso = dateStart.value || dateEnd.value
  const endIso = dateEnd.value || dateStart.value
  const start = Math.min(
    startOfDay(parseLocalDate(startIso)),
    startOfDay(parseLocalDate(endIso)),
  )
  const end = Math.max(
    endOfDay(parseLocalDate(startIso)),
    endOfDay(parseLocalDate(endIso)),
  )
  return createdAt >= start && createdAt <= end
}

const filterSelectClass =
  'h-10 w-full min-w-[11rem] appearance-none rounded-2xl border border-black/10 bg-white/80 bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat px-4 text-sm text-slate-950 focus:border-slate-950 focus:outline-none'

function closeDateFilterPanel() {
  if (dateDetailsRef.value) dateDetailsRef.value.open = false
}

function clearDateFilter() {
  dateStart.value = ''
  dateEnd.value = ''
  closeDateFilterPanel()
}

const filteredProjects = computed(() => {
  return projects.value.filter((project) => {
    if (!matchesStatusFilter(project)) return false
    if (creatorFilter.value !== 'all' && originLabel(project) !== creatorFilter.value) return false
    if (!matchesDateFilter(project)) return false
    return true
  })
})

function toggleMenu(event: Event, projectId: string) {
  event.preventDefault()
  event.stopPropagation()
  activeMenuNode.value = activeMenuNode.value === projectId ? null : projectId
}

function closeMenus() {
  activeMenuNode.value = null
}

function openEditModal(project: Project) {
  editState.value = { slug: project.slug, name: project.name, description: project.description || '' }
  showEditModal.value = true
}

async function handleSaveEdit() {
  if (isUpdating.value || !editState.value.name.trim()) return
  isUpdating.value = true

  try {
    await updateProject(editState.value.slug, {
      name: editState.value.name.trim(),
      description: editState.value.description.trim() || undefined,
    })
    showEditModal.value = false
    await fetchProjects()
  } catch (err: any) {
    alert(err.data?.message || 'Failed to update project')
  } finally {
    isUpdating.value = false
  }
}

async function toggleArchive(project: Project) {
  if (isUpdating.value) return
  isUpdating.value = true

  try {
    const newStatus = project.status === 'archived' ? 'active' : 'archived'
    await updateProject(project.slug, { status: newStatus })
  } catch (err: any) {
    alert(err.data?.message || 'Failed to update project status')
  } finally {
    isUpdating.value = false
  }
}

function openDeleteModal(project: Project) {
  projectToDelete.value = project
  showDeleteModal.value = true
}

async function confirmDelete() {
  if (isDeleting.value || !projectToDelete.value) return
  isDeleting.value = true

  try {
    await deleteProject(projectToDelete.value.slug)
    showDeleteModal.value = false
  } catch (err: any) {
    alert(err.data?.message || 'Failed to delete project')
  } finally {
    isDeleting.value = false
    projectToDelete.value = null
  }
}

onMounted(() => {
  fetchProjects()
  document.addEventListener('click', closeMenus)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeMenus)
})
</script>

<template>
  <div class="space-y-8">
    <section class="space-y-5">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div class="space-y-2">
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Project board</p>
          <h2 class="font-serif text-3xl font-semibold text-slate-950">Your production queue</h2>
          <p class="max-w-2xl text-sm leading-6 text-slate-600">
            Filter by state, jump back into a pipeline, or edit project details without leaving the board.
          </p>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            v-model="filter"
            class="sm:w-48"
            :class="filterSelectClass"
            aria-label="Filter by status"
          >
            <option v-for="item in filters" :key="item.id" :value="item.id">
              {{ item.label }}
            </option>
          </select>

          <select
            v-model="creatorFilter"
            class="sm:w-56"
            :class="filterSelectClass"
            aria-label="Filter by creator"
          >
            <option value="all">All creators</option>
            <option v-for="actor in creatorOptions" :key="actor" :value="actor">
              {{ actor }}
            </option>
          </select>

          <details ref="dateDetailsRef" class="relative w-full sm:w-56">
            <summary
              class="flex h-10 w-full min-w-[11rem] cursor-pointer list-none items-center justify-between rounded-2xl border border-black/10 bg-white/80 px-4 text-sm text-slate-950 marker:content-none focus:border-slate-950 focus:outline-none"
            >
              <span class="truncate">{{ dateFilterLabel }}</span>
              <svg class="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </summary>
            <div class="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-black/10 bg-white p-4 shadow-[0_24px_50px_rgba(15,23,42,0.16)]">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Created date</p>
              <p class="mt-1 text-sm leading-6 text-slate-600">
                Pick one date or a start–end range. Leave either field empty to filter a single day.
              </p>

              <div class="mt-4 space-y-3">
                <div class="space-y-1.5">
                  <label class="text-sm font-medium text-slate-700" for="date-start">Start</label>
                  <input
                    id="date-start"
                    v-model="dateStart"
                    type="date"
                    class="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-slate-950 focus:border-slate-950 focus:outline-none"
                  />
                </div>
                <div class="space-y-1.5">
                  <label class="text-sm font-medium text-slate-700" for="date-end">End</label>
                  <input
                    id="date-end"
                    v-model="dateEnd"
                    type="date"
                    class="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-slate-950 focus:border-slate-950 focus:outline-none"
                  />
                </div>
              </div>

              <div class="mt-4 flex items-center justify-end gap-2">
                <button
                  v-if="hasDateFilter"
                  type="button"
                  class="rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
                  @click="clearDateFilter"
                >
                  Clear
                </button>
                <button
                  type="button"
                  class="rounded-full bg-slate-950 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                  @click="closeDateFilterPanel"
                >
                  Apply
                </button>
              </div>
            </div>
          </details>
        </div>
      </div>

      <div v-if="isLoading" class="flex items-center justify-center py-20">
        <div class="h-10 w-10 animate-spin rounded-full border-4 border-slate-950 border-t-transparent" />
      </div>

      <div
        v-else-if="projects.length === 0"
        class="overflow-hidden rounded-[2rem] border border-dashed border-black/10 bg-white/75 px-6 py-16 text-center shadow-[0_20px_50px_rgba(15,23,42,0.06)]"
      >
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-black/10 bg-slate-950 text-white shadow-[0_20px_40px_rgba(15,23,42,0.18)]">
          <svg class="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <h3 class="mt-6 font-serif text-3xl font-semibold text-slate-950">No projects yet</h3>
        <p class="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">
          Use the New Project button to start your first pipeline and move from idea gathering to publishing.
        </p>
      </div>

      <div
        v-else-if="filteredProjects.length === 0"
        class="rounded-[1.75rem] border border-black/10 bg-white/75 px-6 py-12 text-center text-sm leading-6 text-slate-600 shadow-[0_16px_40px_rgba(15,23,42,0.05)]"
      >
        No projects match the current filter.
      </div>

      <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <NuxtLink
          v-for="project in filteredProjects"
          :key="project.id"
          :to="`/projects/${project.slug}/stage/${project.currentStage}`"
          class="group relative overflow-hidden rounded-[1.75rem] border border-black/10 bg-white/78 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_25px_60px_rgba(15,23,42,0.11)]"
        >
          <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-300 via-slate-950 to-emerald-400 opacity-70" />

          <div class="flex items-start justify-between gap-5">
            <div class="min-w-0 space-y-3 pr-8">
              <div class="flex flex-wrap items-center gap-2">
                <span class="inline-flex rounded-full border border-black/10 bg-slate-950/5 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em]" :class="statusTone(project)">
                  {{ stageChip(project) }}
                </span>
                <span class="text-xs uppercase tracking-[0.18em] text-slate-400">
                  {{ STAGE_LABELS[project.currentStage] }}
                </span>
                <span class="text-xs text-slate-400">
                  · {{ originLabel(project) }}
                </span>
              </div>

              <div>
                <h3 class="truncate font-serif text-2xl font-semibold text-slate-950 transition-colors duration-200 group-hover:text-slate-700">
                  {{ project.name }}
                </h3>
                <p class="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                  {{ project.description || 'No description yet. Open the project to continue shaping the workflow.' }}
                </p>
              </div>
            </div>

            <div class="absolute right-4 top-4">
              <button
                class="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/90 text-slate-500 transition-colors hover:bg-slate-950 hover:text-white"
                @click.prevent.stop="toggleMenu($event, project.id)"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>

              <div
                v-if="activeMenuNode === project.id"
                class="absolute right-0 top-full z-10 mt-2 w-52 rounded-2xl border border-black/10 bg-white p-2 shadow-[0_24px_50px_rgba(15,23,42,0.16)]"
                @click.prevent.stop
              >
                <button
                  class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                  @click="openEditModal(project as Project); activeMenuNode = null"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Edit details
                </button>
                <button
                  class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                  @click="toggleArchive(project as Project); activeMenuNode = null"
                >
                  <svg v-if="project.status !== 'archived'" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                  <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                  {{ project.status === 'archived' ? 'Unarchive' : 'Archive' }}
                </button>
                <div class="my-2 h-px bg-slate-100" />
                <button
                  class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-rose-700 transition-colors hover:bg-rose-50"
                  @click="openDeleteModal(project as Project); activeMenuNode = null"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Delete
                </button>
              </div>
            </div>
          </div>

          <div class="mt-8 space-y-4">
            <div class="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-slate-400">
              <span>Updated {{ formatDate(project.updatedAt) }}</span>
              <span>{{ stageProgress(project) }}%</span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                class="h-full rounded-full bg-gradient-to-r from-slate-950 via-slate-700 to-amber-500"
                :style="{ width: `${stageProgress(project)}%` }"
              />
            </div>
          </div>

          <div class="mt-6 flex items-center justify-between gap-3">
            <div class="rounded-full border border-black/10 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
              {{ project.status === 'active' ? 'Resume available' : 'Project stored' }}
            </div>
            <div class="inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
              Resume
              <svg class="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </NuxtLink>
      </div>
    </section>
  </div>

  <Teleport to="body">
    <div
      v-if="showEditModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-md"
      @click="showEditModal = false"
    >
      <div class="w-full max-w-md rounded-[1.75rem] border border-black/10 bg-[#fffaf2] p-6 shadow-[0_25px_70px_rgba(15,23,42,0.18)]" @click.stop>
        <h3 class="font-serif text-2xl font-semibold text-slate-950">Edit project</h3>
        <p class="mt-2 text-sm leading-6 text-slate-600">Keep the project identity clear so the board remains easy to scan.</p>

        <div class="mt-6 space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium text-slate-700">Project name *</label>
            <input
              v-model="editState.name"
              type="text"
              class="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm focus:border-slate-950 focus:outline-none"
              @keyup.enter="handleSaveEdit"
              autofocus
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-slate-700">Description</label>
            <textarea
              v-model="editState.description"
              rows="3"
              class="w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm focus:border-slate-950 focus:outline-none"
            />
          </div>
        </div>

        <div class="mt-6 flex items-center justify-end gap-3">
          <button
            class="rounded-full border border-black/10 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            :disabled="isUpdating"
            @click="showEditModal = false"
          >
            Cancel
          </button>
          <button
            class="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-50"
            :disabled="isUpdating || !editState.name.trim()"
            @click="handleSaveEdit"
          >
            {{ isUpdating ? 'Saving...' : 'Save changes' }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showDeleteModal && projectToDelete"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-md"
      @click="showDeleteModal = false"
    >
      <div class="w-full max-w-md rounded-[1.75rem] border border-rose-200 bg-[#fff7f5] p-6 shadow-[0_25px_70px_rgba(15,23,42,0.18)]" @click.stop>
        <div class="inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
          Destructive action
        </div>
        <h3 class="mt-4 font-serif text-2xl font-semibold text-slate-950">Delete project?</h3>
        <p class="mt-3 text-sm leading-6 text-slate-600">
          <strong>{{ projectToDelete.name }}</strong> and its workflow data will be removed permanently.
        </p>

        <div class="mt-6 flex items-center justify-end gap-3">
          <button
            class="rounded-full border border-black/10 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-white"
            :disabled="isDeleting"
            @click="showDeleteModal = false"
          >
            Cancel
          </button>
          <button
            class="rounded-full bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-50"
            :disabled="isDeleting"
            @click="confirmDelete"
          >
            {{ isDeleting ? 'Deleting...' : 'Delete project' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
